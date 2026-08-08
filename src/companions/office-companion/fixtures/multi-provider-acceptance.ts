import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import {
  ClaudeAdapterError,
  ClaudeOfficeAdapter,
} from "../adapters/claude-adapter.js";
import {
  ChatGptAdapterError,
  ChatGptOfficeAdapter,
} from "../adapters/chatgpt-adapter.js";
import type { OfficeCompletionResult } from "../completion-service.js";
import type {
  OfficeProviderId,
  OfficeTaskRequest,
} from "../contracts.js";
import { evaluateOfficeCompletion } from "../evaluation.js";
import { createOfficeRuntimeProviderState } from "../runtime-providers.js";
import { routeOfficeTask } from "../router.js";
import { createOfficeCompanionServer } from "../server.js";
import { microsoftReadyDraftToolName } from "../workflows/microsoft-ready-prompt.js";

interface JsonRecord {
  [key: string]: unknown;
}

interface ProviderCall {
  provider: OfficeProviderId;
  url: string;
  headers: Headers;
  body: JsonRecord;
}

const fixedDate = new Date("2026-08-08T20:00:00.000Z");

const draft = {
  artifactTitle: "Decision Memo - Marketing Operating Model",
  managementSummary:
    "The sanitized context indicates unclear marketing responsibilities across business units.",
  decisionRequired: "Select the target marketing operating model for internal validation.",
  options: [
    {
      name: "Centralized model",
      summary: "Consolidate decision rights and execution in one central team.",
      benefits: ["Clear accountability", "Consistent standards"],
      risks: ["Lower local responsiveness"],
    },
    {
      name: "Federated model",
      summary: "Retain local execution with explicit central standards and decision rights.",
      benefits: ["Local responsiveness", "Shared governance"],
      risks: ["Requires disciplined interfaces"],
    },
  ],
  recommendation: "Use a federated model as the review candidate.",
  rationale: ["Balances consistency with business-unit context"],
  assumptions: ["Existing teams remain available during transition"],
  openPoints: ["Confirm the internal owner", "Validate current decision rights"],
  internalValidationRequired: [
    "Check responsibilities against approved internal documents",
    "Confirm affected stakeholders in Microsoft 365",
  ],
  evidenceStatus: "Based only on sanitized input; internal evidence is not yet validated.",
  recommendedNextAction: "Review the draft in Microsoft 365 before any publication.",
};

function taskRequest(
  preferredProvider?: OfficeProviderId,
  overrides: Partial<OfficeTaskRequest> = {},
): OfficeTaskRequest {
  return {
    requestId: `office-multi-${preferredProvider ?? "auto"}`,
    operatingMode: "build",
    task: "Create a decision memo for a sanitized marketing organization problem",
    intendedOutcome: "A Microsoft-ready review candidate",
    input:
      "An industrial company has unclear marketing responsibilities across several business units.",
    contextReferences: [],
    dataClass: "yellow",
    sanitizationState: "sanitized",
    excludedInformation: ["Personal names", "Customer names", "Confidential figures"],
    requiredCapabilities: [
      "reasoning",
      "document-drafting",
      "structured-output",
      "microsoft-ready-output",
    ],
    allowedProviders: ["gemini", "claude", "chatgpt"],
    preferredProvider,
    allowFallback: preferredProvider === undefined,
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
    createdAt: fixedDate.toISOString(),
    ...overrides,
  };
}

