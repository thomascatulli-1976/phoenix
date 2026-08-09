import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { OfficeCompletionResult } from "../completion-service.js";
import type { OfficeProviderId, OfficeTaskRequest } from "../contracts.js";
import {
  evaluateOfficeCompletion,
  type OfficeProviderEvaluation,
} from "../evaluation.js";

const canonicalProviders: OfficeProviderId[] = ["gemini", "claude", "chatgpt"];
const defaultTimeoutMs = 120_000;

export interface OfficeStagingProofOptions {
  baseUrl: string;
  providers: OfficeProviderId[];
  evidenceDirectory: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
  gitSha?: string;
  workflowRunId?: string;
  environmentName?: string;
  allowInsecureForTests?: boolean;
}

export interface OfficeStagingProviderSummary {
  provider: OfficeProviderId;
  status: "passed" | "failed";
  weightedOverallScore?: number;
  blockingFailures?: string[];
  providerTraceId?: string;
  error?: string;
}

export interface OfficeStagingProofSummary {
  schemaVersion: "1.0";
  artifactId: "PHX-COMP-OFFICE-006";
  generatedAt: string;
  environmentName: string;
  gitSha: string;
  workflowRunId: string;
  baseUrlHost: string;
  dataClass: "green";
  providers: OfficeStagingProviderSummary[];
  passed: boolean;
}

interface JsonRecord {
  [key: string]: unknown;
}

function normalizeBaseUrl(value: string, allowInsecureForTests: boolean): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(allowInsecureForTests && url.protocol === "http:")) {
    throw new Error("Staging proof requires an HTTPS endpoint.");
  }
  return url.toString().replace(/\/$/, "");
}

export function parseOfficeStagingProviders(value: string): OfficeProviderId[] {
  const entries = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error("At least one staging proof provider is required.");
  }
  if (new Set(entries).size !== entries.length) {
    throw new Error("Staging proof provider list contains duplicates.");
  }
  for (const entry of entries) {
    if (!canonicalProviders.includes(entry as OfficeProviderId)) {
      throw new Error(`Unknown staging proof provider: ${entry}.`);
    }
  }
  return canonicalProviders.filter((provider) => entries.includes(provider));
}

function createGreenProofRequest(
  provider: OfficeProviderId,
  generatedAt: string,
  workflowRunId: string,
): OfficeTaskRequest {
  return {
    requestId: `office-staging-${workflowRunId}-${provider}`,
    operatingMode: "build",
    task: "Create a decision memo for a fictional public organizational-design scenario",
    intendedOutcome: "A Microsoft-ready review candidate for provider comparison",
    input:
      "Synthetic GREEN scenario: A fictional mid-sized industrial company operates through several business units. Public-facing marketing responsibilities overlap, decision rights are unclear, and leaders want options for a clearer operating model. No real company, person, customer, contract, financial figure, internal URL or confidential fact is represented.",
    contextReferences: ["synthetic:office-staging-green-v1"],
    dataClass: "green",
    sanitizationState: "not-required",
    excludedInformation: [
      "Real company names",
      "Personal data",
      "Customer data",
      "Contracts",
      "Confidential financial figures",
      "Internal URLs",
      "Trade secrets",
    ],
    requiredCapabilities: [
      "reasoning",
      "document-drafting",
      "structured-output",
      "microsoft-ready-output",
    ],
    allowedProviders: [provider],
    preferredProvider: provider,
    allowFallback: false,
    outputSchema: "microsoft-ready-decision-memo-v1",
    evidenceRequirements: {
      citationsRequired: false,
      approvedSourceIds: [],
    },
    validationRequirements: {
      humanReviewRequired: true,
      internalValidationRequired: true,
      approvalRole: "Document owner",
    },
    toolPermissions: [],
    createdAt: generatedAt,
  };
}

async function fetchJson(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<{ response: Response; body: JsonRecord }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    let body: JsonRecord;
    try {
      body = (await response.json()) as JsonRecord;
    } catch {
      body = { status: "error", message: "Endpoint returned non-JSON content." };
    }
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function validateCompletion(
  provider: OfficeProviderId,
  result: OfficeCompletionResult,
): void {
  if (result.routingDecision.status !== "selected" || result.routingDecision.provider !== provider) {
    throw new Error(`Routing did not select the explicitly requested provider ${provider}.`);
  }
  if (result.provider.id !== provider || result.provider.status !== "completed") {
    throw new Error(`Provider ${provider} did not return a completed normalized result.`);
  }
  const output = result.outputPackage;
  if (
    output.status !== "Draft / Review Candidate" ||
    output.targetSystem !== "Microsoft Word / SharePoint" ||
    output.validationState !== "unvalidated" ||
    output.humanReviewRequired !== true ||
    output.autonomousPublication !== false ||
    output.sensitivity !== "GREEN"
  ) {
    throw new Error(`Provider ${provider} violated the staging governance package boundary.`);
  }
}

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}

