import fs from "node:fs";

const failures = [];
const fail = (message) => failures.push(message);
const configPath = "config/office-companion-human-review.json";

if (!fs.existsSync(configPath)) fail(`Missing ${configPath}`);

if (failures.length === 0) {
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (cfg.schemaVersion !== "1.0") fail("Human review schema version must be 1.0");
  if (cfg.artifactId !== "PHX-COMP-OFFICE-009") fail("Human review artifact ID is invalid");
  if (cfg.driveFileId !== "1EkFpo711nnTfrEwXBs4HW6KI6kBhok_1Bsvwy5NTUo0") fail("Human review Drive ID is invalid");
  if (cfg.sourceReviewArtifactId !== "PHX-COMP-OFFICE-008") fail("Human review source artifact must be PHX-COMP-OFFICE-008");
  if (cfg.executiveOffice !== "Billy") fail("Human review gate must remain under Billy");
  const decisions = ["PASS", "PASS WITH CONDITIONS", "REJECTED"];
  if (JSON.stringify(cfg.allowedDecisions) !== JSON.stringify(decisions)) fail("Allowed review decisions are invalid");
  if (cfg.preconditions?.requiredReviewStatus !== "ELIGIBLE_FOR_HUMAN_REVIEW") fail("Human review must require PHX-008 eligibility");
  if (JSON.stringify(cfg.preconditions?.requiredProviders) !== JSON.stringify(["gemini", "claude", "chatgpt"])) fail("Human review must cover all three providers");
  if (cfg.preconditions?.requiredDataClass !== "green") fail("Human review promotion gate must remain GREEN-only");
  for (const field of ["requireGitSha", "requireWorkflowRunId"]) if (cfg.preconditions?.[field] !== true) fail(`${field} must be required`);
  for (const field of ["reviewerIdentityRequired", "decisionTimestampRequired", "rationaleRequired", "conditionsRequiredForConditionalPass", "sourceEvidenceReferenceRequired"]) if (cfg.recordRequirements?.[field] !== true) fail(`${field} must be true`);
  const boundary = cfg.promotionBoundary ?? {};
  for (const field of ["automaticApproval", "automaticRoutingScoreUpdate", "automaticProductionAuthority", "automaticMicrosoftGraphAuthority"]) if (boundary[field] !== false) fail(`${field} must remain false`);
  if (boundary.routingEvidenceProposalAllowed !== true) fail("Routing evidence proposal must be allowed");
  if (boundary.proposalMustBeReviewedRepositoryChange !== true) fail("Routing evidence proposal must require a reviewed repository change");
}

if (failures.length > 0) {
  console.error("Phoenix Office Companion human review validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phoenix Office Companion human review gate is valid: PHX-COMP-OFFICE-009 requires explicit human decision and forbids automatic routing, production, or Graph authority changes.");
