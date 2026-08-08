import type {
  OfficeProviderAdapter,
  OfficeProviderDescriptor,
  OfficeProviderId,
} from "./contracts.js";
import { officeProviderIds } from "./contracts.js";
import { GeminiOfficeAdapter } from "./adapters/gemini-adapter.js";
import { ClaudeOfficeAdapter } from "./adapters/claude-adapter.js";
import { ChatGptOfficeAdapter } from "./adapters/chatgpt-adapter.js";
import {
  activateOfficeProvider,
  cloneRegisteredOfficeProviders,
} from "./provider-registry.js";

const providerCapabilities = [
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
  enabledProviderIds: OfficeProviderId[];
  failures: string[];
}

interface ProviderRuntimeConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs?: number;
  apiVersion?: string;
}

function configured(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parseTimeout(
  value: string | undefined,
  variableName: string,
): { timeoutMs?: number; failure?: string } {
  if (!value || value.trim().length === 0) return {};
  const timeoutMs = Number.parseInt(value, 10);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return { failure: `${variableName} must be a positive integer.` };
  }
  return { timeoutMs };
}

function parseEnabledProviders(
  masterEnabled: boolean,
  rawValue: string,
): { enabledProviderIds: OfficeProviderId[]; failures: string[] } {
  const failures: string[] = [];

  if (!masterEnabled) {
    if (rawValue.length > 0) {
      failures.push(
        "OFFICE_COMPANION_ENABLED_PROVIDERS requires OFFICE_COMPANION_ENABLE_LIVE_PROVIDER=true.",
      );
    }
    return { enabledProviderIds: [], failures };
  }

  if (rawValue.length === 0) {
    return { enabledProviderIds: ["gemini"], failures };
  }

  const tokens = rawValue.split(",").map((token) => token.trim().toLowerCase());
  if (tokens.some((token) => token.length === 0)) {
    failures.push(
      "OFFICE_COMPANION_ENABLED_PROVIDERS contains an empty provider entry.",
    );
  }

  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.length === 0) continue;
    if (!(officeProviderIds as readonly string[]).includes(token)) {
      failures.push(`Unknown Office Companion provider: ${token}.`);
      continue;
    }
    if (seen.has(token)) {
      failures.push(`Duplicate Office Companion provider: ${token}.`);
      continue;
    }
    seen.add(token);
  }

  return {
    enabledProviderIds: officeProviderIds.filter((id) => seen.has(id)),
    failures,
  };
}