async function writeJsonFile(directory: string, fileName: string, value: unknown): Promise<void> {
  await writeFile(path.join(directory, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createMarkdown(summary: OfficeStagingProofSummary): string {
  const rows = summary.providers.map((entry) => {
    const score = entry.weightedOverallScore === undefined ? "-" : entry.weightedOverallScore.toFixed(3);
    const blockers = entry.blockingFailures?.join(", ") || "none";
    return `| ${entry.provider} | ${entry.status} | ${score} | ${blockers} |`;
  });

  return [
    "# Phoenix Office Companion staging proof",
    "",
    `- Artifact: ${summary.artifactId}`,
    `- Generated: ${summary.generatedAt}`,
    `- Environment: ${summary.environmentName}`,
    `- Commit: ${summary.gitSha}`,
    `- Workflow run: ${summary.workflowRunId}`,
    `- Data class: ${summary.dataClass}`,
    `- Overall result: ${summary.passed ? "PASS" : "FAIL"}`,
    "",
    "| Provider | Result | Weighted score | Blocking failures |",
    "|---|---:|---:|---|",
    ...rows,
    "",
    "All outputs remain Draft / Review Candidate, unvalidated, human-review-required and non-publishing.",
    "",
  ].join("\n");
}

export async function runOfficeStagingProof(
  options: OfficeStagingProofOptions,
): Promise<OfficeStagingProofSummary> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const now = options.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const baseUrl = normalizeBaseUrl(
    options.baseUrl,
    options.allowInsecureForTests ?? false,
  );
  const evidenceDirectory = path.resolve(options.evidenceDirectory);
  await mkdir(evidenceDirectory, { recursive: true });

  const health = await fetchJson(fetchImpl, `${baseUrl}/health`, undefined, timeoutMs);
  if (!health.response.ok || health.body.status !== "ok") {
    throw new Error(`Staging health check failed with HTTP ${health.response.status}.`);
  }

  const readiness = await fetchJson(fetchImpl, `${baseUrl}/ready`, undefined, timeoutMs);
  if (!readiness.response.ok || readiness.body.status !== "ready") {
    throw new Error(`Staging readiness check failed with HTTP ${readiness.response.status}.`);
  }
  const operationalProviders = Array.isArray(readiness.body.operationalProviders)
    ? readiness.body.operationalProviders
    : [];
  for (const provider of options.providers) {
    if (!operationalProviders.includes(provider)) {
      throw new Error(`Provider ${provider} is not operational in staging readiness output.`);
    }
  }

  const providerSummaries: OfficeStagingProviderSummary[] = [];
  const workflowRunId = options.workflowRunId ?? "local";

  for (const provider of options.providers) {
    const request = createGreenProofRequest(provider, generatedAt, workflowRunId);
    await writeJsonFile(evidenceDirectory, `${provider}-request.json`, request);

    try {
      const completion = await fetchJson(
        fetchImpl,
        `${baseUrl}/v1/complete`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
        },
        timeoutMs,
      );
      await writeJsonFile(evidenceDirectory, `${provider}-response.json`, completion.body);
      if (!completion.response.ok) {
        throw new Error(`Provider ${provider} completion failed with HTTP ${completion.response.status}.`);
      }

      const result = completion.body as unknown as OfficeCompletionResult;
      validateCompletion(provider, result);
      const evaluation: OfficeProviderEvaluation = evaluateOfficeCompletion({
        testCaseId: "office-staging-green-v1",
        request,
        result,
        evaluatedAt: generatedAt,
      });
      await writeJsonFile(evidenceDirectory, `${provider}-evaluation.json`, evaluation);

      providerSummaries.push({
        provider,
        status: evaluation.passed ? "passed" : "failed",
        weightedOverallScore: evaluation.weightedOverallScore,
        blockingFailures: evaluation.blockingFailures,
        providerTraceId: result.provider.traceId,
        error: evaluation.passed
          ? undefined
          : "Evaluation contains blocking failures.",
      });
    } catch (error) {
      providerSummaries.push({
        provider,
        status: "failed",
        error: safeError(error),
      });
      await writeJsonFile(evidenceDirectory, `${provider}-error.json`, {
        provider,
        error: safeError(error),
        generatedAt,
      });
    }
  }

  const summary: OfficeStagingProofSummary = {
    schemaVersion: "1.0",
    artifactId: "PHX-COMP-OFFICE-006",
    generatedAt,
    environmentName: options.environmentName ?? "office-companion-staging",
    gitSha: options.gitSha ?? "unknown",
    workflowRunId,
    baseUrlHost: new URL(baseUrl).host,
    dataClass: "green",
    providers: providerSummaries,
    passed:
      providerSummaries.length === options.providers.length &&
      providerSummaries.every((entry) => entry.status === "passed"),
  };

  await writeJsonFile(evidenceDirectory, "health.json", health.body);
  await writeJsonFile(evidenceDirectory, "readiness.json", readiness.body);
  await writeJsonFile(evidenceDirectory, "summary.json", summary);
  await writeFile(path.join(evidenceDirectory, "summary.md"), createMarkdown(summary), "utf8");

  if (!summary.passed) {
    throw new Error("One or more Office Companion staging provider proofs failed.");
  }
  return summary;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const providers = parseOfficeStagingProviders(
    process.env.OFFICE_COMPANION_PROOF_PROVIDERS ?? "",
  );
  runOfficeStagingProof({
    baseUrl: process.env.OFFICE_COMPANION_BASE_URL ?? "",
    providers,
    evidenceDirectory:
      process.env.OFFICE_COMPANION_EVIDENCE_DIR ?? "artifacts/office-staging-evidence",
    gitSha: process.env.GITHUB_SHA,
    workflowRunId: process.env.GITHUB_RUN_ID,
    environmentName: process.env.OFFICE_COMPANION_ENVIRONMENT_NAME,
  })
    .then((summary) => {
      console.log(
        `PASS Office Companion staging proof: ${summary.providers
          .map((entry) => entry.provider)
          .join(", ")}`,
      );
    })
    .catch((error) => {
      console.error(`FAIL Office Companion staging proof: ${safeError(error)}`);
      process.exitCode = 1;
    });
}
