export const officeProviderIds = ["gemini", "claude", "chatgpt"] as const;

export type OfficeProviderId = (typeof officeProviderIds)[number];
export type OfficeOperatingMode = "find" | "think" | "build" | "validate" | "publish";
export type OfficeDataClass = "green" | "yellow" | "red";
export type SanitizationState = "not-required" | "sanitized" | "not-sanitized";
export type ProviderStatus = "registered" | "available" | "unavailable" | "disabled";
export type ProviderCompletionStatus = "completed" | "partial" | "rejected" | "failed";

export interface ProviderEvidence {
  quality: number;
  reliability: number;
  latency: number;
  costEfficiency: number;
  updatedAt: string;
}

export interface OfficeProviderDescriptor {
  id: OfficeProviderId;
  displayName: string;
  status: ProviderStatus;
  supportedCapabilities: string[];
  allowedDataClasses: Array<"green" | "yellow-sanitized">;
  evidence: ProviderEvidence;
}

export interface EvidenceRequirements {
  citationsRequired: boolean;
  approvedSourceIds: string[];
  freshnessRequired?: string;
}

export interface ValidationRequirements {
  humanReviewRequired: boolean;
  internalValidationRequired: boolean;
  approvalRole?: string;
}

export interface OfficeTaskRequest {
  requestId: string;
  operatingMode: OfficeOperatingMode;
  task: string;
  intendedOutcome: string;
  input: string;
  contextReferences: string[];
  dataClass: OfficeDataClass;
  sanitizationState: SanitizationState;
  excludedInformation: string[];
  requiredCapabilities: string[];
  allowedProviders: OfficeProviderId[];
  preferredProvider?: OfficeProviderId;
  allowFallback: boolean;
  outputSchema?: string;
  evidenceRequirements: EvidenceRequirements;
  validationRequirements: ValidationRequirements;
  toolPermissions: string[];
  createdAt: string;
}

export interface NormalizedCitation {
  sourceId: string;
  title?: string;
  locator?: string;
  claimIds: string[];
}

export interface NormalizedToolActivity {
  toolId: string;
  action: string;
  status: "completed" | "rejected" | "failed";
  traceId?: string;
}

export interface ProviderUsage {
  inputUnits?: number;
  outputUnits?: number;
  totalUnits?: number;
  estimatedCost?: number;
  currency?: string;
  latencyMs?: number;
}

export interface OfficeProviderResponse {
  requestId: string;
  provider: OfficeProviderId;
  modelConfiguration: string;
  status: ProviderCompletionStatus;
  content: string;
  structuredArtifact?: unknown;
  citations: NormalizedCitation[];
  toolActivity: NormalizedToolActivity[];
  safetyStatus: "passed" | "warning" | "blocked";
  warnings: string[];
  unresolvedAssumptions: string[];
  fallbackHistory: OfficeProviderId[];
  usage?: ProviderUsage;
  validationState: "unvalidated" | "validated" | "approved" | "rejected";
  traceId: string;
  generatedAt: string;
}

export type RoutingRejectionCode =
  | "red-data-prohibited"
  | "yellow-data-not-sanitized"
  | "no-provider-allowed"
  | "preferred-provider-ineligible"
  | "no-provider-capable";

export interface SelectedRoutingDecision {
  status: "selected";
  provider: OfficeProviderId;
  eligibleProviders: OfficeProviderId[];
  fallbackProviders: OfficeProviderId[];
  reason: string;
  score: number;
}

export interface RejectedRoutingDecision {
  status: "rejected";
  code: RoutingRejectionCode;
  eligibleProviders: OfficeProviderId[];
  fallbackProviders: OfficeProviderId[];
  reason: string;
}

export type OfficeRoutingDecision = SelectedRoutingDecision | RejectedRoutingDecision;

export interface OfficeProviderAdapter {
  readonly id: OfficeProviderId;
  isAvailable(): Promise<boolean>;
  complete(request: OfficeTaskRequest): Promise<OfficeProviderResponse>;
}
