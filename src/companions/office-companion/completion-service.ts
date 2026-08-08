import type {
  OfficeProviderAdapter,
  OfficeProviderDescriptor,
  OfficeProviderId,
  OfficeRoutingDecision,
  OfficeTaskRequest,
  SelectedRoutingDecision,
} from "./contracts.js";
import { routeOfficeTask } from "./router.js";
import {
  createMicrosoftReadyOutputPackage,
  parseMicrosoftReadyDraft,
  type MicrosoftReadyOutputPackage,
} from "./workflows/microsoft-ready-output.js";

export type OfficeCompletionErrorCode =
  | "human-review-required"
  | "routing-rejected"
  | "provider-unavailable"
  | "provider-execution-failed"
  | "provider-response-invalid";

export class OfficeCompletionError extends Error {
  readonly code: OfficeCompletionErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: OfficeCompletionErrorCode,
    message: string,
    httpStatus: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OfficeCompletionError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export interface OfficeCompletionDependencies {
  providers: OfficeProviderDescriptor[];
  adapters: Map<OfficeProviderId, OfficeProviderAdapter>;
}

export interface OfficeCompletionResult {
  requestId: string;
  routingDecision: SelectedRoutingDecision;
  provider: {
    id: OfficeProviderId;
    modelConfiguration: string;
    status: "completed";
    safetyStatus: "passed" | "warning";
    warnings: string[];
    usage?: {
      inputUnits?: number;
      outputUnits?: number;
      totalUnits?: number;
      estimatedCost?: number;
      currency?: string;
      latencyMs?: number;
    };
    traceId: string;
    generatedAt: string;
  };
  outputPackage: MicrosoftReadyOutputPackage;
}

function routingHttpStatus(decision: Extract<OfficeRoutingDecision, { status: "rejected" }>): number {
  return decision.code === "no-provider-capable" ? 503 : 422;
}

function providerErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "unknown-provider-error";
}

export async function completeOfficeTask(
  request: OfficeTaskRequest,
  dependencies: OfficeCompletionDependencies,
): Promise<OfficeCompletionResult> {
  if (request.validationRequirements.humanReviewRequired !== true) {
    throw new OfficeCompletionError(
      "human-review-required",
      "The Microsoft-ready completion workflow requires explicit human review.",
      422,
    );
  }

  const routingDecision = routeOfficeTask(request, dependencies.providers);
  if (routingDecision.status === "rejected") {
    throw new OfficeCompletionError(
      "routing-rejected",
      routingDecision.reason,
      routingHttpStatus(routingDecision),
      { routingDecision },
    );
  }

  const adapter = dependencies.adapters.get(routingDecision.provider);
  if (!adapter || !(await adapter.isAvailable())) {
    throw new OfficeCompletionError(
      "provider-unavailable",
      `Provider ${routingDecision.provider} is not operational in this runtime.`,
      503,
      { routingDecision, provider: routingDecision.provider },
    );
  }

  let providerResponse;
  try {
    providerResponse = await adapter.complete(request);
  } catch (error) {
    const errorCode = providerErrorCode(error);
    const httpStatus = errorCode === "request-timeout" ? 504 : 502;
    throw new OfficeCompletionError(
      "provider-execution-failed",
      `Provider ${routingDecision.provider} failed with ${errorCode}.`,
      httpStatus,
      {
        routingDecision,
        provider: routingDecision.provider,
        providerErrorCode: errorCode,
      },
    );
  }

  if (providerResponse.status !== "completed" || providerResponse.safetyStatus === "blocked") {
    throw new OfficeCompletionError(
      "provider-response-invalid",
      `Provider ${routingDecision.provider} did not return an acceptable completed response.`,
      502,
      {
        routingDecision,
        provider: routingDecision.provider,
        responseStatus: providerResponse.status,
        safetyStatus: providerResponse.safetyStatus,
      },
    );
  }

  if (
    request.evidenceRequirements.citationsRequired &&
    providerResponse.citations.length === 0
  ) {
    throw new OfficeCompletionError(
      "provider-response-invalid",
      `Provider ${routingDecision.provider} returned no citations for a citation-required request.`,
      502,
      { routingDecision, provider: routingDecision.provider },
    );
  }

  let draft;
  try {
    draft = parseMicrosoftReadyDraft(providerResponse.structuredArtifact);
  } catch {
    throw new OfficeCompletionError(
      "provider-response-invalid",
      `Provider ${routingDecision.provider} returned an invalid structured artifact.`,
      502,
      { routingDecision, provider: routingDecision.provider },
    );
  }

  const outputPackage = createMicrosoftReadyOutputPackage(
    request,
    providerResponse,
    draft,
  );

  return {
    requestId: request.requestId,
    routingDecision,
    provider: {
      id: providerResponse.provider,
      modelConfiguration: providerResponse.modelConfiguration,
      status: "completed",
      safetyStatus:
        providerResponse.safetyStatus === "warning" ? "warning" : "passed",
      warnings: [...providerResponse.warnings],
      usage: providerResponse.usage,
      traceId: providerResponse.traceId,
      generatedAt: providerResponse.generatedAt,
    },
    outputPackage,
  };
}
