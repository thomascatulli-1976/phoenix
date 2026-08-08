import type {
  OfficeProviderAdapter,
  OfficeProviderDescriptor,
  OfficeProviderId,
} from "./contracts.js";
import { GeminiOfficeAdapter } from "./adapters/gemini-adapter.js";
import {
  activateOfficeProvider,
  cloneRegisteredOfficeProviders,
} from "./provider-registry.js";

const geminiCapabilities = [
  "reasoning",
  "document-drafting",
  "structured-output",
  "microsoft-ready-output",
];

export interface OfficeRuntimeProviderOptions {
  environment?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  traceIdFactory?: () => string;
}

export interface OfficeRuntimeProviderState {
  providers: OfficeProviderDescriptor[];
  adapters: Map<OfficeProviderId, OfficeProviderAdapter>;
  operationalProviderIds: OfficeProviderId[];
  failures: string[];
}

function configured(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parseTimeout(value: string | undefined): {
  timeoutMs?: number;
  failure?: string;
} {
  if (!value || value.trim().length === 0) return {};
  const timeoutMs = Number.parseInt(value, 10);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return { failure: "GEMINI_TIMEOUT_MS must be a positive integer." };
  }
  return { timeoutMs };
}

export function createOfficeRuntimeProviderState(
  options: OfficeRuntimeProviderOptions = {},
): OfficeRuntimeProviderState {
  const environment = options.environment ?? process.env;
  const now = options.now ?? (() => new Date());
  const apiKey = configured(environment.GEMINI_API_KEY);
  const model = configured(environment.GEMINI_MODEL);
  const baseUrl = configured(environment.GEMINI_API_BASE_URL);
  const timeout = parseTimeout(environment.GEMINI_TIMEOUT_MS);
  const failures: string[] = [];
  const adapters = new Map<OfficeProviderId, OfficeProviderAdapter>();
  let providers = cloneRegisteredOfficeProviders();

  if (timeout.failure) failures.push(timeout.failure);

  const hasApiKey = apiKey.length > 0;
  const hasModel = model.length > 0;
  if (hasApiKey !== hasModel) {
    failures.push(
      "Gemini activation requires both GEMINI_API_KEY and GEMINI_MODEL.",
    );
  }

  if (hasApiKey && hasModel && failures.length === 0) {
    const adapter = new GeminiOfficeAdapter({
      apiKey,
      model,
      baseUrl: baseUrl.length > 0 ? baseUrl : undefined,
      timeoutMs: timeout.timeoutMs,
      fetchImpl: options.fetchImpl,
      now,
      traceIdFactory: options.traceIdFactory,
    });

    adapters.set("gemini", adapter);
    providers = activateOfficeProvider(providers, {
      id: "gemini",
      supportedCapabilities: geminiCapabilities,
      evidence: {
        quality: 0.5,
        reliability: 0.5,
        latency: 0.5,
        costEfficiency: 0.5,
        updatedAt: now().toISOString(),
      },
    });
  }

  return {
    providers,
    adapters,
    operationalProviderIds: providers
      .filter((provider) => provider.status === "available")
      .map((provider) => provider.id),
    failures,
  };
}
