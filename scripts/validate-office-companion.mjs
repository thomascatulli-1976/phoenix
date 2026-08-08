import fs from "node:fs";

const configPath = "config/office-companion.json";
const requiredFiles = [
  "Dockerfile",
  ".dockerignore",
  ".env.example",
  "tsconfig.build.json",
  "docs/companions/office-companion/README.md",
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
  "src/companions/office-companion/fixtures/acceptance-suite.ts",
  "src/companions/office-companion/fixtures/run-acceptance-suite.ts",
  "src/companions/office-companion/fixtures/server-smoke.ts",
  "src/companions/office-companion/fixtures/run-server-smoke.ts",
  "src/companions/office-companion/fixtures/gemini-adapter-acceptance.ts",
  "src/companions/office-companion/fixtures/run-gemini-adapter-acceptance.ts",
  "src/companions/office-companion/fixtures/multi-provider-acceptance.ts",
  "src/companions/office-companion/fixtures/run-multi-provider-acceptance.ts",
  ".github/workflows/office-companion.yml",
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return fs.readFileSync(path, "utf8");
}

if (!fs.existsSync(configPath)) {
  fail(`Missing configuration: ${configPath}`);
}

for (const path of requiredFiles) {
  if (!fs.existsSync(path)) fail(`Missing Office Companion file: ${path}`);
}