export function createOfficeRuntimeProviderState(
  options: OfficeRuntimeProviderOptions = {},
): OfficeRuntimeProviderState {
  const environment = options.environment ?? process.env;
  const now = options.now ?? (() => new Date());
  const enableValue = configured(
    environment.OFFICE_COMPANION_ENABLE_LIVE_PROVIDER,
  ).toLowerCase();
  const enabledProvidersValue = configured(
    environment.OFFICE_COMPANION_ENABLED_PROVIDERS,
  );
  const failures: string[] = [];
  const adapters = new Map<OfficeProviderId, OfficeProviderAdapter>();
  let providers = cloneRegisteredOfficeProviders();

  if (!["", "false", "true"].includes(enableValue)) {
    failures.push(
      "OFFICE_COMPANION_ENABLE_LIVE_PROVIDER must be true, false or unset.",
    );
  }

  const masterEnabled = enableValue === "true";
  const enabled = parseEnabledProviders(masterEnabled, enabledProvidersValue);
  failures.push(...enabled.failures);

  const geminiTimeout = parseTimeout(
    environment.GEMINI_TIMEOUT_MS,
    "GEMINI_TIMEOUT_MS",
  );
  const claudeTimeout = parseTimeout(
    environment.CLAUDE_TIMEOUT_MS,
    "CLAUDE_TIMEOUT_MS",
  );
  const chatGptTimeout = parseTimeout(
    environment.OPENAI_TIMEOUT_MS,
    "OPENAI_TIMEOUT_MS",
  );
  for (const timeout of [geminiTimeout, claudeTimeout, chatGptTimeout]) {
    if (timeout.failure) failures.push(timeout.failure);
  }

  const runtimeConfig: Record<OfficeProviderId, ProviderRuntimeConfig> = {
    gemini: {
      apiKey: configured(environment.GEMINI_API_KEY),
      model: configured(environment.GEMINI_MODEL),
      baseUrl: configured(environment.GEMINI_API_BASE_URL),
      timeoutMs: geminiTimeout.timeoutMs,
    },
    claude: {
      apiKey: configured(environment.ANTHROPIC_API_KEY),
      model: configured(environment.CLAUDE_MODEL),
      baseUrl: configured(environment.CLAUDE_API_BASE_URL),
      timeoutMs: claudeTimeout.timeoutMs,
      apiVersion: configured(environment.ANTHROPIC_VERSION),
    },
    chatgpt: {
      apiKey: configured(environment.OPENAI_API_KEY),
      model: configured(environment.OPENAI_MODEL),
      baseUrl: configured(environment.OPENAI_API_BASE_URL),
      timeoutMs: chatGptTimeout.timeoutMs,
    },
  };

  const enabledSet = new Set<OfficeProviderId>(enabled.enabledProviderIds);
  for (const providerId of officeProviderIds) {
    const providerConfig = runtimeConfig[providerId];
    const isEnabled = enabledSet.has(providerId);
    const hasApiKey = providerConfig.apiKey.length > 0;
    const hasModel = providerConfig.model.length > 0;

    if (isEnabled && (!hasApiKey || !hasModel)) {
      failures.push(
        `Enabled provider ${providerId} requires both credential and model configuration.`,
      );
    }
    if (!isEnabled && (hasApiKey || hasModel)) {
      failures.push(
        `Provider ${providerId} has credential or model configuration but is not explicitly enabled.`,
      );
    }
  }

  if (!masterEnabled) {
    const configuredProviderIds = officeProviderIds.filter((providerId) => {
      const providerConfig = runtimeConfig[providerId];
      return providerConfig.apiKey.length > 0 || providerConfig.model.length > 0;
    });
    if (configuredProviderIds.length > 0) {
      failures.push(
        "Provider credentials or model configuration are present, but OFFICE_COMPANION_ENABLE_LIVE_PROVIDER is not true.",
      );
    }
  }

  if (failures.length === 0) {
    const evidenceUpdatedAt = now().toISOString();

    for (const providerId of enabled.enabledProviderIds) {
      const providerConfig = runtimeConfig[providerId];
      let adapter: OfficeProviderAdapter;

      if (providerId === "gemini") {
        adapter = new GeminiOfficeAdapter({
          apiKey: providerConfig.apiKey,
          model: providerConfig.model,
          baseUrl:
            providerConfig.baseUrl.length > 0
              ? providerConfig.baseUrl
              : undefined,
          timeoutMs: providerConfig.timeoutMs,
          fetchImpl: options.fetchImpl,
          now,
          traceIdFactory: options.traceIdFactory,
        });
      } else if (providerId === "claude") {
        adapter = new ClaudeOfficeAdapter({
          apiKey: providerConfig.apiKey,
          model: providerConfig.model,
          baseUrl:
            providerConfig.baseUrl.length > 0
              ? providerConfig.baseUrl
              : undefined,
          apiVersion:
            providerConfig.apiVersion && providerConfig.apiVersion.length > 0
              ? providerConfig.apiVersion
              : undefined,
          timeoutMs: providerConfig.timeoutMs,
          fetchImpl: options.fetchImpl,
          now,
          traceIdFactory: options.traceIdFactory,
        });
      } else {
        adapter = new ChatGptOfficeAdapter({
          apiKey: providerConfig.apiKey,
          model: providerConfig.model,
          baseUrl:
            providerConfig.baseUrl.length > 0
              ? providerConfig.baseUrl
              : undefined,
          timeoutMs: providerConfig.timeoutMs,
          fetchImpl: options.fetchImpl,
          now,
          traceIdFactory: options.traceIdFactory,
        });
      }

      adapters.set(providerId, adapter);
      providers = activateOfficeProvider(providers, {
        id: providerId,
        supportedCapabilities: providerCapabilities,
        evidence: {
          quality: 0.5,
          reliability: 0.5,
          latency: 0.5,
          costEfficiency: 0.5,
          updatedAt: evidenceUpdatedAt,
        },
      });
    }
  }

  return {
    providers,
    adapters,
    operationalProviderIds: providers
      .filter((provider) => provider.status === "available")
      .map((provider) => provider.id),
    enabledProviderIds: enabled.enabledProviderIds,
    failures,
  };
}
