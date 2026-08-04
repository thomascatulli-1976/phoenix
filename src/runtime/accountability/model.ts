export type ActivityState = "ACTIVE" | "ALL_CLEAR" | "NO_EVIDENCE" | "BLOCKED";

export type EvidenceKind =
  | "ISSUE"
  | "COMMIT"
  | "DOCUMENT"
  | "MEETING"
  | "DECISION"
  | "REVIEW"
  | "SYNC";

export interface EvidenceRef {
  kind: EvidenceKind;
  uri: string;
  label?: string;
}

export interface ScoreInputs {
  missionCompletion: number;
  impact: number;
  quality: number;
  evidenceCompleteness: number;
  riskHandling: number;
  handoverCompletion: number;
}

export interface AccountabilityRecord {
  cycleDate: string;
  timezone: string;
  actorId: string;
  actorType: "AGENT" | "EXECUTIVE_OFFICER";
  role: string;
  mission: string;
  lifecycle: "ACTIVE" | "PAUSED" | "WARNING" | "ARCHIVED";
  activityState: ActivityState;
  actionsCompleted: string[];
  findings: string[];
  risks: string[];
  decisionsRequired: string[];
  nextSteps: string[];
  evidence: EvidenceRef[];
  scoreInputs: ScoreInputs;
  healthScore: number;
  executiveContributionScore: number;
  flags: {
    missingEvidence: boolean;
    unresolvedHandover: boolean;
    overloadedMandate: boolean;
    duplicatedResponsibility: boolean;
  };
}

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export function calculateHealthScore(input: ScoreInputs): number {
  return clamp(
    input.missionCompletion * 0.25 +
      input.quality * 0.2 +
      input.evidenceCompleteness * 0.2 +
      input.riskHandling * 0.2 +
      input.handoverCompletion * 0.15,
  );
}

export function calculateContributionScore(input: ScoreInputs): number {
  return clamp(
    input.missionCompletion * 0.25 +
      input.impact * 0.3 +
      input.quality * 0.2 +
      input.evidenceCompleteness * 0.15 +
      input.handoverCompletion * 0.1,
  );
}
