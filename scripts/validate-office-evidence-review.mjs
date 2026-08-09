import fs from "node:fs";

const configPath = "config/office-companion-evidence-review.json";
const requiredFiles = [
  configPath,
  "src/companions/office-companion/staging/review-evidence.ts",
  "src/companions/office-companion/fixtures/evidence-review-acceptance.ts",
  "src/companions/office-companion/fixtures/run-evidence-review-acceptance.ts",
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`Missing evidence review gate file: ${file}`);
}

if (failures.length === 0) {
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const artifact = cfg.artifact ?? {};
  const source = cfg.sourceEvidence ?? {};
  const automated = cfg.automatedReview ?? {};
  const human = cfg.humanGate ?? {};

  if (cfg.schemaVersion !== "1.0") failures.push("Evidence review schemaVersion must be 1.0");
  if (artifact.id !== "PHX-COMP-OFFICE-008") failures.push("Evidence review artifact ID is invalid");
  if (artifact.driveFileId !== "1_rUq_KsWB2fxWLOBInvupin6W4FFzFJ8kpszA6TEcsc") failures.push("Evidence review Drive anchor is invalid");
  if (artifact.executiveOffice !== "Billy") failures.push("Evidence review authority must remain Billy");
  if (artifact.canonicalDriveFolderId !== "11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z") failures.push("Evidence review Drive folder is invalid");
  if (artifact.technicalRepository !== "thomascatulli-1976/phoenix") failures.push("Evidence review repository anchor is invalid");

  if (source.artifactId !== "PHX-COMP-OFFICE-006") failures.push("Source evidence artifact must be PHX-COMP-OFFICE-006");
  if (source.requiredDataClass !== "green") failures.push("Evidence review must remain GREEN-only");
  if (JSON.stringify(source.requiredProviders) !== JSON.stringify(["gemini", "claude", "chatgpt"])) failures.push("Evidence review must require all three canonical providers");
  if (source.requiresGitSha !== true || source.requiresWorkflowRunId !== true) failures.push("Evidence provenance must require Git SHA and workflow run ID");

  for (const field of [
    "schemaAndGovernanceChecks",
    "blockingFailureChecks",
    "providerIdentityChecks",
    "fallbackMustBeDisabled",
    "humanReviewMustBeRequired",
    "autonomousPublicationMustBeFalse",
    "secretLeakHeuristics",
  ]) {
    if (automated[field] !== true) failures.push(`Automated evidence review control must remain enabled: ${field}`);
  }
  if (automated.promotionDecision !== "eligible-for-human-review-only") failures.push("Automated review may only make evidence eligible for human review");

  if (human.required !== true) failures.push("Human evidence decision must remain mandatory");
  if (JSON.stringify(human.allowedDecisions) !== JSON.stringify(["PASS", "PASS WITH CONDITIONS", "REJECTED"])) failures.push("Human evidence decision values are invalid");
  if (human.routingScoreUpdateAutomatic !== false) failures.push("Routing-score updates must never be automatic");
  if (human.routingScoreUpdateRequiresReviewedRepositoryChange !== true) failures.push("Routing-score changes must require a reviewed repository change");
  if (human.productionAuthorityGranted !== false || human.microsoftGraphAuthorityGranted !== false) failures.push("Evidence review must not grant production or Microsoft Graph authority");

  const reviewSource = fs.readFileSync("src/companions/office-companion/staging/review-evidence.ts", "utf8");
  for (const token of [
    "ELIGIBLE_FOR_HUMAN_REVIEW",
    "REJECTED_AUTOMATICALLY",
    "humanDecisionRequired: true",
    "routingScoresUpdated: false",
    "autonomousPublication",
    "allowFallback",
  ]) {
    if (!reviewSource.includes(token)) failures.push(`Evidence review implementation missing control: ${token}`);
  }
}

if (failures.length > 0) {
  console.error("Phoenix Office Companion evidence review validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phoenix Office Companion PHX-COMP-OFFICE-008 evidence review gate is valid: automated checks may reject or admit evidence to mandatory human review, but cannot update routing scores or grant production authority.");
