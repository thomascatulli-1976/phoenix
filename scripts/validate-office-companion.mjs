import fs from "node:fs";

const configPath = "config/office-companion.json";
const requiredFiles = [
  "Dockerfile",
  ".dockerignore",
  "tsconfig.build.json",
  "docs/companions/office-companion/README.md",
  "src/companions/office-companion/contracts.ts",
  "src/companions/office-companion/provider-registry.ts",
  "src/companions/office-companion/router.ts",
  "src/companions/office-companion/server.ts",
  "src/companions/office-companion/fixtures/acceptance-suite.ts",
  "src/companions/office-companion/fixtures/run-acceptance-suite.ts",
  "src/companions/office-companion/fixtures/server-smoke.ts",
  "src/companions/office-companion/fixtures/run-server-smoke.ts",
];

const failures = [];

if (!fs.existsSync(configPath)) {
  failures.push(`Missing configuration: ${configPath}`);
}

for (const path of requiredFiles) {
  if (!fs.existsSync(path)) failures.push(`Missing Office Companion file: ${path}`);
}

if (failures.length === 0) {
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const companion = cfg.companion ?? {};
  const strategy = cfg.llmStrategy ?? {};
  const hosting = cfg.runtimeHosting ?? {};
  const execution = cfg.executionPolicy ?? {};
  const dataGate = cfg.dataGate ?? {};

  if (companion.id !== "phoenix-office-companion") {
    failures.push("Companion ID must be phoenix-office-companion");
  }
  if (companion.registryKey !== "phx:companion:office-companion") {
    failures.push("Companion registry key is invalid");
  }
  if (companion.type !== "specialized-companion") {
    failures.push("Office Companion must remain a specialized companion");
  }
  if (companion.parentProduct !== "Phoenix One") {
    failures.push("Office Companion parent product must be Phoenix One");
  }
  if (companion.parentRuntime !== "Phoenix Companion Runtime") {
    failures.push("Office Companion must use the Phoenix Companion Runtime");
  }
  if (companion.executiveOffice !== "Billy") {
    failures.push("Office Companion Executive Office must be Billy");
  }
  if (companion.technicalRepository !== "thomascatulli-1976/phoenix") {
    failures.push("Office Companion technical repository anchor is invalid");
  }
  if (companion.canonicalDriveRootId !== "18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg") {
    failures.push("Office Companion canonical Drive root is invalid");
  }
  if (companion.canonicalDriveFolderId !== "11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z") {
    failures.push("Office Companion canonical Drive folder is invalid");
  }

  const artifactMap = new Map(
    (companion.canonicalArtifacts ?? []).map((artifact) => [artifact.id, artifact]),
  );
  const expectedArtifacts = new Map([
    ["PHX-COMP-OFFICE-001", "1Sge32CnSoPyB_PBT2EV1GBCUNCRjmgLDH0-LPpSmYXc"],
    ["PHX-COMP-OFFICE-002", "1QMTbTHmlzd7eKfkqHfJAHHAZvtEk5FpZNpH48SFnqJc"],
    ["PHX-COMP-OFFICE-003", "14uQ9mabJupdvl4KMollPG2IHYgFEsuPnNyLhSrEqx14"],
  ]);

  for (const [id, driveFileId] of expectedArtifacts) {
    const artifact = artifactMap.get(id);
    if (!artifact) failures.push(`Missing canonical artifact: ${id}`);
    else if (artifact.driveFileId !== driveFileId) {
      failures.push(`Drive file ID mismatch for ${id}`);
    }
  }

  if (strategy.mode !== "provider-neutral") {
    failures.push("LLM strategy must be provider-neutral");
  }
  if (strategy.permanentDefaultProvider !== null) {
    failures.push("A permanent default provider is prohibited");
  }
  if (strategy.silentFallbackAllowed !== false) {
    failures.push("Silent provider fallback must remain disabled");
  }

  const providers = strategy.providers ?? [];
  const providerIds = providers.map((provider) => provider.id);
  const requiredProviderIds = ["gemini", "claude", "chatgpt"];

  if (new Set(providerIds).size !== providerIds.length) {
    failures.push("Provider registry contains duplicate IDs");
  }
  if (JSON.stringify(providerIds) !== JSON.stringify(requiredProviderIds)) {
    failures.push("Provider registry must contain Gemini, Claude and ChatGPT in canonical order");
  }

  const validStatuses = new Set(["registered", "available", "unavailable", "disabled"]);
  for (const provider of providers) {
    if (!validStatuses.has(provider.status)) {
      failures.push(`Provider ${provider.id} has invalid status: ${provider.status}`);
    }
    if (provider.credentialRequired !== true) {
      failures.push(`Provider ${provider.id} must require deployment credentials`);
    }
    if ((provider.allowedDataClasses ?? []).includes("red")) {
      failures.push(`Provider ${provider.id} must not allow RED data in the foundation policy`);
    }
  }

  if (hosting.mode !== "stateless-container") {
    failures.push("Office Companion hosting mode must be stateless-container");
  }
  if (hosting.developmentRuntime !== "local-docker-compatible") {
    failures.push("Office Companion development runtime must be Docker-compatible");
  }
  if (hosting.ciRuntime !== "github-actions") {
    failures.push("Office Companion CI runtime must be GitHub Actions");
  }
  if (hosting.firstProductionTarget !== "azure-container-apps") {
    failures.push("First production target must be Azure Container Apps");
  }
  if (hosting.portableContainerRuntime !== true) {
    failures.push("The runtime must remain portable across compliant container platforms");
  }
  if (hosting.liveProviderExecution !== false) {
    failures.push("Live provider execution must remain disabled in the server foundation");
  }
  const expectedEndpoints = ["GET /health", "GET /ready", "POST /v1/route"];
  if (JSON.stringify(hosting.foundationEndpoints) !== JSON.stringify(expectedEndpoints)) {
    failures.push("Foundation endpoints are invalid or incomplete");
  }
  if (hosting.secretsLocation !== "deployment-secret-store-only") {
    failures.push("Secrets must remain in a deployment secret store only");
  }

  if (dataGate.green !== "allowed-by-policy") {
    failures.push("GREEN data-gate policy is invalid");
  }
  if (dataGate.yellow !== "requires-sanitization") {
    failures.push("YELLOW data must require sanitization");
  }
  if (dataGate.red !== "reject-external-provider-by-default") {
    failures.push("RED data must be rejected for external provider routing by default");
  }

  if (execution.failClosed !== true) failures.push("Office Companion must fail closed");
  if (execution.humanApprovalRequired !== true) {
    failures.push("Human approval must remain required");
  }
  if (execution.autonomousSending !== false) {
    failures.push("Autonomous sending must remain disabled");
  }
  if (execution.autonomousPublishing !== false) {
    failures.push("Autonomous publishing must remain disabled");
  }
  if (execution.autonomousApproval !== false) {
    failures.push("Autonomous approval must remain disabled");
  }
  if (execution.consequentialExternalActions !== false) {
    failures.push("Consequential external actions must remain disabled");
  }

  const serialized = JSON.stringify(cfg);
  const prohibitedSecretFields = ["apiKey", "accessToken", "clientSecret", "privateKey"];
  for (const field of prohibitedSecretFields) {
    if (serialized.includes(`\"${field}\"`)) {
      failures.push(`Configuration must not contain secret field: ${field}`);
    }
  }

  const dockerfile = fs.readFileSync("Dockerfile", "utf8");
  if (!dockerfile.includes("USER phoenix")) {
    failures.push("Runtime container must run as the non-root phoenix user");
  }
  if (!dockerfile.includes("HEALTHCHECK")) {
    failures.push("Runtime container must define a health check");
  }
  if (!dockerfile.includes("dist/companions/office-companion/server.js")) {
    failures.push("Runtime container entry point is invalid");
  }
}

if (failures.length > 0) {
  console.error("Phoenix Office Companion validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phoenix Office Companion governance configuration is valid.");
console.log(
  "Validated Billy ownership, Drive anchors, provider neutrality, stateless hosting and fail-closed execution.",
);
