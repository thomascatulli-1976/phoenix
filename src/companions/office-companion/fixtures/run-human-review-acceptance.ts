import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createOfficeHumanReviewRecord } from "../staging/create-human-review-record.js";

const directory = await mkdtemp(path.join(os.tmpdir(), "office-human-review-"));
try {
  const review = {
    schemaVersion: "1.0",
    artifactId: "PHX-COMP-OFFICE-008",
    sourceArtifactId: "PHX-COMP-OFFICE-006",
    sourceGitSha: "abc123",
    sourceWorkflowRunId: "123456",
    status: "ELIGIBLE_FOR_HUMAN_REVIEW",
    promotionEligible: true,
    humanDecisionRequired: true,
    routingScoresUpdated: false,
    providers: [
      { provider: "gemini", checksPassed: true },
      { provider: "claude", checksPassed: true },
      { provider: "chatgpt", checksPassed: true }
    ]
  };
  await writeFile(path.join(directory, "evidence-review.json"), JSON.stringify(review), "utf8");

  const record = await createOfficeHumanReviewRecord({
    evidenceDirectory: directory,
    reviewer: "acceptance-reviewer",
    decision: "PASS WITH CONDITIONS",
    rationale: "All governance checks passed; retain manual score promotion.",
    conditions: ["Routing score changes require a reviewed repository change."],
    decidedAt: "2026-08-09T00:00:00.000Z"
  });

  if (record.decision !== "PASS WITH CONDITIONS") throw new Error("Decision mismatch");
  if (record.routingEvidenceProposalAllowed !== true) throw new Error("Expected proposal eligibility");
  if (record.routingScoresUpdated !== false) throw new Error("Routing scores must remain unchanged");
  if (record.productionAuthorityGranted !== false || record.microsoftGraphAuthorityGranted !== false) {
    throw new Error("Human review record must not grant production or Graph authority");
  }
  const persisted = JSON.parse(await readFile(path.join(directory, "human-review-record.json"), "utf8"));
  if (persisted.artifactId !== "PHX-COMP-OFFICE-009") throw new Error("Persisted artifact mismatch");

  let rejected = false;
  try {
    await createOfficeHumanReviewRecord({
      evidenceDirectory: directory,
      reviewer: "acceptance-reviewer",
      decision: "PASS WITH CONDITIONS",
      rationale: "Missing required condition.",
      conditions: []
    });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Conditional pass without conditions must fail");

  console.log("PASS Office Companion human review acceptance: explicit human decision recorded; routing, production and Graph authority unchanged.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