function createMultiProviderMock() {
  const calls: ProviderCall[] = [];

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body ?? "{}")) as JsonRecord;

    if (url.includes("gemini.example.test")) {
      calls.push({ provider: "gemini", url, headers, body });
      return new Response(
        JSON.stringify({
          modelVersion: "gemini-test-reported",
          candidates: [
            {
              content: { parts: [{ text: JSON.stringify(draft) }] },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 120,
            candidatesTokenCount: 180,
            totalTokenCount: 300,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("claude.example.test")) {
      calls.push({ provider: "claude", url, headers, body });
      return new Response(
        JSON.stringify({
          id: "msg_test_001",
          type: "message",
          role: "assistant",
          model: "claude-test-reported",
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "toolu_test_001",
              name: microsoftReadyDraftToolName,
              input: draft,
            },
          ],
          usage: {
            input_tokens: 140,
            output_tokens: 190,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("openai.example.test")) {
      calls.push({ provider: "chatgpt", url, headers, body });
      return new Response(
        JSON.stringify({
          id: "resp_test_001",
          object: "response",
          status: "completed",
          model: "openai-test-reported",
          output: [
            {
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(draft),
                  annotations: [],
                },
              ],
            },
          ],
          usage: {
            input_tokens: 130,
            output_tokens: 185,
            total_tokens: 315,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`Unexpected provider URL: ${url}`);
  };

  return { calls, fetchImpl };
}

async function parseJson(response: Response): Promise<JsonRecord> {
  return (await response.json()) as JsonRecord;
}

function multiProviderEnvironment(): NodeJS.ProcessEnv {
  return {
    OFFICE_COMPANION_ENABLE_LIVE_PROVIDER: "true",
    OFFICE_COMPANION_ENABLED_PROVIDERS: "gemini,claude,chatgpt",
    GEMINI_API_KEY: "gemini-test-secret",
    GEMINI_MODEL: "gemini-test-model",
    GEMINI_API_BASE_URL: "https://gemini.example.test/v1beta",
    GEMINI_TIMEOUT_MS: "5000",
    ANTHROPIC_API_KEY: "claude-test-secret",
    CLAUDE_MODEL: "claude-test-model",
    CLAUDE_API_BASE_URL: "https://claude.example.test/v1",
    CLAUDE_TIMEOUT_MS: "5000",
    ANTHROPIC_VERSION: "2023-06-01",
    OPENAI_API_KEY: "openai-test-secret",
    OPENAI_MODEL: "openai-test-model",
    OPENAI_API_BASE_URL: "https://openai.example.test/v1",
    OPENAI_TIMEOUT_MS: "5000",
  };
}

function assertActivationControls(): void {
  const backwardCompatible = createOfficeRuntimeProviderState({
    environment: {
      OFFICE_COMPANION_ENABLE_LIVE_PROVIDER: "true",
      GEMINI_API_KEY: "gemini-test-secret",
      GEMINI_MODEL: "gemini-test-model",
    },
  });
  assert.deepEqual(backwardCompatible.operationalProviderIds, ["gemini"]);

  const unknown = createOfficeRuntimeProviderState({
    environment: {
      OFFICE_COMPANION_ENABLE_LIVE_PROVIDER: "true",
      OFFICE_COMPANION_ENABLED_PROVIDERS: "gemini,unknown",
      GEMINI_API_KEY: "gemini-test-secret",
      GEMINI_MODEL: "gemini-test-model",
    },
  });
  assert.equal(
    unknown.failures.some((failure) => failure.includes("Unknown Office Companion provider")),
    true,
  );

  const duplicate = createOfficeRuntimeProviderState({
    environment: {
      OFFICE_COMPANION_ENABLE_LIVE_PROVIDER: "true",
      OFFICE_COMPANION_ENABLED_PROVIDERS: "gemini,gemini",
      GEMINI_API_KEY: "gemini-test-secret",
      GEMINI_MODEL: "gemini-test-model",
    },
  });
  assert.equal(
    duplicate.failures.some((failure) => failure.includes("Duplicate Office Companion provider")),
    true,
  );

  const disabledCredential = createOfficeRuntimeProviderState({
    environment: {
      OFFICE_COMPANION_ENABLE_LIVE_PROVIDER: "true",
      OFFICE_COMPANION_ENABLED_PROVIDERS: "gemini",
      GEMINI_API_KEY: "gemini-test-secret",
      GEMINI_MODEL: "gemini-test-model",
      ANTHROPIC_API_KEY: "claude-test-secret",
      CLAUDE_MODEL: "claude-test-model",
    },
  });
  assert.equal(
    disabledCredential.failures.some((failure) =>
      failure.includes("Provider claude has credential or model configuration"),
    ),
    true,
  );

  const missingConfiguration = createOfficeRuntimeProviderState({
    environment: {
      OFFICE_COMPANION_ENABLE_LIVE_PROVIDER: "true",
      OFFICE_COMPANION_ENABLED_PROVIDERS: "claude",
      ANTHROPIC_API_KEY: "claude-test-secret",
    },
  });
  assert.equal(
    missingConfiguration.failures.some((failure) =>
      failure.includes("Enabled provider claude requires both credential and model"),
    ),
    true,
  );
}

function assertTieDistribution(): void {
  const state = createOfficeRuntimeProviderState({
    environment: multiProviderEnvironment(),
    fetchImpl: async () => new Response("{}"),
    now: () => fixedDate,
  });
  assert.equal(state.failures.length, 0);

  const selected = new Set<OfficeProviderId>();
  for (let index = 0; index < 60; index += 1) {
    const decision = routeOfficeTask(
      taskRequest(undefined, { requestId: `tie-distribution-${index}` }),
      state.providers,
    );
    assert.equal(decision.status, "selected");
    if (decision.status === "selected") selected.add(decision.provider);
  }
  assert.deepEqual([...selected].sort(), ["chatgpt", "claude", "gemini"]);

  const first = routeOfficeTask(
    taskRequest(undefined, { requestId: "stable-tie-request" }),
    state.providers,
  );
  const second = routeOfficeTask(
    taskRequest(undefined, { requestId: "stable-tie-request" }),
    state.providers,
  );
  assert.deepEqual(first, second);
}

async function assertMalformedProviderResponses(): Promise<void> {
  const claude = new ClaudeOfficeAdapter({
    apiKey: "claude-test-secret",
    model: "claude-test-model",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          id: "msg_text_only",
          stop_reason: "end_turn",
          content: [{ type: "text", text: "No tool output" }],
        }),
        { status: 200 },
      ),
  });
  await assert.rejects(
    claude.complete(taskRequest("claude")),
    (error: unknown) =>
      error instanceof ClaudeAdapterError && error.code === "empty-response",
  );

  const chatgpt = new ChatGptOfficeAdapter({
    apiKey: "openai-test-secret",
    model: "openai-test-model",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          id: "resp_refusal",
          status: "completed",
          output: [
            {
              type: "message",
              content: [{ type: "refusal", refusal: "Request refused" }],
            },
          ],
        }),
        { status: 200 },
      ),
  });
  await assert.rejects(
    chatgpt.complete(taskRequest("chatgpt")),
    (error: unknown) =>
      error instanceof ChatGptAdapterError && error.code === "provider-blocked",
  );
}

export async function runMultiProviderAcceptance(): Promise<void> {
  assertActivationControls();
  assertTieDistribution();
  await assertMalformedProviderResponses();

  const mock = createMultiProviderMock();
  let traceIndex = 0;
  const server = createOfficeCompanionServer({
    environment: multiProviderEnvironment(),
    providerFetch: mock.fetchImpl,
    now: () => fixedDate,
    providerTraceIdFactory: () => `provider-trace-${++traceIndex}`,
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo | null;
  assert.ok(address);
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const readyResponse = await fetch(`${baseUrl}/ready`);
    assert.equal(readyResponse.status, 200);
    const ready = await parseJson(readyResponse);
    assert.equal(ready.liveProviderExecution, true);
    assert.deepEqual(ready.operationalProviders, ["gemini", "claude", "chatgpt"]);

    const packages: JsonRecord[] = [];
    for (const providerId of ["gemini", "claude", "chatgpt"] as const) {
      const request = taskRequest(providerId, {
        requestId: `multi-provider-${providerId}`,
      });
      const response = await fetch(`${baseUrl}/v1/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      assert.equal(response.status, 200);
      const completed = (await parseJson(response)) as unknown as OfficeCompletionResult;

      assert.equal(completed.routingDecision.provider, providerId);
      assert.equal(completed.provider.id, providerId);
      assert.equal(completed.outputPackage.status, "Draft / Review Candidate");
      assert.equal(completed.outputPackage.targetSystem, "Microsoft Word / SharePoint");
      assert.equal(completed.outputPackage.validationState, "unvalidated");
      assert.equal(completed.outputPackage.humanReviewRequired, true);
      assert.equal(completed.outputPackage.autonomousPublication, false);
      assert.equal(completed.outputPackage.managementSummary, draft.managementSummary);
      packages.push(completed.outputPackage as unknown as JsonRecord);

      const evaluation = evaluateOfficeCompletion({
        testCaseId: `multi-provider-${providerId}`,
        request,
        result: completed,
        evaluatedAt: fixedDate.toISOString(),
      });
      assert.equal(evaluation.passed, true);
      assert.deepEqual(evaluation.blockingFailures, []);
      assert.equal(evaluation.weightedOverallScore >= 0.9, true);
    }

    assert.equal(packages.length, 3);
    for (const outputPackage of packages) {
      assert.equal(outputPackage.decisionRequired, draft.decisionRequired);
      assert.deepEqual(outputPackage.options, draft.options);
      assert.equal(outputPackage.recommendation, draft.recommendation);
    }

    assert.equal(mock.calls.length, 3);
    const geminiCall = mock.calls.find((call) => call.provider === "gemini");
    const claudeCall = mock.calls.find((call) => call.provider === "claude");
    const chatGptCall = mock.calls.find((call) => call.provider === "chatgpt");
    assert.ok(geminiCall && claudeCall && chatGptCall);

    assert.equal(geminiCall.headers.get("x-goog-api-key"), "gemini-test-secret");
    assert.equal(claudeCall.headers.get("x-api-key"), "claude-test-secret");
    assert.equal(claudeCall.headers.get("anthropic-version"), "2023-06-01");
    assert.equal(chatGptCall.headers.get("authorization"), "Bearer openai-test-secret");

    for (const call of mock.calls) {
      const serialized = JSON.stringify(call.body);
      assert.equal(serialized.includes("gemini-test-secret"), false);
      assert.equal(serialized.includes("claude-test-secret"), false);
      assert.equal(serialized.includes("openai-test-secret"), false);
    }

    const claudeToolChoice = claudeCall.body.tool_choice as JsonRecord;
    assert.equal(claudeToolChoice.type, "tool");
    assert.equal(claudeToolChoice.name, microsoftReadyDraftToolName);
    assert.equal(claudeToolChoice.disable_parallel_tool_use, true);

    assert.equal(chatGptCall.body.store, false);
    const chatGptText = chatGptCall.body.text as JsonRecord;
    const chatGptFormat = chatGptText.format as JsonRecord;
    assert.equal(chatGptFormat.type, "json_schema");
    assert.equal(chatGptFormat.strict, true);
    assert.equal(typeof chatGptFormat.schema, "object");

    const callsBeforePolicyRejection = mock.calls.length;
    const redResponse = await fetch(`${baseUrl}/v1/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        taskRequest("claude", {
          requestId: "multi-provider-red",
          dataClass: "red",
          sanitizationState: "not-sanitized",
        }),
      ),
    });
    assert.equal(redResponse.status, 422);
    assert.equal(mock.calls.length, callsBeforePolicyRejection);

    const yellowResponse = await fetch(`${baseUrl}/v1/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        taskRequest("chatgpt", {
          requestId: "multi-provider-yellow",
          dataClass: "yellow",
          sanitizationState: "not-sanitized",
        }),
      ),
    });
    assert.equal(yellowResponse.status, 422);
    assert.equal(mock.calls.length, callsBeforePolicyRejection);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
