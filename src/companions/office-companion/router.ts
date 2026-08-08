import type {
  OfficeProviderDescriptor,
  OfficeProviderId,
  OfficeRoutingDecision,
  OfficeTaskRequest,
} from "./contracts.js";

export interface OfficeRoutingPolicy {
  allowFallback: boolean;
  weights: {
    quality: number;
    reliability: number;
    latency: number;
    costEfficiency: number;
  };
}

export const defaultOfficeRoutingPolicy: OfficeRoutingPolicy = {
  allowFallback: true,
  weights: {
    quality: 0.35,
    reliability: 0.35,
    latency: 0.15,
    costEfficiency: 0.15,
  },
};

function reject(
  code: Extract<OfficeRoutingDecision, { status: "rejected" }>["code"],
  reason: string,
  eligibleProviders: OfficeProviderId[] = [],
): OfficeRoutingDecision {
  return {
    status: "rejected",
    code,
    reason,
    eligibleProviders,
    fallbackProviders: [],
  };
}

function isEligible(
  request: OfficeTaskRequest,
  provider: OfficeProviderDescriptor,
): boolean {
  if (!request.allowedProviders.includes(provider.id)) return false;
  if (provider.status !== "available") return false;

  const requiredDataClass =
    request.dataClass === "yellow" ? "yellow-sanitized" : request.dataClass;

  if (requiredDataClass === "red") return false;
  if (!provider.allowedDataClasses.includes(requiredDataClass)) return false;

  return request.requiredCapabilities.every((capability) =>
    provider.supportedCapabilities.includes(capability),
  );
}

function normalizedScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function scoreOfficeProvider(
  provider: OfficeProviderDescriptor,
  policy: OfficeRoutingPolicy = defaultOfficeRoutingPolicy,
): number {
  const { evidence } = provider;
  const score =
    normalizedScore(evidence.quality) * policy.weights.quality +
    normalizedScore(evidence.reliability) * policy.weights.reliability +
    normalizedScore(evidence.latency) * policy.weights.latency +
    normalizedScore(evidence.costEfficiency) * policy.weights.costEfficiency;

  return Number(score.toFixed(6));
}

export function routeOfficeTask(
  request: OfficeTaskRequest,
  providers: OfficeProviderDescriptor[],
  policy: OfficeRoutingPolicy = defaultOfficeRoutingPolicy,
): OfficeRoutingDecision {
  if (request.dataClass === "red") {
    return reject(
      "red-data-prohibited",
      "RED data is rejected for external LLM routing by the foundation policy.",
    );
  }

  if (request.dataClass === "yellow" && request.sanitizationState !== "sanitized") {
    return reject(
      "yellow-data-not-sanitized",
      "YELLOW data must be sanitized before provider selection.",
    );
  }

  if (request.allowedProviders.length === 0) {
    return reject(
      "no-provider-allowed",
      "The request does not permit any provider.",
    );
  }

  const ranked = providers
    .filter((provider) => isEligible(request, provider))
    .map((provider) => ({ provider, score: scoreOfficeProvider(provider, policy) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.provider.id.localeCompare(right.provider.id);
    });

  const eligibleProviders = ranked.map(({ provider }) => provider.id);

  if (ranked.length === 0) {
    return reject(
      "no-provider-capable",
      "No available provider satisfies the data policy and required capabilities.",
    );
  }

  let selected = ranked[0];
  let reason = "Selected by policy, capability eligibility and current evidence scores.";

  if (request.preferredProvider) {
    const preferred = ranked.find(
      ({ provider }) => provider.id === request.preferredProvider,
    );

    if (preferred) {
      selected = preferred;
      reason = `Selected explicit eligible provider preference: ${preferred.provider.id}.`;
    } else if (!request.allowFallback || !policy.allowFallback) {
      return reject(
        "preferred-provider-ineligible",
        `Preferred provider ${request.preferredProvider} is not eligible and fallback is disabled.`,
        eligibleProviders,
      );
    } else {
      reason = `Preferred provider ${request.preferredProvider} was ineligible; selected an explicit policy-compliant fallback.`;
    }
  }

  const fallbackProviders =
    request.allowFallback && policy.allowFallback
      ? ranked
          .filter(({ provider }) => provider.id !== selected.provider.id)
          .map(({ provider }) => provider.id)
      : [];

  return {
    status: "selected",
    provider: selected.provider.id,
    eligibleProviders,
    fallbackProviders,
    reason,
    score: selected.score,
  };
}
