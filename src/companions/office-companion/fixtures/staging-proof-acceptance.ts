import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { OfficeProviderId } from "../contracts.js";
import {
  parseOfficeStagingProviders,
  runOfficeStagingProof,
} from "../staging/run-staging-proof.js";

const providers: OfficeProviderId[] = ["gemini", "claude", "chatgpt"];
const fixedDate = new Date("2026-08-09T08:00:00.000Z");

function outputPackage(provider: OfficeProviderId, requestId: string) {
  return {
    artifact: {
      type: "Decision Memo",
      title: "Decision Memo - Fictional Marketing Operating Model",
    },
    status: "Draft / Review Candidate",
    targetSystem: "Microsoft Word / SharePoint",
    owner: "[to be assigned]",
    decisionRequired: "Choose an operating-model review candidate.",
    managementSummary: "A fictional company needs clearer public-facing marketing decision rights.",
    options: [
      {
        name: "Centralized",
        summary: "Use one central team.",
        benefits: ["Consistency"],
        risks: ["Lower local flexibility"],
      },
      {
        name: "Federated",
        summary: "Use shared standards with local execution.",
        benefits: ["Responsiveness"],
        risks: ["Interface discipline required"],
      },
    ],
    recommendation: "Review the federated option.",
    rationale: ["Balances standards and local context"],
    assumptions: ["The scenario is synthetic"],
    openPoints: ["Assign a real owner during human review"],
    internalValidationRequired: ["Validate against approved internal records before use"],
    sourceEvidenceStatus: "Synthetic GREEN test input only.",
    recommendedNextAction: "Human review in Microsoft 365.",
    excludedInformation: ["Personal data", "Customer data"],
    sensitivity: "GREEN",
    providerMetadata: {
      provider,
      modelConfiguration: `${provider}-staging-test-model`,
      requestId,
      traceId: `${provider}-trace`,
      generatedAt: fixedDate.toISOString(),
    },
    validationState: "unvalidated",
    humanReviewRequired: true,
    autonomousPublication: false,
  };
}

export async function runOfficeStagingProofAcceptance(): Promise<void> {
  assert.deepEqual(
    parseOfficeStagingProviders("chatgpt,gemini,claude"),
    providers,
  );
  assert.throws(
    () => parseOfficeStagingProviders("gemini,gemini"),
    /duplicates/,
  );
  assert.throws(
    () => parseOfficeStagingProviders("unknown"),
    /Unknown/,
  );

  const requests: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/health") {
      return Response.json({ service: "phoenix-office-companion", status: "ok" });
    }
    if (url.pathname === "/ready") {
      return Response.json({
        service: "phoenix-office-companion",
        status: "ready",
        operationalProviders: providers,
        liveProviderExecution: true,
      });
    }
    if (url.pathname === "/v1/complete") {
      const request = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      requests.push(request);
      const provider = request.preferredProvider as OfficeProviderId;
      const requestId = request.requestId as string;
      return Response.json({
        requestId,
        routingDecision: {
          status: "selected",
          provider,
          eligibleProviders: [provider],
          fallbackProviders: [],
          reason: `Selected explicit eligible provider preference: ${provider}.`,
          score: 0.5,
        },
        provider: {
          id: provider,
          modelConfiguration: `${provider}-staging-test-model`,
          status: "completed",
          safetyStatus: "passed",
          warnings: [],
          citationCount: 0,
          usage: {
            inputUnits: 100,
            outputUnits: 200,
            totalUnits: 300,
            latencyMs: 500,
          },
          traceId: `${provider}-trace`,
          generatedAt: fixedDate.toISOString(),
        },
        outputPackage: outputPackage(provider, requestId),
      });
    }
    return Response.json({ status: "error" }, { status: 404 });
  };

  const evidenceDirectory = await mkdtemp(
    path.join(os.tmpdir(), "phoenix-office-staging-"),
  );
  try {
    const summary = await runOfficeStagingProof({
      baseUrl: "http://127.0.0.1:18080",
      providers,
      evidenceDirectory,
      fetchImpl,
      now: () => fixedDate,
      gitSha: "test-sha",
      workflowRunId: "test-run",
      environmentName: "office-companion-staging-test",
      allowInsecureForTests: true,
    });

    assert.equal(summary.passed, true);
    assert.equal(summary.providers.length, 3);
    assert.equal(requests.length, 3);
    for (const request of requests) {
      assert.equal(request.dataClass, "green");
      assert.equal(request.sanitizationState, "not-required");
      assert.equal(request.allowFallback, false);
      assert.equal(
        (request.validationRequirements as Record<string, unknown>)
          .humanReviewRequired,
        true,
      );
      assert.deepEqual(request.allowedProviders, [request.preferredProvider]);
    }

    const summaryJson = JSON.parse(
      await readFile(path.join(evidenceDirectory, "summary.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(summaryJson.artifactId, "PHX-COMP-OFFICE-006");
    assert.equal(summaryJson.dataClass, "green");

    const allEvidence = await Promise.all(
      [
        "summary.json",
        "gemini-request.json",
        "claude-request.json",
        "chatgpt-request.json",
      ].map((file) => readFile(path.join(evidenceDirectory, file), "utf8")),
    );
    assert.equal(
      allEvidence.join("\n").includes("API_KEY"),
      false,
      "Evidence must not contain provider credential fields.",
    );
  } finally {
    await rm(evidenceDirectory, { recursive: true, force: true });
  }
}
