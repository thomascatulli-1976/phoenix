import {
  AccountabilityRecord,
  calculateContributionScore,
  calculateHealthScore,
} from "./model.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateAccountabilityRecord(
  record: AccountabilityRecord,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!record.actorId.trim()) errors.push("actorId is required");
  if (!record.role.trim()) errors.push("role is required");
  if (!record.mission.trim()) errors.push("mission is required");
  if (!record.cycleDate.trim()) errors.push("cycleDate is required");
  if (!record.timezone.trim()) errors.push("timezone is required");

  const expectedHealth = calculateHealthScore(record.scoreInputs);
  const expectedContribution = calculateContributionScore(record.scoreInputs);

  if (record.healthScore !== expectedHealth) {
    errors.push(`healthScore must equal deterministic result ${expectedHealth}`);
  }

  if (record.executiveContributionScore !== expectedContribution) {
    errors.push(
      `executiveContributionScore must equal deterministic result ${expectedContribution}`,
    );
  }

  if (record.activityState === "ACTIVE" && record.actionsCompleted.length === 0) {
    errors.push("ACTIVE records require at least one completed action");
  }

  if (record.activityState === "ALL_CLEAR" && record.findings.length === 0) {
    errors.push("ALL_CLEAR records require an explicit monitoring finding");
  }

  if (record.activityState === "NO_EVIDENCE" && !record.flags.missingEvidence) {
    errors.push("NO_EVIDENCE records must set flags.missingEvidence=true");
  }

  if (record.evidence.length === 0 && record.activityState !== "NO_EVIDENCE") {
    errors.push("evidence is required unless activityState is NO_EVIDENCE");
  }

  if (record.flags.missingEvidence && record.evidence.length > 0) {
    warnings.push("missingEvidence is set although evidence references exist");
  }

  if (record.lifecycle === "ARCHIVED" && record.activityState === "ACTIVE") {
    errors.push("ARCHIVED actors cannot have ACTIVE activity state");
  }

  return { valid: errors.length === 0, errors, warnings };
}
