import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { reviewOfficeStagingEvidence } from "../staging/review-evidence.js";

const providers = ["gemini", "claude", "chatgpt"] as const;

function request(provider: string) {
  return {
    requestId: `proof-${provider}`,
    dataClass: "green",
    allowFallback: false,
    preferredProvider: provider,
    allowedProviders: [provider],
    validationRequirements: { humanReviewRequired: true },
  };
}

function response(provider: string) {
  return {
    provider: { id: provider },
    outputPackage: {
      status: "Draft / Review Candidate",
      validationState: "unvalidated",
      humanReviewRequired: true,
      autonomousPublication: false,
      sensitivity: "GREEN",
    },
  };
}

async function seed(directory: string): Promise<void> {
  const summary = {
    artifactId: "PHX-COMP-OFFICE-006",
    gitSha: "0123456789abcdef",
    workflowRunId: "12345",
    dataClass: "green",
    passed: true,
    providers: providers.map((provider) => ({
      provider,
      status: "passed",
      weightedOverallScore: 0.9,
      blockingFailures: [],
    })),
  };
  await writeFile(path.join(directory, "summary.json"), JSON.stringify(summary), "utf8");
  for (const provider of providers) {
    await writeFile(path.join(directory, `${provider}-request.json`), JSON.stringify(request(provider)), "utf8");
    await writeFile(path.join(directory, `${provider}-response.json`), JSON.stringify(response(provider)), "utf8");
    await writeFile(path.join(directory, `${provider}-evaluation.json`), JSON.stringify({ passed: true, blockingFailures: [] }), "utf8");
  }
}

export async function runEvidenceReviewAcceptance(): Promise<void> {
  const cleanDirectory = await mkdtemp(path.join(os.tmpdir(), "office-evidence-clean-"));
  await seed(cleanDirectory);
  const clean = await reviewOfficeStagingEvidence(cleanDirectory, () => new Date("2026-08-09T05:40:00.000Z"));
  assert.equal(clean.status, "ELIGIBLE_FOR_HUMAN_REVIEW");
  assert.equal(clean.promotionEligible, true);
  assert.equal(clean.humanDecisionRequired, true);
  assert.equal(clean.routingScoresUpdated, false);
  assert.deepEqual(clean.blockingFailures, []);
  assert.equal(clean.providers.length, 3);
  assert.ok(clean.providers.every((entry) => entry.checksPassed));

  const leakDirectory = await mkdtemp(path.join(os.tmpdir(), "office-evidence-leak-"));
  await seed(leakDirectory);
  await writeFile(path.join(leakDirectory, "summary.md"), "Authorization: Bearer abcdefghijklmnopqrstuvwxyz", "utf8");
  const leaked = await reviewOfficeStagingEvidence(leakDirectory);
  assert.equal(leaked.status, "REJECTED_AUTOMATICALLY");
  assert.equal(leaked.promotionEligible, false);
  assert.ok(leaked.leakFindings.some((finding) => finding.pattern === "authorization-header"));

  const driftDirectory = await mkdtemp(path.join(os.tmpdir(), "office-evidence-drift-"));
  await seed(driftDirectory);
  await writeFile(
    path.join(driftDirectory, "claude-response.json"),
    JSON.stringify({ ...response("claude"), outputPackage: { ...response("claude").outputPackage, autonomousPublication: true } }),
    "utf8",
  );
  const drift = await reviewOfficeStagingEvidence(driftDirectory);
  assert.equal(drift.promotionEligible, false);
  assert.ok(drift.blockingFailures.some((failure) => failure.includes("autonomous publication")));
}
