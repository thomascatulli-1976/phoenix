import type {
  OfficeProviderResponse,
  OfficeTaskRequest,
} from "../contracts.js";

export interface MicrosoftReadyDecisionOption {
  name: string;
  summary: string;
  benefits: string[];
  risks: string[];
}

export interface MicrosoftReadyDraft {
  artifactTitle: string;
  managementSummary: string;
  decisionRequired: string;
  options: MicrosoftReadyDecisionOption[];
  recommendation: string;
  rationale: string[];
  assumptions: string[];
  openPoints: string[];
  internalValidationRequired: string[];
  evidenceStatus: string;
  recommendedNextAction: string;
}

export interface MicrosoftReadyOutputPackage {
  artifact: {
    type: "Decision Memo";
    title: string;
  };
  status: "Draft / Review Candidate";
  targetSystem: "Microsoft Word / SharePoint";
  owner: "[to be assigned]";
  decisionRequired: string;
  managementSummary: string;
  options: MicrosoftReadyDecisionOption[];
  recommendation: string;
  rationale: string[];
  assumptions: string[];
  openPoints: string[];
  internalValidationRequired: string[];
  sourceEvidenceStatus: string;
  recommendedNextAction: string;
  excludedInformation: string[];
  sensitivity: "GREEN" | "YELLOW_SANITIZED";
  providerMetadata: {
    provider: OfficeProviderResponse["provider"];
    modelConfiguration: string;
    requestId: string;
    traceId: string;
    generatedAt: string;
  };
  validationState: "unvalidated";
  humanReviewRequired: true;
  autonomousPublication: false;
}

export const microsoftReadyDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    artifactTitle: { type: "string" },
    managementSummary: { type: "string" },
    decisionRequired: { type: "string" },
    options: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          benefits: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
        },
        required: ["name", "summary", "benefits", "risks"],
      },
    },
    recommendation: { type: "string" },
    rationale: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    openPoints: { type: "array", items: { type: "string" } },
    internalValidationRequired: { type: "array", items: { type: "string" } },
    evidenceStatus: { type: "string" },
    recommendedNextAction: { type: "string" },
  },
  required: [
    "artifactTitle",
    "managementSummary",
    "decisionRequired",
    "options",
    "recommendation",
    "rationale",
    "assumptions",
    "openPoints",
    "internalValidationRequired",
    "evidenceStatus",
    "recommendedNextAction",
  ],
} as const;

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }
  return value.map((entry, index) => requireString(entry, `${field}[${index}]`));
}

function requireOptions(value: unknown): MicrosoftReadyDecisionOption[] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error("options must contain at least two decision options.");
  }

  return value.map((entry, index) => {
    const option = requireRecord(entry, `options[${index}]`);
    return {
      name: requireString(option.name, `options[${index}].name`),
      summary: requireString(option.summary, `options[${index}].summary`),
      benefits: requireStringArray(option.benefits, `options[${index}].benefits`),
      risks: requireStringArray(option.risks, `options[${index}].risks`),
    };
  });
}

export function parseMicrosoftReadyDraft(value: unknown): MicrosoftReadyDraft {
  const draft = requireRecord(value, "structuredArtifact");

  return {
    artifactTitle: requireString(draft.artifactTitle, "artifactTitle"),
    managementSummary: requireString(draft.managementSummary, "managementSummary"),
    decisionRequired: requireString(draft.decisionRequired, "decisionRequired"),
    options: requireOptions(draft.options),
    recommendation: requireString(draft.recommendation, "recommendation"),
    rationale: requireStringArray(draft.rationale, "rationale"),
    assumptions: requireStringArray(draft.assumptions, "assumptions"),
    openPoints: requireStringArray(draft.openPoints, "openPoints"),
    internalValidationRequired: requireStringArray(
      draft.internalValidationRequired,
      "internalValidationRequired",
    ),
    evidenceStatus: requireString(draft.evidenceStatus, "evidenceStatus"),
    recommendedNextAction: requireString(
      draft.recommendedNextAction,
      "recommendedNextAction",
    ),
  };
}

export function createMicrosoftReadyOutputPackage(
  request: OfficeTaskRequest,
  response: OfficeProviderResponse,
  draft: MicrosoftReadyDraft,
): MicrosoftReadyOutputPackage {
  if (request.dataClass === "red") {
    throw new Error("RED data cannot produce an external-provider output package.");
  }

  return {
    artifact: {
      type: "Decision Memo",
      title: draft.artifactTitle,
    },
    status: "Draft / Review Candidate",
    targetSystem: "Microsoft Word / SharePoint",
    owner: "[to be assigned]",
    decisionRequired: draft.decisionRequired,
    managementSummary: draft.managementSummary,
    options: draft.options,
    recommendation: draft.recommendation,
    rationale: draft.rationale,
    assumptions: draft.assumptions,
    openPoints: draft.openPoints,
    internalValidationRequired: draft.internalValidationRequired,
    sourceEvidenceStatus: draft.evidenceStatus,
    recommendedNextAction: draft.recommendedNextAction,
    excludedInformation: [...request.excludedInformation],
    sensitivity: request.dataClass === "green" ? "GREEN" : "YELLOW_SANITIZED",
    providerMetadata: {
      provider: response.provider,
      modelConfiguration: response.modelConfiguration,
      requestId: request.requestId,
      traceId: response.traceId,
      generatedAt: response.generatedAt,
    },
    validationState: "unvalidated",
    humanReviewRequired: true,
    autonomousPublication: false,
  };
}