if (failures.length === 0) {
  const cfg = JSON.parse(read(configPath));
  const companion = cfg.companion ?? {};
  const strategy = cfg.llmStrategy ?? {};
  const hosting = cfg.runtimeHosting ?? {};
  const workflow = cfg.controlledWorkflow ?? {};
  const evaluation = cfg.evaluationFramework ?? {};
  const execution = cfg.executionPolicy ?? {};
  const dataGate = cfg.dataGate ?? {};

  if (cfg.schemaVersion !== "1.2") fail("Office Companion schema version must be 1.2");
  if (companion.id !== "phoenix-office-companion") fail("Companion ID must be phoenix-office-companion");
  if (companion.registryKey !== "phx:companion:office-companion") fail("Companion registry key is invalid");
  if (companion.type !== "specialized-companion") fail("Office Companion must remain a specialized companion");
  if (companion.parentProduct !== "Phoenix One") fail("Office Companion parent product must be Phoenix One");
  if (companion.parentRuntime !== "Phoenix Companion Runtime") fail("Office Companion must use the Phoenix Companion Runtime");
  if (companion.executiveOffice !== "Billy") fail("Office Companion Executive Office must be Billy");
  if (companion.technicalRepository !== "thomascatulli-1976/phoenix") fail("Office Companion technical repository anchor is invalid");
  if (companion.canonicalDriveRootId !== "18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg") fail("Office Companion canonical Drive root is invalid");
  if (companion.canonicalDriveFolderId !== "11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z") fail("Office Companion canonical Drive folder is invalid");

  const artifactMap = new Map(
    (companion.canonicalArtifacts ?? []).map((artifact) => [artifact.id, artifact]),
  );
  const expectedArtifacts = new Map([
    ["PHX-COMP-OFFICE-001", "1Sge32CnSoPyB_PBT2EV1GBCUNCRjmgLDH0-LPpSmYXc"],
    ["PHX-COMP-OFFICE-002", "1QMTbTHmlzd7eKfkqHfJAHHAZvtEk5FpZNpH48SFnqJc"],
    ["PHX-COMP-OFFICE-003", "14uQ9mabJupdvl4KMollPG2IHYgFEsuPnNyLhSrEqx14"],
    ["PHX-COMP-OFFICE-004", "1judeekl2lyh5LONT4Ad_wkhsf2Vqftq0A1pSVhzAilY"],
    ["PHX-COMP-OFFICE-005", "1-Mf73aav4l7OCvjUXgF26s_bxqLJT5z8e0qkJkKmvPU"],
  ]);
  if (artifactMap.size !== expectedArtifacts.size) {
    fail("Canonical Office Companion artifact set is incomplete or contains drift");
  }
  for (const [id, driveFileId] of expectedArtifacts) {
    const artifact = artifactMap.get(id);
    if (!artifact) fail(`Missing canonical artifact: ${id}`);
    else if (artifact.driveFileId !== driveFileId) fail(`Drive file ID mismatch for ${id}`);
  }

  if (strategy.mode !== "provider-neutral") fail("LLM strategy must be provider-neutral");
  if (strategy.permanentDefaultProvider !== null) fail("A permanent default provider is prohibited");
  if (strategy.silentFallbackAllowed !== false) fail("Silent provider fallback must remain disabled");
  if (strategy.masterEnableEnvironmentVariable !== "OFFICE_COMPANION_ENABLE_LIVE_PROVIDER") {
    fail("Master live-provider environment variable is invalid");
  }
  if (strategy.enabledProvidersEnvironmentVariable !== "OFFICE_COMPANION_ENABLED_PROVIDERS") {
    fail("Enabled-provider allowlist environment variable is invalid");
  }

  const providers = strategy.providers ?? [];
  const providerIds = providers.map((provider) => provider.id);
  const requiredProviderIds = ["gemini", "claude", "chatgpt"];
  if (new Set(providerIds).size !== providerIds.length) fail("Provider registry contains duplicate IDs");
  if (JSON.stringify(providerIds) !== JSON.stringify(requiredProviderIds)) {
    fail("Provider registry must contain Gemini, Claude and ChatGPT in canonical order");
  }

  const expectedProviderConfiguration = {
    gemini: {
      credentialEnvironmentVariable: "GEMINI_API_KEY",
      modelEnvironmentVariable: "GEMINI_MODEL",
      baseUrlEnvironmentVariable: "GEMINI_API_BASE_URL",
      timeoutEnvironmentVariable: "GEMINI_TIMEOUT_MS",
    },
    claude: {
      credentialEnvironmentVariable: "ANTHROPIC_API_KEY",
      modelEnvironmentVariable: "CLAUDE_MODEL",
      baseUrlEnvironmentVariable: "CLAUDE_API_BASE_URL",
      timeoutEnvironmentVariable: "CLAUDE_TIMEOUT_MS",
      apiVersionEnvironmentVariable: "ANTHROPIC_VERSION",
    },
    chatgpt: {
      credentialEnvironmentVariable: "OPENAI_API_KEY",
      modelEnvironmentVariable: "OPENAI_MODEL",
      baseUrlEnvironmentVariable: "OPENAI_API_BASE_URL",
      timeoutEnvironmentVariable: "OPENAI_TIMEOUT_MS",
    },
  };

  for (const provider of providers) {
    if (provider.status !== "registered") fail(`Provider ${provider.id} must remain registered, not statically available`);
    if (provider.adapterState !== "implemented") fail(`Provider ${provider.id} adapter must be implemented`);
    if (provider.credentialRequired !== true) fail(`Provider ${provider.id} must require deployment credentials`);
    if ((provider.allowedDataClasses ?? []).includes("red")) fail(`Provider ${provider.id} must not allow RED data`);
    if (JSON.stringify(provider.allowedDataClasses) !== JSON.stringify(["green", "yellow-sanitized"])) {
      fail(`Provider ${provider.id} data-class policy is invalid`);
    }

    const expected = expectedProviderConfiguration[provider.id];
    if (!expected) continue;
    for (const [field, value] of Object.entries(expected)) {
      if (provider[field] !== value) fail(`Provider ${provider.id} ${field} is invalid`);
    }
  }

  if (hosting.mode !== "stateless-container") fail("Office Companion hosting mode must be stateless-container");
  if (hosting.developmentRuntime !== "local-docker-compatible") fail("Office Companion development runtime must be Docker-compatible");
  if (hosting.ciRuntime !== "github-actions") fail("Office Companion CI runtime must be GitHub Actions");
  if (hosting.firstProductionTarget !== "azure-container-apps") fail("First production target must be Azure Container Apps");
  if (hosting.portableContainerRuntime !== true) fail("Runtime must remain portable across compliant container platforms");
  if (hosting.liveProviderExecution !== "credential-and-explicit-enable-gated") {
    fail("Live provider execution must require explicit enablement and credentials");
  }
  const expectedEndpoints = ["GET /health", "GET /ready", "POST /v1/route", "POST /v1/complete"];
  if (JSON.stringify(hosting.foundationEndpoints) !== JSON.stringify(expectedEndpoints)) fail("Runtime endpoints are invalid or incomplete");
  if (hosting.secretsLocation !== "deployment-secret-store-only") fail("Secrets must remain in a deployment secret store only");

  if (workflow.id !== "microsoft-ready-decision-memo-v1") fail("Controlled workflow ID is invalid");
  if (JSON.stringify(workflow.providers) !== JSON.stringify(requiredProviderIds)) fail("Controlled workflow provider set is invalid");
  if (workflow.outputStatus !== "Draft / Review Candidate") fail("Controlled workflow output status is invalid");
  if (workflow.targetSystem !== "Microsoft Word / SharePoint") fail("Controlled workflow target system is invalid");
  if (workflow.validationState !== "unvalidated") fail("Controlled workflow must remain unvalidated until human review");
  if (workflow.humanReviewRequired !== true || workflow.autonomousPublication !== false) {
    fail("Controlled workflow review and publication boundary is invalid");
  }

  const expectedDimensions = [
    "schemaCompliance",
    "governanceCompliance",
    "contentCompleteness",
    "evidenceCompliance",
    "latencyEfficiency",
    "tokenEfficiency",
    "providerReliability",
    "explicitErrorBehavior",
  ];
  if (JSON.stringify(evaluation.dimensions) !== JSON.stringify(expectedDimensions)) fail("Evaluation dimensions are invalid");
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
  const weightTotal = Object.values(evaluation.weights ?? {}).reduce((sum, value) => sum + value, 0);
  if (Math.abs(weightTotal - 1) > 1e-9) fail("Evaluation weights must sum to 1");
  if (JSON.stringify(evaluation.blockingDimensions) !== JSON.stringify(["schemaCompliance", "governanceCompliance", "evidenceCompliance"])) {
    fail("Evaluation blocking dimensions are invalid");
  }
  if (evaluation.productionScoresMayBeInvented !== false) fail("Production provider scores may not be invented");

  if (dataGate.green !== "allowed-by-policy") fail("GREEN data-gate policy is invalid");
  if (dataGate.yellow !== "requires-sanitization") fail("YELLOW data must require sanitization");
  if (dataGate.red !== "reject-external-provider-by-default") fail("RED data must be rejected before external routing");

  if (execution.failClosed !== true) fail("Office Companion must fail closed");
  if (execution.humanApprovalRequired !== true) fail("Human approval must remain required");
  if (execution.autonomousSending !== false) fail("Autonomous sending must remain disabled");
  if (execution.autonomousPublishing !== false) fail("Autonomous publishing must remain disabled");
  if (execution.autonomousApproval !== false) fail("Autonomous approval must remain disabled");
  if (execution.consequentialExternalActions !== false) fail("Consequential external actions must remain disabled");

  const serialized = JSON.stringify(cfg);
  for (const field of ["apiKey", "accessToken", "clientSecret", "privateKey"]) {
    if (serialized.includes(`\"${field}\"`)) fail(`Configuration must not contain secret field: ${field}`);
  }

  const dockerfile = read("Dockerfile");
  if (!dockerfile.includes("USER phoenix")) fail("Runtime container must run as the non-root phoenix user");
  if (!dockerfile.includes("HEALTHCHECK")) fail("Runtime container must define a health check");

  const promptSource = read("src/companions/office-companion/workflows/microsoft-ready-prompt.ts");
  if (!promptSource.includes("buildMicrosoftReadyDraftPrompt")) fail("Shared provider-neutral prompt builder is missing");

  const geminiSource = read("src/companions/office-companion/adapters/gemini-adapter.ts");
  if (!geminiSource.includes('"x-goog-api-key"')) fail("Gemini adapter must use its authentication header");
  if (!geminiSource.includes("responseJsonSchema")) fail("Gemini adapter must enforce structured output");
  if (!geminiSource.includes("buildMicrosoftReadyDraftPrompt")) fail("Gemini adapter must use the shared prompt contract");

  const claudeSource = read("src/companions/office-companion/adapters/claude-adapter.ts");
  for (const token of ['"x-api-key"', '"anthropic-version"', "input_schema", "tool_choice", "disable_parallel_tool_use", "buildMicrosoftReadyDraftPrompt"]) {
    if (!claudeSource.includes(token)) fail(`Claude adapter is missing required control: ${token}`);
  }

  const chatGptSource = read("src/companions/office-companion/adapters/chatgpt-adapter.ts");
  for (const token of ["authorization", "/responses", 'type: "json_schema"', "store: false", "buildMicrosoftReadyDraftPrompt"]) {
    if (!chatGptSource.includes(token)) fail(`ChatGPT adapter is missing required control: ${token}`);
  }

  const runtimeProviderSource = read("src/companions/office-companion/runtime-providers.ts");
  for (const token of [
    "OFFICE_COMPANION_ENABLE_LIVE_PROVIDER",
    "OFFICE_COMPANION_ENABLED_PROVIDERS",
    "ANTHROPIC_API_KEY",
    "CLAUDE_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
  ]) {
    if (!runtimeProviderSource.includes(token)) fail(`Runtime provider activation is missing: ${token}`);
  }

  const routerSource = read("src/companions/office-companion/router.ts");
  if (!routerSource.includes("deterministicIndex")) fail("Equal-score routing must use deterministic request distribution");
  if (!routerSource.includes("request.requestId")) fail("Tie distribution must bind to request identity");

  const evaluationSource = read("src/companions/office-companion/evaluation.ts");
  if (!evaluationSource.includes("blockingFailures")) fail("Evaluation framework must expose blocking failures");
  if (!evaluationSource.includes("weightedOverallScore")) fail("Evaluation framework must expose a weighted score");

  const serverSource = read("src/companions/office-companion/server.ts");
  if (!serverSource.includes('url.pathname === "/v1/complete"')) fail("Office Companion completion endpoint is missing");

  const envExample = read(".env.example");
  if (!envExample.includes("OFFICE_COMPANION_ENABLE_LIVE_PROVIDER=false")) fail("Example environment must disable live providers by default");
  if (!/^OFFICE_COMPANION_ENABLED_PROVIDERS=$/m.test(envExample)) fail("Example provider allowlist must be empty by default");
  for (const variable of [
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "ANTHROPIC_API_KEY",
    "CLAUDE_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
  ]) {
    if (!new RegExp(`^${variable}=$`, "m").test(envExample)) fail(`Example environment must leave ${variable} empty`);
  }

  const workflowSource = read(".github/workflows/office-companion.yml");
  if (!workflowSource.includes("acceptance:office-multi")) fail("CI must run the multi-provider acceptance suite");
  if (workflowSource.includes("GEMINI_API_KEY:")) fail("CI workflow must not embed Gemini credentials");
  if (workflowSource.includes("ANTHROPIC_API_KEY:")) fail("CI workflow must not embed Claude credentials");
  if (workflowSource.includes("OPENAI_API_KEY:")) fail("CI workflow must not embed ChatGPT credentials");
}

if (failures.length > 0) {
  console.error("Phoenix Office Companion validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phoenix Office Companion governance configuration is valid.");
console.log(
  "Validated Billy ownership, five Drive artifacts, provider neutrality, three implemented adapters, allowlist activation, fair tie routing, evaluation controls and fail-closed Microsoft-ready output.",
);
