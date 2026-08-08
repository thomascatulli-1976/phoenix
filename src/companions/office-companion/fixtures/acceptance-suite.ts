import assert from "node:assert/strict";
import type {
  OfficeProviderDescriptor,
  OfficeTaskRequest,
} from "../contracts.js";
import { registeredOfficeProviders } from "../provider-registry.js";
import { routeOfficeTask } from "../router.js";

export interface OfficeAcceptanceResult {
  suite: string;
  passed: boolean;
  error?: string;
}

const availableProviders: OfficeProviderDescriptor[] = [
  {
    id: "gemini",
    displayName: "Gemini",
    status: "available",
    supportedCapabilities: ["reasoning", "document-drafting"],
    allowedDataClasses: ["green", "yellow-sanitized"],
    evidence: {
      quality: 0.92,
      reliability: 0.9,
      latency: 0.82,
      costEfficiency: 0.8,
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
  },
  {
    id: "claude",
    displayName: "Claude",
    status: "available",
    supportedCapabilities: ["reasoning", "document-drafting"],
    allowedDataClasses: ["green", "yellow-sanitized"],
    evidence: {
      quality: 0.88,
      reliability: 0.91,
      latency: 0.86,
      costEfficiency: 0.74,
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
  },
  {
    id: "chatgpt",
    displayName: "ChatGPT",
    status: "available",
    supportedCapabilities: ["reasoning", "document-drafting"],
    allowedDataClasses: ["green", "yellow-sanitized"],
    evidence: {
      quality: 0.9,
      reliability: 0.89,
      latency: 0.84,
      costEfficiency: 0.77,
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
  },
];

function request(
  overrides: Partial<OfficeTaskRequest> = {},
): OfficeTaskRequest {
  return {
    requestId: "office-acceptance-001",
    operatingMode: "think",
    task: "Develop a decision memo structure",
    intendedOutcome: "A review-ready outline",
    input: "Sanitized public context",
    contextReferences: [],
    dataClass: "green",
    sanitizationState: "not-required",
    excludedInformation: [],
    requiredCapabilities: ["reasoning"],
    allowedProviders: ["gemini", "claude", "chatgpt"],
    allowFallback: true,
    evidenceRequirements: {
      citationsRequired: false,
      approvedSourceIds: [],
    },
    validationRequirements: {
      humanReviewRequired: true,
      internalValidationRequired: true,
    },
    toolPermissions: [],
    createdAt: "2026-08-08T00:00:00.000Z",
    ...overrides,
  };
}

function run(
  suite: string,
  test: () => void,
): OfficeAcceptanceResult {
  try {
    test();
    return { suite, passed: true };
  } catch (error) {
    return {
      suite,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function runOfficeCompanionAcceptanceSuite(): OfficeAcceptanceResult[] {
  return [
    run("registers Gemini, Claude and ChatGPT without false activation", () => {
      assert.deepEqual(
        registeredOfficeProviders.map((provider) => provider.id),
        ["gemini", "claude", "chatgpt"],
      );
      assert.equal(
        registeredOfficeProviders.every((provider) => provider.status === "registered"),
        true,
      );
    }),
    run("routes green data by current evidence rather than permanent default", () => {
      const decision = routeOfficeTask(request(), availableProviders);
      assert.equal(decision.status, "selected");
      if (decision.status === "selected") {
        assert.equal(decision.provider, "gemini");
        assert.deepEqual(decision.fallbackProviders, ["chatgpt", "claude"]);
      }
    }),
    run("honors an eligible explicit provider preference", () => {
      const decision = routeOfficeTask(
        request({ preferredProvider: "claude" }),
        availableProviders,
      );
      assert.equal(decision.status, "selected");
      if (decision.status === "selected") {
        assert.equal(decision.provider, "claude");
      }
    }),
    run("rejects an ineligible preference when fallback is disabled", () => {
      const providers = availableProviders.map((provider) =>
        provider.id === "claude" ? { ...provider, status: "disabled" as const } : provider,
      );
      const decision = routeOfficeTask(
        request({ preferredProvider: "claude", allowFallback: false }),
        providers,
      );
      assert.equal(decision.status, "rejected");
      if (decision.status === "rejected") {
        assert.equal(decision.code, "preferred-provider-ineligible");
      }
    }),
    run("rejects red data before provider selection", () => {
      const decision = routeOfficeTask(
        request({ dataClass: "red", sanitizationState: "not-sanitized" }),
        availableProviders,
      );
      assert.equal(decision.status, "rejected");
      if (decision.status === "rejected") {
        assert.equal(decision.code, "red-data-prohibited");
      }
    }),
    run("rejects unsanitized yellow data", () => {
      const decision = routeOfficeTask(
        request({ dataClass: "yellow", sanitizationState: "not-sanitized" }),
        availableProviders,
      );
      assert.equal(decision.status, "rejected");
      if (decision.status === "rejected") {
        assert.equal(decision.code, "yellow-data-not-sanitized");
      }
    }),
    run("allows sanitized yellow data", () => {
      const decision = routeOfficeTask(
        request({ dataClass: "yellow", sanitizationState: "sanitized" }),
        availableProviders,
      );
      assert.equal(decision.status, "selected");
    }),
  ];
}
