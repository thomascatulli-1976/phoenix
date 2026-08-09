import fs from "node:fs";

const configPath = "config/office-companion.json";
const requiredFiles = [
  "Dockerfile",
  ".dockerignore",
  ".env.example",
  "tsconfig.build.json",
  "docs/companions/office-companion/README.md",
  "docs/companions/office-companion/STAGING-ADMIN-HANDOFF.md",
  "src/companions/office-companion/contracts.ts",
  "src/companions/office-companion/provider-registry.ts",
  "src/companions/office-companion/router.ts",
  "src/companions/office-companion/runtime-providers.ts",
  "src/companions/office-companion/completion-service.ts",
  "src/companions/office-companion/evaluation.ts",
  "src/companions/office-companion/server.ts",
  "src/companions/office-companion/adapters/gemini-adapter.ts",
  "src/companions/office-companion/adapters/claude-adapter.ts",
  "src/companions/office-companion/adapters/chatgpt-adapter.ts",
  "src/companions/office-companion/workflows/microsoft-ready-output.ts",
  "src/companions/office-companion/workflows/microsoft-ready-prompt.ts",
  "src/companions/office-companion/staging/run-staging-proof.ts",
  "src/companions/office-companion/fixtures/acceptance-suite.ts",
  "src/companions/office-companion/fixtures/server-smoke.ts",
  "src/companions/office-companion/fixtures/gemini-adapter-acceptance.ts",
  "src/companions/office-companion/fixtures/multi-provider-acceptance.ts",
  "src/companions/office-companion/fixtures/staging-proof-acceptance.ts",
  "infra/office-companion/staging/main.bicep",
  ".github/workflows/office-companion.yml",
  ".github/workflows/office-companion-staging.yml",
];

