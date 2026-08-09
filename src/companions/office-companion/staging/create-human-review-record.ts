import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type OfficeHumanReviewDecision = "PASS" | "PASS WITH CONDITIONS" | "REJECTED";

export interface OfficeHumanReviewInput {
  evidenceDirectory: string;
  reviewer: string;
  decision: OfficeHumanReviewDecision;
  rationale: string;
  conditions?: string[];
  decidedAt?: string;
}

interface EvidenceReview {
  artifactId?: string;
  sourceArtifactId?: string;
  sourceGitSha?: string;
  sourceWorkflowRunId?: string;
  status?: string;
  promotionEligible?: boolean;
  humanDecisionRequired?: boolean;
  routingScoresUpdated?: boolean;
  providers?: Array<{ provider?: string; checksPassed?: boolean }>;
}

export interface OfficeHumanReviewRecord {
  schemaVersion: "1.0";
  artifactId: "PHX-COMP-OFFICE-009";
  sourceReviewArtifactId: "PHX-COMP-OFFICE-008";
  sourceEvidenceArtifactId: string;
  sourceGitSha: string;
  sourceWorkflowRunId: string;
  reviewer: string;
  decision: OfficeHumanReviewDecision;
  rationale: string;
  conditions: string[];
  decidedAt: string;
  providerCoverage: string[];
  routingEvidenceProposalAllowed: boolean;
  routingScoresUpdated: false;
  productionAuthorityGranted: false;
  microsoftGraphAuthorityGranted: false;
}

const canonicalProviders = ["gemini", "claude", "chatgpt"];
const allowedDecisions: OfficeHumanReviewDecision[] = ["PASS", "PASS WITH CONDITIONS", "REJECTED"];

function requiredText(name: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required.`);
  return trimmed;
}

export async function createOfficeHumanReviewRecord(input: OfficeHumanReviewInput): Promise<OfficeHumanReviewRecord> {
  const directory = path.resolve(input.evidenceDirectory);
  const review = JSON.parse(await readFile(path.join(directory, "evidence-review.json"), "utf8")) as EvidenceReview;

  if (review.artifactId !== "PHX-COMP-OFFICE-008") throw new Error("Source review must be PHX-COMP-OFFICE-008.");
  if (review.status !== "ELIGIBLE_FOR_HUMAN_REVIEW" || review.promotionEligible !== true) {
    throw new Error("Evidence is not eligible for human review.");
  }
  if (review.humanDecisionRequired !== true || review.routingScoresUpdated !== false) {
    throw new Error("PHX-008 human-review boundary is invalid.");
  }

  const coverage = (review.providers ?? [])
    .filter((entry) => entry.checksPassed === true && typeof entry.provider === "string")
    .map((entry) => entry.provider as string);
  if (JSON.stringify(coverage) !== JSON.stringify(canonicalProviders)) {
    throw new Error("Human review requires passed evidence for all three canonical providers.");
  }
  if (!allowedDecisions.includes(input.decision)) throw new Error("Invalid human review decision.");

  const reviewer = requiredText("reviewer", input.reviewer);
  const rationale = requiredText("rationale", input.rationale);
  const conditions = (input.conditions ?? []).map((condition) => condition.trim()).filter(Boolean);
  if (input.decision === "PASS WITH CONDITIONS" && conditions.length === 0) {
    throw new Error("PASS WITH CONDITIONS requires at least one condition.");
  }
  if (input.decision !== "PASS WITH CONDITIONS" && conditions.length > 0) {
    throw new Error("Conditions are only valid for PASS WITH CONDITIONS.");
  }

  const record: OfficeHumanReviewRecord = {
    schemaVersion: "1.0",
    artifactId: "PHX-COMP-OFFICE-009",
    sourceReviewArtifactId: "PHX-COMP-OFFICE-008",
    sourceEvidenceArtifactId: String(review.sourceArtifactId ?? "unknown"),
    sourceGitSha: requiredText("sourceGitSha", String(review.sourceGitSha ?? "")),
    sourceWorkflowRunId: requiredText("sourceWorkflowRunId", String(review.sourceWorkflowRunId ?? "")),
    reviewer,
    decision: input.decision,
    rationale,
    conditions,
    decidedAt: input.decidedAt ?? new Date().toISOString(),
    providerCoverage: coverage,
    routingEvidenceProposalAllowed: input.decision !== "REJECTED",
    routingScoresUpdated: false,
    productionAuthorityGranted: false,
    microsoftGraphAuthorityGranted: false,
  };

  await writeFile(path.join(directory, "human-review-record.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const decision = process.env.OFFICE_COMPANION_REVIEW_DECISION as OfficeHumanReviewDecision;
  const conditions = (process.env.OFFICE_COMPANION_REVIEW_CONDITIONS ?? "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
  createOfficeHumanReviewRecord({
    evidenceDirectory: process.env.OFFICE_COMPANION_EVIDENCE_DIR ?? "artifacts/office-staging-evidence",
    reviewer: process.env.OFFICE_COMPANION_REVIEWER ?? "",
    decision,
    rationale: process.env.OFFICE_COMPANION_REVIEW_RATIONALE ?? "",
    conditions,
  })
    .then((record) => console.log(`Recorded Office Companion human decision: ${record.decision}; routing scores unchanged.`))
    .catch((error) => {
      console.error(`FAIL Office Companion human review record: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
