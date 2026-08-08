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

const defaultGeminiApiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
const defaultTimeoutMs = 60_000;

export type GeminiAdapterErrorCode =
  | "not-configured"
  | "request-timeout"
  | "request-failed"
  | "provider-http-error"
  | "provider-blocked"
  | "empty-response"
  | "invalid-provider-json"
  | "invalid-structured-output";

export class GeminiAdapterError extends Error {
  readonly code: GeminiAdapterErrorCode;
  readonly statusCode?: number;
  readonly retryable: boolean;

  constructor(
    code: GeminiAdapterErrorCode,
    message: string,
    options: { statusCode?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "GeminiAdapterError";
    this.code = code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
  }
}

export interface GeminiOfficeAdapterOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  traceIdFactory?: () => string;
}

interface GeminiGenerateContentResponse {
  modelVersion?: string;
  promptFeedback?: {
    blockReason?: string;
  };
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
    finishMessage?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeModel(value: string): string {
  return value.trim().replace(/^models\//, "");
}

function buildPrompt(request: OfficeTaskRequest): string {
  const taskEnvelope = {
    operatingMode: request.operatingMode,
    task: request.task,
    intendedOutcome: request.intendedOutcome,
    sanitizedInput: request.input,
    contextReferences: request.contextReferences,
    excludedInformation: request.excludedInformation,
    evidenceRequirements: request.evidenceRequirements,
    validationRequirements: request.validationRequirements,
  };

  return [
    "Create a Microsoft-ready decision memo draft from the supplied sanitized context.",
    "Use only the supplied context. Do not invent internal facts, names, numbers, approvals or source validation.",
    "When information is missing, record it under openPoints and internalValidationRequired.",
    "Provide at least two distinct decision options. Keep recommendation and rationale separate.",
    "Return only the structured JSON object required by the response schema.",
    "The provider must not set owner, approval, validation state, sensitivity, target system or publication status; Phoenix adds those fields after generation.",
    "TASK ENVELOPE:",
    JSON.stringify(taskEnvelope, null, 2),
  ].join("\n\n");
}

function extractCandidateText(payload: GeminiGenerateContentResponse): {
  text: string;
  finishReason?: string;
} {
  if (payload.promptFeedback?.blockReason) {
    throw new GeminiAdapterError(
      "provider-blocked",
      `Gemini blocked the request: ${payload.promptFeedback.blockReason}.`,
    );
  }

  const candidate = payload.candidates?.[0];
  if (!candidate) {
    throw new GeminiAdapterError("empty-response", "Gemini returned no response candidate.");
  }

  const finishReason = candidate.finishReason;
  if (finishReason === "SAFETY" || finishReason === "BLOCKLIST" || finishReason === "PROHIBITED_CONTENT") {
    throw new GeminiAdapterError(
      "provider-blocked",
      `Gemini blocked the response with finish reason ${finishReason}.`,
    );
  }

  const text = (candidate.content?.parts ?? [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (text.length === 0) {
    throw new GeminiAdapterError("empty-response", "Gemini returned no text content.");
  }

  return { text, finishReason };
}

function parseProviderPayload(raw: string): GeminiGenerateContentResponse {
  try {
    return JSON.parse(raw) as GeminiGenerateContentResponse;
  } catch (error) {
    throw new GeminiAdapterError(
      "invalid-provider-json",
      "Gemini returned an invalid JSON API response.",
      { cause: error },
    );
  }
}

export class GeminiOfficeAdapter implements OfficeProviderAdapter {
  readonly id = "gemini" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly traceIdFactory: () => string;

  constructor(options: GeminiOfficeAdapterOptions) {
    this.apiKey = options.apiKey.trim();
    this.model = normalizeModel(options.model);
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultGeminiApiBaseUrl);
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
      throw new GeminiAdapterError(
        "not-configured",
        "Gemini requires an API key, model configuration and positive timeout.",
      );
    }

    const endpoint = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You are the Phoenix Office Companion drafting engine. Follow the supplied data boundaries and output schema exactly.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(request) }],
            },
          ],
          generationConfig: {
            candidateCount: 1,
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseFormat: {
              text: {
                mimeType: "application/json",
                schema: microsoftReadyDraftJsonSchema,
              },
            },
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new GeminiAdapterError(
          "request-timeout",
          `Gemini request exceeded the ${this.timeoutMs} ms timeout.`,
          { retryable: true, cause: error },
        );
      }
      throw new GeminiAdapterError(
        "request-failed",
        "Gemini request could not be completed.",
        { retryable: true, cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }

    const raw = await response.text();
    if (!response.ok) {
      throw new GeminiAdapterError(
        "provider-http-error",
        `Gemini returned HTTP ${response.status}.`,
        {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        },
      );
    }

    const payload = parseProviderPayload(raw);
    const { text, finishReason } = extractCandidateText(payload);

    let structured: unknown;
    try {
      structured = JSON.parse(text);
    } catch (error) {
      throw new GeminiAdapterError(
        "invalid-structured-output",
        "Gemini returned text that was not valid structured JSON.",
        { cause: error },
      );
    }

    let draft;
    try {
      draft = parseMicrosoftReadyDraft(structured);
    } catch (error) {
      throw new GeminiAdapterError(
        "invalid-structured-output",
        "Gemini output did not match the Microsoft-ready draft contract.",
        { cause: error },
      );
    }

    const warnings =
      finishReason && finishReason !== "STOP"
        ? [`Gemini completed with finish reason ${finishReason}.`]
        : [];
    const latencyMs = Date.now() - startedAt;
    const configuredModel = payload.modelVersion
      ? `${this.model} (reported ${payload.modelVersion})`
      : this.model;

    return {
      requestId: request.requestId,
      provider: "gemini",
      modelConfiguration: configuredModel,
      status: "completed",
      content: draft.managementSummary,
      structuredArtifact: draft,
      citations: [],
      toolActivity: [],
      safetyStatus: warnings.length > 0 ? "warning" : "passed",
      warnings,
      unresolvedAssumptions: [...draft.openPoints],
      fallbackHistory: [],
      usage: {
        inputUnits: payload.usageMetadata?.promptTokenCount,
        outputUnits: payload.usageMetadata?.candidatesTokenCount,
        totalUnits: payload.usageMetadata?.totalTokenCount,
        latencyMs,
      },
      validationState: "unvalidated",
      traceId: this.traceIdFactory(),
      generatedAt: this.now().toISOString(),
    };
  }
}
