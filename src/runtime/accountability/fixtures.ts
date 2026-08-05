import {
  AccountabilityRecord,
  calculateContributionScore,
  calculateHealthScore,
  ScoreInputs,
} from "./model.js";

const scored = (
  base: Omit<AccountabilityRecord, "healthScore" | "executiveContributionScore">,
): AccountabilityRecord => ({
  ...base,
  healthScore: calculateHealthScore(base.scoreInputs),
  executiveContributionScore: calculateContributionScore(base.scoreInputs),
});

const strong: ScoreInputs = {
  missionCompletion: 90,
  impact: 85,
  quality: 90,
  evidenceCompleteness: 100,
  riskHandling: 85,
  handoverCompletion: 80,
};

const monitoring: ScoreInputs = {
  missionCompletion: 100,
  impact: 35,
  quality: 90,
  evidenceCompleteness: 100,
  riskHandling: 90,
  handoverCompletion: 100,
};

const noEvidence: ScoreInputs = {
  missionCompletion: 20,
  impact: 10,
  quality: 30,
  evidenceCompleteness: 0,
  riskHandling: 40,
  handoverCompletion: 20,
};

export const validActiveRecord = scored({
  cycleDate: "2026-08-04",
  timezone: "Europe/Vienna",
  actorId: "AGENT-TIAAN",
  actorType: "AGENT",
  role: "Runtime and Schema Implementation",
  mission: "Implement the EO Accountability Cycle runtime slice.",
  lifecycle: "ACTIVE",
  activityState: "ACTIVE",
  actionsCompleted: ["Implemented model and validator"],
  findings: ["Deterministic score calculation is operational"],
  risks: ["Drive authority still missing for merge"],
  decisionsRequired: [],
  nextSteps: ["Complete acceptance runner"],
  evidence: [
    {
      kind: "COMMIT",
      uri: "github://thomascatulli-1976/phoenix/commit/28742f317982895dbc615739da7011a58e88c3b6",
    },
  ],
  scoreInputs: strong,
  flags: {
    missingEvidence: false,
    unresolvedHandover: false,
    overloadedMandate: true,
    duplicatedResponsibility: false,
  },
});

export const validAllClearRecord = scored({
  cycleDate: "2026-08-04",
  timezone: "Europe/Vienna",
  actorId: "AGENT-THRAWN",
  actorType: "AGENT",
  role: "Security Review",
  mission: "Monitor the accountability runtime for security regressions.",
  lifecycle: "ACTIVE",
  activityState: "ALL_CLEAR",
  actionsCompleted: [],
  findings: ["Monitoring completed; no material security regression detected"],
  risks: [],
  decisionsRequired: [],
  nextSteps: ["Repeat review when external connectors are introduced"],
  evidence: [
    {
      kind: "REVIEW",
      uri: "fixture://security-review/all-clear-001",
      label: "Synthetic acceptance fixture only",
    },
  ],
  scoreInputs: monitoring,
  flags: {
    missingEvidence: false,
    unresolvedHandover: false,
    overloadedMandate: false,
    duplicatedResponsibility: false,
  },
});

export const validNoEvidenceRecord = scored({
  cycleDate: "2026-08-04",
  timezone: "Europe/Vienna",
  actorId: "AGENT-JABBA",
  actorType: "AGENT",
  role: "Enterprise Synergy Review",
  mission: "Identify reusable assets and cross-OS opportunities.",
  lifecycle: "ACTIVE",
  activityState: "NO_EVIDENCE",
  actionsCompleted: [],
  findings: ["No verifiable activity log was available for this cycle"],
  risks: ["Silent role may hide missed synergies"],
  decisionsRequired: [],
  nextSteps: ["Create an explicit synergy review or all-clear entry"],
  evidence: [],
  scoreInputs: noEvidence,
  flags: {
    missingEvidence: true,
    unresolvedHandover: false,
    overloadedMandate: false,
    duplicatedResponsibility: false,
  },
});

export const invalidSilentActiveRecord: AccountabilityRecord = {
  ...validActiveRecord,
  actorId: "AGENT-SILENT",
  actionsCompleted: [],
};

export const invalidScoreRangeRecord: AccountabilityRecord = {
  ...validActiveRecord,
  actorId: "AGENT-RANGE",
  scoreInputs: { ...validActiveRecord.scoreInputs, impact: 140 },
};

export const invalidAllClearWithoutEvidence: AccountabilityRecord = {
  ...validAllClearRecord,
  actorId: "AGENT-ALL-CLEAR-NO-EVIDENCE",
  evidence: [],
};

export const invalidNoEvidenceFlags: AccountabilityRecord = {
  ...validNoEvidenceRecord,
  actorId: "AGENT-NO-EVIDENCE-FLAG",
  flags: { ...validNoEvidenceRecord.flags, missingEvidence: false },
};

export const invalidArchivedActiveRecord: AccountabilityRecord = {
  ...validActiveRecord,
  actorId: "AGENT-ARCHIVED-ACTIVE",
  lifecycle: "ARCHIVED",
};

export const invalidScoreMismatchRecord: AccountabilityRecord = {
  ...validActiveRecord,
  actorId: "AGENT-SCORE-MISMATCH",
  healthScore: validActiveRecord.healthScore - 1,
};
