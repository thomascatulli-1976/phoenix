import type { OfficeTaskRequest } from "./contracts.js";
import type { OfficeCompletionResult } from "./completion-service.js";

export type OfficeEvaluationDimension =
  | "schemaCompliance"
  | "governanceCompliance"
  | "contentCompleteness"
  | "evidenceCompliance"
  | "latencyEfficiency"
  | "tokenEfficiency"
  | "providerReliability"
  | "explicitErrorBehavior";

export interface OfficeEvaluationDimensionResult {
  score: number;
  passed: boolean;
  blocking: boolean;
  details: string[];
}

export interface OfficeProviderEvaluation {
  provider: OfficeCompletionResult["provider"]["id"];
  modelConfiguration: string;
  testCaseId: string;
  requestId: string;
  dimensions: Record<OfficeEvaluationDimension, OfficeEvaluationDimensionResult>;
  weightedOverallScore: number;
  blockingFailures: OfficeEvaluationDimension[];
  passed: boolean;
  observedLatencyMs?: number;
  observedTotalUnits?: number;
  evaluatedAt: string;
  traceReferences: string[];
}

export const defaultOfficeEvaluationWeights: Record<
  OfficeEvaluationDimension,
  number
> = {
  schemaCompliance: 0.25,
  governanceCompliance: 0.25,
  contentCompleteness: 0.2,
  evidenceCompliance: 0.1,
  latencyEfficiency: 0.1,
  tokenEfficiency: 0.1,
  providerReliability: 0,
  explicitErrorBehavior: 0,
};

function bounded(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function scoreLatency(latencyMs: number | undefined): number {
  if (latencyMs === undefined) return 0.5;
  if (latencyMs <= 3_000) return 1;
  if (latencyMs <= 10_000) return 0.75;
  if (latencyMs <= 30_000) return 0.5;
  return 0.25;
}

function scoreTokens(totalUnits: number | undefined): number {
  if (totalUnits === undefined) return 0.5;
  if (totalUnits <= 1_000) return 1;
  if (totalUnits <= 3_000) return 0.75;
  if (totalUnits <= 6_000) return 0.5;
  return 0.25;
}

export function evaluateOfficeCompletion(input: {
  testCaseId: string;
  request: OfficeTaskRequest;
  result: OfficeCompletionResult;
  evaluatedAt?: string;
  weights?: Record<OfficeEvaluationDimension, number>;
}): OfficeProviderEvaluation {
  const { request, result } = input;
  const output = result.outputPackage;
  const weights = input.weights ?? defaultOfficeEvaluationWeights;

  const schemaChecks = [
    output.artifact.type === "Decision Memo",
    nonEmpty(output.artifact.title),
    nonEmpty(output.managementSummary),
    nonEmpty(output.decisionRequired),
    Array.isArray(output.options) && output.options.length >= 2,
    nonEmpty(output.recommendation),
  ];
  const schemaScore = schemaChecks.filter(Boolean).length / schemaChecks.length;

  const governanceChecks = [
    output.status === "Draft / Review Candidate",
    output.targetSystem === "Microsoft Word / SharePoint",
    output.validationState === "unvalidated",
    output.humanReviewRequired === true,
    output.autonomousPublication === false,
    output.providerMetadata.provider === result.provider.id,
    output.providerMetadata.requestId === request.requestId,
  ];
  const governanceScore =
    governanceChecks.filter(Boolean).length / governanceChecks.length;

  const contentChecks = [
    output.options.every(
      (option) =>
        nonEmpty(option.name) &&
        nonEmpty(option.summary) &&
        Array.isArray(option.benefits) &&
        Array.isArray(option.risks),
    ),
    Array.isArray(output.rationale) && output.rationale.length > 0,
    Array.isArray(output.assumptions),
    Array.isArray(output.openPoints),
    Array.isArray(output.internalValidationRequired),
    nonEmpty(output.sourceEvidenceStatus),
    nonEmpty(output.recommendedNextAction),
  ];
  const contentScore = contentChecks.filter(Boolean).length / contentChecks.length;

  const evidencePassed =
    !request.evidenceRequirements.citationsRequired ||
    result.provider.citationCount > 0;
  const latencyScore = scoreLatency(result.provider.usage?.latencyMs);
  const tokenScore = scoreTokens(result.provider.usage?.totalUnits);

  const dimensions: Record<
    OfficeEvaluationDimension,
    OfficeEvaluationDimensionResult
  > = {
    schemaCompliance: {
      score: bounded(schemaScore),
      passed: schemaScore === 1,
      blocking: true,
      details: schemaScore === 1 ? [] : ["Output package shape is incomplete."],
    },
    governanceCompliance: {
      score: bounded(governanceScore),
      passed: governanceScore === 1,
      blocking: true,
      details:
        governanceScore === 1
          ? []
          : ["Phoenix-owned review or publication controls are incomplete."],
    },
    contentCompleteness: {
      score: bounded(contentScore),
      passed: contentScore >= 0.8,
      blocking: false,
      details:
        contentScore >= 0.8 ? [] : ["Draft content completeness is below threshold."],
    },
    evidenceCompliance: {
      score: evidencePassed ? 1 : 0,
      passed: evidencePassed,
      blocking: request.evidenceRequirements.citationsRequired,
      details: evidencePassed ? [] : ["Required citations are missing."],
    },
    latencyEfficiency: {
      score: latencyScore,
      passed: latencyScore >= 0.5,
      blocking: false,
      details: [],
    },
    tokenEfficiency: {
      score: tokenScore,
      passed: tokenScore >= 0.5,
      blocking: false,
      details: [],
    },
    providerReliability: {
      score: result.provider.status === "completed" ? 1 : 0,
      passed: result.provider.status === "completed",
      blocking: false,
      details: [],
    },
    explicitErrorBehavior: {
      score: 1,
      passed: true,
      blocking: false,
      details: ["Successful completion path; error behavior is tested separately."],
    },
  };

  const weightedOverallScore = Number(
    (
      Object.entries(dimensions) as Array<
        [OfficeEvaluationDimension, OfficeEvaluationDimensionResult]
      >
    )
      .reduce(
        (sum, [dimension, resultValue]) =>
          sum + resultValue.score * (weights[dimension] ?? 0),
        0,
      )
      .toFixed(6),
  );

  const blockingFailures = (
    Object.entries(dimensions) as Array<
      [OfficeEvaluationDimension, OfficeEvaluationDimensionResult]
    >
  )
    .filter(([, resultValue]) => resultValue.blocking && !resultValue.passed)
    .map(([dimension]) => dimension);

  return {
    provider: result.provider.id,
    modelConfiguration: result.provider.modelConfiguration,
    testCaseId: input.testCaseId,
    requestId: request.requestId,
    dimensions,
    weightedOverallScore,
    blockingFailures,
    passed: blockingFailures.length === 0,
    observedLatencyMs: result.provider.usage?.latencyMs,
    observedTotalUnits: result.provider.usage?.totalUnits,
    evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
    traceReferences: [result.provider.traceId, output.providerMetadata.traceId],
  };
}
