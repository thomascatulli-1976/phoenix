import type {
  OfficeProviderDescriptor,
  OfficeProviderId,
  ProviderEvidence,
} from "./contracts.js";

const unverifiedEvidence: ProviderEvidence = {
  quality: 0,
  reliability: 0,
  latency: 0,
  costEfficiency: 0,
  updatedAt: "2026-08-08T00:00:00.000Z",
};

export const registeredOfficeProviders: OfficeProviderDescriptor[] = [
  {
    id: "gemini",
    displayName: "Gemini",
    status: "registered",
    supportedCapabilities: [],
    allowedDataClasses: ["green", "yellow-sanitized"],
    evidence: { ...unverifiedEvidence },
  },
  {
    id: "claude",
    displayName: "Claude",
    status: "registered",
    supportedCapabilities: [],
    allowedDataClasses: ["green", "yellow-sanitized"],
    evidence: { ...unverifiedEvidence },
  },
  {
    id: "chatgpt",
    displayName: "ChatGPT",
    status: "registered",
    supportedCapabilities: [],
    allowedDataClasses: ["green", "yellow-sanitized"],
    evidence: { ...unverifiedEvidence },
  },
];

export function cloneRegisteredOfficeProviders(): OfficeProviderDescriptor[] {
  return registeredOfficeProviders.map((provider) => ({
    ...provider,
    supportedCapabilities: [...provider.supportedCapabilities],
    allowedDataClasses: [...provider.allowedDataClasses],
    evidence: { ...provider.evidence },
  }));
}

export interface ProviderActivation {
  id: OfficeProviderId;
  supportedCapabilities: string[];
  evidence: ProviderEvidence;
}

export function activateOfficeProvider(
  providers: OfficeProviderDescriptor[],
  activation: ProviderActivation,
): OfficeProviderDescriptor[] {
  let found = false;

  const updated = providers.map((provider) => {
    if (provider.id !== activation.id) return provider;
    found = true;
    return {
      ...provider,
      status: "available" as const,
      supportedCapabilities: [...activation.supportedCapabilities],
      evidence: { ...activation.evidence },
    };
  });

  if (!found) {
    throw new Error(`Provider ${activation.id} is not registered.`);
  }

  return updated;
}
