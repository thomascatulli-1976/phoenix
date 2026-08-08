import { randomUUID } from "node:crypto";
import type {
  OfficeProviderAdapter,
  OfficeProviderResponse,
  OfficeTaskRequest,
} from "../contracts.js";
import {
  microsoftReadyDraftJsonSchema,
  parseMicrosoftReadyDraft,
} from "../workflows/microsoft-ready-output.js";
import {
  buildMicrosoftReadyDraftPrompt,
  microsoftReadyDraftSystemInstruction,
  microsoftReadyDraftToolName,
} from "../workflows/microsoft-ready-prompt.js";

const defaultClaudeApiBaseUrl = "https://api.anthropic.com/v1";
const defaultClaudeApiVersion = "2023-06-01";
const defaultTimeoutMs = 60_000;

export type ClaudeAdapterErrorCode =
  | "not-configured"
  | "request-timeout"
  | "request-failed"
  | "provider-http-error"
  | "provider-blocked"
  | "incomplete-response"
  | "empty-response"
  | "invalid-provider-json"
  | "invalid-structured-output";

export class ClaudeAdapterError extends Error {
  readonly code: ClaudeAdapterErrorCode;
  readonly statusCode?: number;
  readonly retryable: boolean;

  constructor(
    code: ClaudeAdapterErrorCode,
    message: string,
    options: { statusCode?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ClaudeAdapterError";
    this.code = code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
  }
}

export interface ClaudeOfficeAdapterOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  apiVersion?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  traceIdFactory?: () => string;
}

interface ClaudeContentBlock {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

interface ClaudeMessageResponse {
  id?: string;
  type?: string;
  role?: string;
  model?: string;
  stop_reason?: string;
  content?: ClaudeContentBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function parseProviderPayload(raw: string): ClaudeMessageResponse {
  try {
    return JSON.parse(raw) as ClaudeMessageResponse;
  } catch (error) {
    throw new ClaudeAdapterError(
      "invalid-provider-json",
      "Claude returned an invalid JSON API response.",
      { cause: error },
    );
  }
}

function extractStructuredDraft(payload: ClaudeMessageResponse): unknown {
  if (payload.stop_reason === "refusal") {
    throw new ClaudeAdapterError("provider-blocked", "Claude refused the request.");
  }
  if (payload.stop_reason === "max_tokens") {
    throw new ClaudeAdapterError(
      "incomplete-response",
      "Claude reached the output-token limit before completing the structured draft.",
      { retryable: true },
    );
  }

  const toolUseBlocks = (payload.content ?? []).filter(
    (block) => block.type === "tool_use",
  );
  if (toolUseBlocks.length === 0) {
    throw new ClaudeAdapterError(
      "empty-response",
      "Claude returned no structured tool-use output.",
    );
  }
  if (toolUseBlocks.length !== 1) {
    throw new ClaudeAdapterError(
      "invalid-structured-output",
      "Claude returned more than one tool-use block for the bounded workflow.",
    );
  }

  const block = toolUseBlocks[0];
  if (block?.name !== microsoftReadyDraftToolName) {
    throw new ClaudeAdapterError(
      "invalid-structured-output",
      `Claude selected an unexpected tool: ${block?.name ?? "unknown"}.`,
    );
  }
  if (payload.stop_reason && payload.stop_reason !== "tool_use") {
    throw new ClaudeAdapterError(
      "invalid-structured-output",
      `Claude returned tool output with unexpected stop reason ${payload.stop_reason}.`,
    );
  }

  return block.input;
}

export class ClaudeOfficeAdapter implements OfficeProviderAdapter {
  readonly id = "claude" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly traceIdFactory: () => string;

  constructor(options: ClaudeOfficeAdapterOptions) {
    this.apiKey = options.apiKey.trim();
    this.model = options.model.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultClaudeApiBaseUrl);
    this.apiVersion = (options.apiVersion ?? defaultClaudeApiVersion).trim();
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.traceIdFactory = options.traceIdFactory ?? randomUUID;
  }

  async isAvailable(): Promise<boolean> {
    return (
      this.apiKey.length > 0 &&
      this.model.length > 0 &&
      this.apiVersion.length > 0 &&
      this.timeoutMs > 0
    );
  }

  async complete(request: OfficeTaskRequest): Promise<OfficeProviderResponse> {
    if (!(await this.isAvailable())) {
      throw new ClaudeAdapterError(
        "not-configured",
        "Claude requires an API key, model, API version and positive timeout.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": this.apiVersion,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: microsoftReadyDraftSystemInstruction,
          messages: [
            {
              role: "user",
              content: buildMicrosoftReadyDraftPrompt(request),
            },
          ],
          tools: [
            {
              name: microsoftReadyDraftToolName,
              description:
                "Return the complete Microsoft-ready decision memo draft content. This tool does not approve, validate or publish the artifact.",
              input_schema: microsoftReadyDraftJsonSchema,
            },
          ],
          tool_choice: {
            type: "tool",
            name: microsoftReadyDraftToolName,
            disable_parallel_tool_use: true,
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ClaudeAdapterError(
          "request-timeout",
          `Claude request exceeded the ${this.timeoutMs} ms timeout.`,
          { retryable: true, cause: error },
        );
      }
      throw new ClaudeAdapterError(
        "request-failed",
        "Claude request could not be completed.",
        { retryable: true, cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }

    const raw = await response.text();
    if (!response.ok) {
      throw new ClaudeAdapterError(
        "provider-http-error",
        `Claude returned HTTP ${response.status}.`,
        {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        },
      );
    }

    const payload = parseProviderPayload(raw);
    const structured = extractStructuredDraft(payload);

    let draft;
    try {
      draft = parseMicrosoftReadyDraft(structured);
    } catch (error) {
      throw new ClaudeAdapterError(
        "invalid-structured-output",
        "Claude tool input did not match the Microsoft-ready draft contract.",
        { cause: error },
      );
    }

    const latencyMs = Date.now() - startedAt;
    const inputUnits = payload.usage?.input_tokens;
    const outputUnits = payload.usage?.output_tokens;

    return {
      requestId: request.requestId,
      provider: "claude",
      modelConfiguration: payload.model ?? this.model,
      status: "completed",
      content: draft.managementSummary,
      structuredArtifact: draft,
      citations: [],
      toolActivity: [
        {
          toolId: microsoftReadyDraftToolName,
          action: "structured-draft-generation",
          status: "completed",
          traceId: payload.id,
        },
      ],
      safetyStatus: "passed",
      warnings: [],
      unresolvedAssumptions: [...draft.openPoints],
      fallbackHistory: [],
      usage: {
        inputUnits,
        outputUnits,
        totalUnits:
          inputUnits === undefined && outputUnits === undefined
            ? undefined
            : (inputUnits ?? 0) + (outputUnits ?? 0),
        latencyMs,
      },
      validationState: "unvalidated",
      traceId: this.traceIdFactory(),
      generatedAt: this.now().toISOString(),
    };
  }
}
