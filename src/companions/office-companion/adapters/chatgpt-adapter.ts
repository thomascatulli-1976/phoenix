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
  microsoftReadyDraftSchemaName,
  microsoftReadyDraftSystemInstruction,
} from "../workflows/microsoft-ready-prompt.js";

const defaultOpenAiApiBaseUrl = "https://api.openai.com/v1";
const defaultTimeoutMs = 60_000;

export type ChatGptAdapterErrorCode =
  | "not-configured"
  | "request-timeout"
  | "request-failed"
  | "provider-http-error"
  | "provider-blocked"
  | "incomplete-response"
  | "empty-response"
  | "invalid-provider-json"
  | "invalid-structured-output";

export class ChatGptAdapterError extends Error {
  readonly code: ChatGptAdapterErrorCode;
  readonly statusCode?: number;
  readonly retryable: boolean;

  constructor(
    code: ChatGptAdapterErrorCode,
    message: string,
    options: { statusCode?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ChatGptAdapterError";
    this.code = code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
  }
}

export interface ChatGptOfficeAdapterOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  traceIdFactory?: () => string;
}

interface OpenAiOutputContent {
  type?: string;
  text?: string;
  refusal?: string;
}

interface OpenAiResponsePayload {
  id?: string;
  object?: string;
  status?: string;
  model?: string;
  output_text?: string;
  error?: {
    code?: string;
    message?: string;
  } | null;
  incomplete_details?: {
    reason?: string;
  } | null;
  output?: Array<{
    type?: string;
    role?: string;
    content?: OpenAiOutputContent[];
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function parseProviderPayload(raw: string): OpenAiResponsePayload {
  try {
    return JSON.parse(raw) as OpenAiResponsePayload;
  } catch (error) {
    throw new ChatGptAdapterError(
      "invalid-provider-json",
      "ChatGPT returned an invalid JSON API response.",
      { cause: error },
    );
  }
}

function extractOutputText(payload: OpenAiResponsePayload): string {
  if (payload.error) {
    throw new ChatGptAdapterError(
      "provider-http-error",
      `ChatGPT failed: ${payload.error.message ?? payload.error.code ?? "unknown error"}.`,
    );
  }
  if (payload.status === "failed") {
    throw new ChatGptAdapterError(
      "provider-http-error",
      "ChatGPT reported a failed response.",
    );
  }
  if (payload.status === "incomplete") {
    throw new ChatGptAdapterError(
      "incomplete-response",
      `ChatGPT returned an incomplete response${
        payload.incomplete_details?.reason
          ? `: ${payload.incomplete_details.reason}`
          : ""
      }.`,
      { retryable: true },
    );
  }

  const content = (payload.output ?? []).flatMap((item) => item.content ?? []);
  const refusal = content.find(
    (part) => part.type === "refusal" || typeof part.refusal === "string",
  );
  if (refusal) {
    throw new ChatGptAdapterError(
      "provider-blocked",
      refusal.refusal?.trim() || "ChatGPT refused the request.",
    );
  }

  const direct = payload.output_text?.trim();
  if (direct) return direct;

  const text = content
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (text.length === 0) {
    throw new ChatGptAdapterError(
      "empty-response",
      "ChatGPT returned no structured text output.",
    );
  }
  return text;
}

export class ChatGptOfficeAdapter implements OfficeProviderAdapter {
  readonly id = "chatgpt" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly traceIdFactory: () => string;

  constructor(options: ChatGptOfficeAdapterOptions) {
    this.apiKey = options.apiKey.trim();
    this.model = options.model.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultOpenAiApiBaseUrl);
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.traceIdFactory = options.traceIdFactory ?? randomUUID;
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0 && this.model.length > 0 && this.timeoutMs > 0;
  }

  async complete(request: OfficeTaskRequest): Promise<OfficeProviderResponse> {
    if (!(await this.isAvailable())) {
      throw new ChatGptAdapterError(
        "not-configured",
        "ChatGPT requires an API key, model configuration and positive timeout.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          instructions: microsoftReadyDraftSystemInstruction,
          input: buildMicrosoftReadyDraftPrompt(request),
          max_output_tokens: 4096,
          store: false,
          text: {
            format: {
              type: "json_schema",
              name: microsoftReadyDraftSchemaName,
              strict: true,
              schema: microsoftReadyDraftJsonSchema,
            },
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ChatGptAdapterError(
          "request-timeout",
          `ChatGPT request exceeded the ${this.timeoutMs} ms timeout.`,
          { retryable: true, cause: error },
        );
      }
      throw new ChatGptAdapterError(
        "request-failed",
        "ChatGPT request could not be completed.",
        { retryable: true, cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }

    const raw = await response.text();
    if (!response.ok) {
      throw new ChatGptAdapterError(
        "provider-http-error",
        `ChatGPT returned HTTP ${response.status}.`,
        {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        },
      );
    }

    const payload = parseProviderPayload(raw);
    const text = extractOutputText(payload);

    let structured: unknown;
    try {
      structured = JSON.parse(text);
    } catch (error) {
      throw new ChatGptAdapterError(
        "invalid-structured-output",
        "ChatGPT returned text that was not valid structured JSON.",
        { cause: error },
      );
    }

    let draft;
    try {
      draft = parseMicrosoftReadyDraft(structured);
    } catch (error) {
      throw new ChatGptAdapterError(
        "invalid-structured-output",
        "ChatGPT output did not match the Microsoft-ready draft contract.",
        { cause: error },
      );
    }

    return {
      requestId: request.requestId,
      provider: "chatgpt",
      modelConfiguration: payload.model ?? this.model,
      status: "completed",
      content: draft.managementSummary,
      structuredArtifact: draft,
      citations: [],
      toolActivity: [],
      safetyStatus: "passed",
      warnings: [],
      unresolvedAssumptions: [...draft.openPoints],
      fallbackHistory: [],
      usage: {
        inputUnits: payload.usage?.input_tokens,
        outputUnits: payload.usage?.output_tokens,
        totalUnits: payload.usage?.total_tokens,
        latencyMs: Date.now() - startedAt,
      },
      validationState: "unvalidated",
      traceId: this.traceIdFactory(),
      generatedAt: this.now().toISOString(),
    };
  }
}
