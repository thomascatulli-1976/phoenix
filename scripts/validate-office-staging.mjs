import fs from "node:fs";

const requiredFiles = [
  "infra/office-companion/staging/main.bicep",
  "infra/office-companion/staging/main.parameters.example.json",
  "infra/office-companion/staging/README.md",
  ".github/workflows/office-companion-staging.yml",
  "src/companions/office-companion/staging/run-staging-proof.ts",
  "src/companions/office-companion/fixtures/staging-proof-acceptance.ts",
  "src/companions/office-companion/fixtures/run-staging-proof-acceptance.ts",
];

const failures = [];
const fail = (message) => failures.push(message);
const read = (file) => fs.readFileSync(file, "utf8");

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing staging file: ${file}`);
}

if (failures.length === 0) {
  const bicep = read("infra/office-companion/staging/main.bicep");
  for (const token of [
    "Microsoft.App/containerApps",
    "Microsoft.App/managedEnvironments",
    "Microsoft.ContainerRegistry/registries",
    "Microsoft.ManagedIdentity/userAssignedIdentities",
    "Microsoft.KeyVault/vaults",
    "7f951dda-4ed3-4680-a7ca-43fe172d538d",
    "4633458b-17de-408a-b874-0445c86b69e6",
    "keyVaultUrl",
    "identity: runtimeIdentity.id",
    "path: '/health'",
    "path: '/ready'",
    "allowInsecure: false",
    "activeRevisionsMode: 'Multiple'",
  ]) {
    if (!bicep.includes(token)) fail(`Staging Bicep is missing required control: ${token}`);
  }
  if (bicep.includes("latest")) {
    fail("Staging Bicep must not hard-code a mutable latest application image tag");
  }

  const workflow = read(".github/workflows/office-companion-staging.yml");
  for (const token of [
    "workflow_dispatch:",
    "environment: office-companion-staging",
    "id-token: write",
    "azure/login@v3",
    "GITHUB_SHA",
    "az acr build",
    "actions/upload-artifact@v4",
    "OFFICE_COMPANION_PROOF_PROVIDERS",
    "confirm_deploy",
  ]) {
    if (!workflow.includes(token)) fail(`Staging workflow is missing required control: ${token}`);
  }
  for (const prohibited of [
    "AZURE_CREDENTIALS",
    "GEMINI_API_KEY:",
    "ANTHROPIC_API_KEY:",
    "OPENAI_API_KEY:",
    "client-secret",
  ]) {
    if (workflow.includes(prohibited)) {
      fail(`Staging workflow contains prohibited credential pattern: ${prohibited}`);
    }
  }
  if (/\npush:|\npull_request:/.test(workflow)) {
    fail("Live staging deployment workflow must remain manual-only");
  }

  const proof = read(
    "src/companions/office-companion/staging/run-staging-proof.ts",
  );
  for (const token of [
    'dataClass: "green"',
    'sanitizationState: "not-required"',
    "preferredProvider: provider",
    "allowFallback: false",
    "evaluateOfficeCompletion",
    'validationState !== "unvalidated"',
    "autonomousPublication !== false",
  ]) {
    if (!proof.includes(token)) fail(`Staging proof runner is missing: ${token}`);
  }
  if (proof.includes('dataClass: "yellow"') || proof.includes('dataClass: "red"')) {
    fail("Initial live staging proof must remain GREEN-only");
  }

  const parameters = JSON.parse(
    read("infra/office-companion/staging/main.parameters.example.json"),
  );
  if (parameters.parameters?.deployContainerApp?.value !== false) {
    fail("Example staging parameters must not deploy the application by default");
  }
  if ((parameters.parameters?.enabledProviders?.value ?? []).length !== 0) {
    fail("Example staging parameters must enable no provider by default");
  }
}

if (failures.length > 0) {
  console.error("Phoenix Office Companion staging validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Phoenix Office Companion staging definitions are valid and remain manual, OIDC-authenticated, Key-Vault-backed and GREEN-data-only.",
);