const failures = [];
const fail = (message) => failures.push(message);
const read = (file) => fs.readFileSync(file, "utf8");

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing Office Companion file: ${file}`);
}

if (failures.length === 0) {
  const cfg = JSON.parse(read(configPath));
  const companion = cfg.companion ?? {};
  const strategy = cfg.llmStrategy ?? {};
  const hosting = cfg.runtimeHosting ?? {};
  const workflow = cfg.controlledWorkflow ?? {};
  const evaluation = cfg.evaluationFramework ?? {};
  const staging = cfg.stagingDeployment ?? {};
  const stagingAdministration = cfg.stagingAdministration ?? {};
  const execution = cfg.executionPolicy ?? {};
  const dataGate = cfg.dataGate ?? {};
  const canonicalProviders = ["gemini", "claude", "chatgpt"];

  if (cfg.schemaVersion !== "1.4") fail("Office Companion schema version must be 1.4");
  if (companion.id !== "phoenix-office-companion") fail("Companion ID is invalid");
  if (companion.registryKey !== "phx:companion:office-companion") fail("Companion registry key is invalid");
  if (companion.type !== "specialized-companion") fail("Office Companion must remain a specialized companion");
  if (companion.parentProduct !== "Phoenix One") fail("Office Companion parent product must be Phoenix One");
  if (companion.parentRuntime !== "Phoenix Companion Runtime") fail("Office Companion must use the Phoenix Companion Runtime");
  if (companion.executiveOffice !== "Billy") fail("Office Companion Executive Office must be Billy");
  if (companion.technicalRepository !== "thomascatulli-1976/phoenix") fail("Technical repository anchor is invalid");
  if (companion.canonicalDriveRootId !== "18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg") fail("Canonical Drive root is invalid");
  if (companion.canonicalDriveFolderId !== "11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z") fail("Canonical Drive folder is invalid");

  const expectedArtifacts = new Map([
    ["PHX-COMP-OFFICE-001", "1Sge32CnSoPyB_PBT2EV1GBCUNCRjmgLDH0-LPpSmYXc"],
    ["PHX-COMP-OFFICE-002", "1QMTbTHmlzd7eKfkqHfJAHHAZvtEk5FpZNpH48SFnqJc"],
    ["PHX-COMP-OFFICE-003", "14uQ9mabJupdvl4KMollPG2IHYgFEsuPnNyLhSrEqx14"],
    ["PHX-COMP-OFFICE-004", "1judeekl2lyh5LONT4Ad_wkhsf2Vqftq0A1pSVhzAilY"],
    ["PHX-COMP-OFFICE-005", "1-Mf73aav4l7OCvjUXgF26s_bxqLJT5z8e0qkJkKmvPU"],
    ["PHX-COMP-OFFICE-006", "18zeKeISjwexhOIr1YRTEJl_gorJrSjsg9J5qGOTYyfA"],
    ["PHX-COMP-OFFICE-007", "1TmBb66IJ7UDDHtmtKt0bdcWlGT09faSKcDGS6JwEotU"],
  ]);
  const artifactMap = new Map(
    (companion.canonicalArtifacts ?? []).map((artifact) => [artifact.id, artifact]),
  );
  if (artifactMap.size !== expectedArtifacts.size) fail("Canonical artifact set contains drift");
  for (const [id, driveFileId] of expectedArtifacts) {
    const artifact = artifactMap.get(id);
    if (!artifact) fail(`Missing canonical artifact: ${id}`);
    else if (artifact.driveFileId !== driveFileId) fail(`Drive file ID mismatch for ${id}`);
  }

  if (strategy.mode !== "provider-neutral") fail("LLM strategy must be provider-neutral");
  if (strategy.permanentDefaultProvider !== null) fail("A permanent default provider is prohibited");
  if (strategy.silentFallbackAllowed !== false) fail("Silent provider fallback must remain disabled");
  if (strategy.masterEnableEnvironmentVariable !== "OFFICE_COMPANION_ENABLE_LIVE_PROVIDER") fail("Master enable variable is invalid");
  if (strategy.enabledProvidersEnvironmentVariable !== "OFFICE_COMPANION_ENABLED_PROVIDERS") fail("Provider allowlist variable is invalid");

  const providers = strategy.providers ?? [];
  if (JSON.stringify(providers.map((provider) => provider.id)) !== JSON.stringify(canonicalProviders)) {
    fail("Provider registry must contain Gemini, Claude and ChatGPT in canonical order");
  }
  for (const provider of providers) {
    if (provider.status !== "registered") fail(`${provider.id} must not be statically available`);
    if (provider.adapterState !== "implemented") fail(`${provider.id} adapter must be implemented`);
    if (provider.credentialRequired !== true) fail(`${provider.id} must require deployment credentials`);
    if (JSON.stringify(provider.allowedDataClasses) !== JSON.stringify(["green", "yellow-sanitized"])) {
      fail(`${provider.id} data policy is invalid`);
    }
  }

  if (hosting.mode !== "stateless-container") fail("Hosting mode must be stateless-container");
  if (hosting.firstProductionTarget !== "azure-container-apps") fail("First target must be Azure Container Apps");
  if (hosting.portableContainerRuntime !== true) fail("Container runtime must remain portable");
  if (hosting.liveProviderExecution !== "credential-and-explicit-enable-gated") fail("Live execution gate is invalid");
  if (hosting.secretsLocation !== "deployment-secret-store-only") fail("Secrets must remain deployment-only");

  if (workflow.id !== "microsoft-ready-decision-memo-v1") fail("Controlled workflow ID is invalid");
  if (JSON.stringify(workflow.providers) !== JSON.stringify(canonicalProviders)) fail("Controlled provider set is invalid");
  if (workflow.outputStatus !== "Draft / Review Candidate") fail("Controlled output status is invalid");
  if (workflow.validationState !== "unvalidated") fail("Controlled output must remain unvalidated");
  if (workflow.humanReviewRequired !== true || workflow.autonomousPublication !== false) {
    fail("Human-review or publication boundary is invalid");
  }

  const expectedWeights = {
    schemaCompliance: 0.25,
    governanceCompliance: 0.25,
    contentCompleteness: 0.2,
    evidenceCompliance: 0.1,
    latencyEfficiency: 0.1,
    tokenEfficiency: 0.1,
    providerReliability: 0,
    explicitErrorBehavior: 0,
  };
  if (JSON.stringify(evaluation.weights) !== JSON.stringify(expectedWeights)) fail("Evaluation weights are invalid");
  if (JSON.stringify(evaluation.blockingDimensions) !== JSON.stringify(["schemaCompliance", "governanceCompliance", "evidenceCompliance"])) {
    fail("Evaluation blocking dimensions are invalid");
  }
  if (evaluation.productionScoresMayBeInvented !== false) fail("Production scores may not be invented");

  const expectedStaging = {
    status: "prepared-not-provisioned",
    target: "azure-container-apps",
    githubEnvironment: "office-companion-staging",
    deploymentWorkflow: ".github/workflows/office-companion-staging.yml",
    authentication: "github-oidc",
    containerRegistry: "azure-container-registry",
    containerImageTag: "git-sha",
    runtimeIdentity: "user-assigned-managed-identity",
    secretSource: "azure-key-vault-references",
    proofDataClass: "green",
    proofProviders: canonicalProviders,
    fallbackAllowed: false,
    evidencePromotionRequiresHumanReview: true,
    microsoftGraphWrites: false,
  };
  for (const [key, value] of Object.entries(expectedStaging)) {
    if (JSON.stringify(staging[key]) !== JSON.stringify(value)) {
      fail(`Staging configuration is invalid: ${key}`);
    }
  }

  const expectedStagingAdministration = {
    status: "external-prerequisites-required",
    runbookArtifact: "PHX-COMP-OFFICE-007",
    githubEnvironment: "office-companion-staging",
    requiredEnvironmentSecrets: [
      "AZURE_CLIENT_ID",
      "AZURE_TENANT_ID",
      "AZURE_SUBSCRIPTION_ID",
    ],
    oidcIssuer: "https://token.actions.githubusercontent.com",
    oidcAudience: "api://AzureADTokenExchange",
    expectedImmutableSubject:
      "repo:thomascatulli-1976@300130643/phoenix@1307927751:environment:office-companion-staging",
    liveProofStatus: "not-executed",
    providerEvidenceStatus: "none",
    productionAuthority: false,
    microsoftGraphAuthority: false,
  };
  for (const [key, value] of Object.entries(expectedStagingAdministration)) {
    if (JSON.stringify(stagingAdministration[key]) !== JSON.stringify(value)) {
      fail(`Staging administration configuration is invalid: ${key}`);
    }
  }

  if (dataGate.green !== "allowed-by-policy") fail("GREEN data policy is invalid");
  if (dataGate.yellow !== "requires-sanitization") fail("YELLOW data must require sanitization");
  if (dataGate.red !== "reject-external-provider-by-default") fail("RED data must be rejected");
  if (execution.failClosed !== true) fail("Office Companion must fail closed");
  if (execution.humanApprovalRequired !== true) fail("Human approval must remain required");
  for (const field of [
    "autonomousSending",
    "autonomousPublishing",
    "autonomousApproval",
    "consequentialExternalActions",
  ]) {
    if (execution[field] !== false) fail(`${field} must remain disabled`);
  }

  const serialized = JSON.stringify(cfg);
  for (const secretField of ["apiKey", "accessToken", "clientSecret", "privateKey"]) {
    if (serialized.includes(`\"${secretField}\"`)) fail(`Configuration contains prohibited field: ${secretField}`);
  }

  const dockerfile = read("Dockerfile");
  if (!dockerfile.includes("USER phoenix")) fail("Container must run as non-root phoenix user");
  if (!dockerfile.includes("HEALTHCHECK")) fail("Container health check is missing");

  const sourceChecks = {
    "src/companions/office-companion/router.ts": ["deterministicIndex", "request.requestId"],
    "src/companions/office-companion/evaluation.ts": ["blockingFailures", "weightedOverallScore"],
    "src/companions/office-companion/server.ts": ['url.pathname === "/v1/complete"'],
    "src/companions/office-companion/staging/run-staging-proof.ts": [
      'dataClass: "green"',
      "allowFallback: false",
      "evaluateOfficeCompletion",
    ],
    "docs/companions/office-companion/STAGING-ADMIN-HANDOFF.md": [
      "PHX-COMP-OFFICE-007",
      "office-companion-staging",
      "AZURE_CLIENT_ID",
      "AZURE_TENANT_ID",
      "AZURE_SUBSCRIPTION_ID",
      "Microsoft.Authorization/roleAssignments/write",
      "GREEN",
    ],
  };
  for (const [file, tokens] of Object.entries(sourceChecks)) {
    const source = read(file);
    for (const token of tokens) {
      if (!source.includes(token)) fail(`${file} is missing required control: ${token}`);
    }
  }

  const envExample = read(".env.example");
  if (!envExample.includes("OFFICE_COMPANION_ENABLE_LIVE_PROVIDER=false")) fail("Example environment must disable live providers");
  for (const variable of [
    "GEMINI_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
  ]) {
    if (!new RegExp(`^${variable}=$`, "m").test(envExample)) fail(`${variable} must remain empty in .env.example`);
  }

  const packageJson = JSON.parse(read("package.json"));
  for (const script of [
    "validate:office-staging",
    "acceptance:office-staging",
    "staging:office-proof",
  ]) {
    if (!packageJson.scripts?.[script]) fail(`Missing package script: ${script}`);
  }

  const ciWorkflow = read(".github/workflows/office-companion.yml");
  for (const token of [
    "validate:office-staging",
    "acceptance:office-staging",
    "infra/office-companion/staging/**",
  ]) {
    if (!ciWorkflow.includes(token)) fail(`CI workflow is missing staging gate: ${token}`);
  }
}

if (failures.length > 0) {
  console.error("Phoenix Office Companion validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Phoenix Office Companion governance configuration is valid: Billy ownership, seven Drive artifacts, three provider adapters, controlled evaluation, a prepared-but-not-provisioned GREEN-data staging gate and an explicit external administration handoff.",
);
