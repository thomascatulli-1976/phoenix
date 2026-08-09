import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { OfficeProviderId } from "../contracts.js";

const canonicalProviders: OfficeProviderId[] = ["gemini", "claude", "chatgpt"];
const forbiddenPatterns: Array<{ name: string; pattern: RegExp }> = [
  { name: "authorization-header", pattern: /authorization\s*[:=]\s*[^\s\"']+/i },
  { name: "bearer-token", pattern: /bearer\s+[a-z0-9._~-]{16,}/i },
  { name: "x-api-key", pattern: /x-api-key\s*[:=]\s*[^\s\"']+/i },
  { name: "x-goog-api-key", pattern: /x-goog-api-key\s*[:=]\s*[^\s\"']+/i },
  { name: "openai-key-prefix", pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/ },
  { name: "google-key-prefix", pattern: /\bAIza[A-Za-z0-9_-]{20,}\b/ },
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "client-secret-label", pattern: /client[_-]?secret\s*[:=]\s*[^\s\"']+/i },
  { name: "provider-secret-variable", pattern: /(?:GEMINI_API_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY)\s*[:=]\s*[^\s\"']+/i },
];

interface JsonRecord {
  [key: string]: unknown;
}

interface StagingSummary {
  artifactId?: string;
  gitSha?: string;
  workflowRunId?: string;
  dataClass?: string;
  passed?: boolean;
  providers?: Array<{
    provider?: string;
    status?: string;
    weightedOverallScore?: number;
    blockingFailures?: unknown[];
  }>;
}

export interface OfficeEvidenceReviewProvider {
  provider: OfficeProviderId;
  sourceStatus: string;
  weightedOverallScore?: number;
  blockingFailures: string[];
  checksPassed: boolean;
}

export interface OfficeEvidenceReviewReport {
  schemaVersion: "1.0";
  artifactId: "PHX-COMP-OFFICE-008";
  sourceArtifactId: string;
  sourceGitSha: string;
  sourceWorkflowRunId: string;
  reviewedAt: string;
  providers: OfficeEvidenceReviewProvider[];
  blockingFailures: string[];
  leakFindings: Array<{ file: string; pattern: string }>;
  status: "ELIGIBLE_FOR_HUMAN_REVIEW" | "REJECTED_AUTOMATICALLY";
  promotionEligible: boolean;
  humanDecisionRequired: true;
  routingScoresUpdated: false;
}

async function readJson(filePath: string): Promise<JsonRecord> {
  return JSON.parse(await readFile(filePath, "utf8")) as JsonRecord;
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function requireCondition(condition: boolean, failures: string[], message: string): void {
  if (!condition) failures.push(message);
}

async function scanEvidence(directory: string): Promise<Array<{ file: string; pattern: string }>> {
  const findings: Array<{ file: string; pattern: string }> = [];
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json") || file.endsWith(".md"));
  for (const file of files) {
    const content = await readFile(path.join(directory, file), "utf8");
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(content)) findings.push({ file, pattern: forbidden.name });
    }
  }
  return findings;
}

export async function reviewOfficeStagingEvidence(
  evidenceDirectory: string,
  now: () => Date = () => new Date(),
): Promise<OfficeEvidenceReviewReport> {
  const directory = path.resolve(evidenceDirectory);
  const failures: string[] = [];
  const summary = (await readJson(path.join(directory, "summary.json"))) as StagingSummary;

  requireCondition(summary.artifactId === "PHX-COMP-OFFICE-006", failures, "Source artifact must be PHX-COMP-OFFICE-006.");
  requireCondition(summary.dataClass === "green", failures, "Evidence promotion gate currently accepts GREEN evidence only.");
  requireCondition(summary.passed === true, failures, "Staging summary must have passed.");
  requireCondition(typeof summary.gitSha === "string" && summary.gitSha.length > 0 && summary.gitSha !== "unknown", failures, "Source Git SHA is required.");
  requireCondition(typeof summary.workflowRunId === "string" && summary.workflowRunId.length > 0 && summary.workflowRunId !== "local", failures, "Source workflow run ID is required.");

  const summaries = new Map(
    (summary.providers ?? []).map((entry) => [entry.provider, entry]),
  );
  const providers: OfficeEvidenceReviewProvider[] = [];

  for (const provider of canonicalProviders) {
    const source = summaries.get(provider);
    if (!source) {
      failures.push(`Missing provider summary: ${provider}.`);
      providers.push({ provider, sourceStatus: "missing", blockingFailures: ["missing-provider"], checksPassed: false });
      continue;
    }

    const providerFailures: string[] = [];
    requireCondition(source.status === "passed", providerFailures, `${provider}: source status must be passed.`);
    const summaryBlocking = asStringArray(source.blockingFailures);
    requireCondition(summaryBlocking.length === 0, providerFailures, `${provider}: source summary contains blocking failures.`);

    const request = await readJson(path.join(directory, `${provider}-request.json`));
    requireCondition(request.dataClass === "green", providerFailures, `${provider}: request dataClass must be green.`);
    requireCondition(request.allowFallback === false, providerFailures, `${provider}: fallback must be disabled.`);
    requireCondition(request.preferredProvider === provider, providerFailures, `${provider}: preferred provider mismatch.`);
    requireCondition(Array.isArray(request.allowedProviders) && request.allowedProviders.length === 1 && request.allowedProviders[0] === provider, providerFailures, `${provider}: allowedProviders must contain only the explicit provider.`);
    const validation = asRecord(request.validationRequirements);
    requireCondition(validation.humanReviewRequired === true, providerFailures, `${provider}: request must require human review.`);

    const response = await readJson(path.join(directory, `${provider}-response.json`));
    const output = asRecord(response.outputPackage);
    const normalizedProvider = asRecord(response.provider);
    requireCondition(normalizedProvider.id === provider, providerFailures, `${provider}: normalized provider mismatch.`);
    requireCondition(output.status === "Draft / Review Candidate", providerFailures, `${provider}: output status drift.`);
    requireCondition(output.validationState === "unvalidated", providerFailures, `${provider}: validation state drift.`);
    requireCondition(output.humanReviewRequired === true, providerFailures, `${provider}: human review boundary drift.`);
    requireCondition(output.autonomousPublication === false, providerFailures, `${provider}: autonomous publication must remain false.`);
    requireCondition(output.sensitivity === "GREEN", providerFailures, `${provider}: output sensitivity must be GREEN.`);

    const evaluation = await readJson(path.join(directory, `${provider}-evaluation.json`));
    const evaluationBlocking = asStringArray(evaluation.blockingFailures);
    requireCondition(evaluation.passed === true, providerFailures, `${provider}: evaluation must pass.`);
    requireCondition(evaluationBlocking.length === 0, providerFailures, `${provider}: evaluation contains blocking failures.`);

    failures.push(...providerFailures);
    providers.push({
      provider,
      sourceStatus: String(source.status ?? "unknown"),
      weightedOverallScore:
        typeof source.weightedOverallScore === "number" ? source.weightedOverallScore : undefined,
      blockingFailures: [...summaryBlocking, ...evaluationBlocking, ...providerFailures],
      checksPassed: providerFailures.length === 0,
    });
  }

  const leakFindings = await scanEvidence(directory);
  for (const finding of leakFindings) {
    failures.push(`Potential secret leakage detected in ${finding.file}: ${finding.pattern}.`);
  }

  const uniqueFailures = [...new Set(failures)];
  const promotionEligible = uniqueFailures.length === 0;
  return {
    schemaVersion: "1.0",
    artifactId: "PHX-COMP-OFFICE-008",
    sourceArtifactId: String(summary.artifactId ?? "unknown"),
    sourceGitSha: String(summary.gitSha ?? "unknown"),
    sourceWorkflowRunId: String(summary.workflowRunId ?? "unknown"),
    reviewedAt: now().toISOString(),
    providers,
    blockingFailures: uniqueFailures,
    leakFindings,
    status: promotionEligible ? "ELIGIBLE_FOR_HUMAN_REVIEW" : "REJECTED_AUTOMATICALLY",
    promotionEligible,
    humanDecisionRequired: true,
    routingScoresUpdated: false,
  };
}

async function writeReport(directory: string, report: OfficeEvidenceReviewReport): Promise<void> {
  await writeFile(path.join(directory, "evidence-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const markdown = [
    "# Phoenix Office Companion evidence review",
    "",
    `- Gate: ${report.artifactId}`,
    `- Source run: ${report.sourceWorkflowRunId}`,
    `- Source commit: ${report.sourceGitSha}`,
    `- Status: ${report.status}`,
    `- Human decision required: ${report.humanDecisionRequired}`,
    `- Routing scores updated: ${report.routingScoresUpdated}`,
    "",
    "| Provider | Checks | Source score |",
    "|---|---:|---:|",
    ...report.providers.map((entry) => `| ${entry.provider} | ${entry.checksPassed ? "PASS" : "FAIL"} | ${entry.weightedOverallScore ?? "-"} |`),
    "",
    report.blockingFailures.length === 0
      ? "No automated blocking failure detected. Evidence is eligible for human review only."
      : `Blocking failures:\n${report.blockingFailures.map((failure) => `- ${failure}`).join("\n")}`,
    "",
  ].join("\n");
  await writeFile(path.join(directory, "evidence-review.md"), markdown, "utf8");
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const directory = process.env.OFFICE_COMPANION_EVIDENCE_DIR ?? "artifacts/office-staging-evidence";
  reviewOfficeStagingEvidence(directory)
    .then(async (report) => {
      await writeReport(path.resolve(directory), report);
      if (!report.promotionEligible) {
        console.error(`FAIL Office Companion evidence review: ${report.blockingFailures.join(" | ")}`);
        process.exitCode = 1;
        return;
      }
      console.log("PASS Office Companion evidence review: eligible for human review; routing scores unchanged.");
    })
    .catch((error) => {
      console.error(`FAIL Office Companion evidence review: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
