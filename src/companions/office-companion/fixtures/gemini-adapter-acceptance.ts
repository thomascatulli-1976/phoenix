import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { GeminiOfficeAdapter } from "../adapters/gemini-adapter.js";
import type { OfficeTaskRequest } from "../contracts.js";
import { createOfficeCompanionServer } from "../server.js";

interface JsonRecord {
  [key: string]: unknown;
}

const fixedDate = new Date("2026-08-08T18:45:00.000Z");
const fixedProviderTraceId = "gemini-provider-trace-001";

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

function taskRequest(overrides: Partial<OfficeTaskRequest> = {}): OfficeTaskRequest {
  return {
    requestId: "office-gemini-acceptance-001",
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
    preferredProvider: "gemini",
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
    createdAt: "2026-08-08T18:45:00.000Z",
    ...overrides,
  };
}

function createGeminiMock() {
  const calls: Array<{
    url: string;
    apiKey: string | null;
    body: JsonRecord;
  }> = [];

  const fetchImpl: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body ?? "{}")) as JsonRecord;
    calls.push({
      url: String(input),
      apiKey: headers.get("x-goog-api-key"),
      body,
    });

    return new Response(
      JSON.stringify({
        modelVersion: "gemini-test-model-001",
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(draft) }],
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: {
          promptTokenCount: 120,
          candidatesTokenCount: 180,
          totalTokenCount: 300,
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };

  return { calls, fetchImpl };
}

async function parseJson(response: Response): Promise<JsonRecord> {
  return (await response.json()) as JsonRecord;
}

export async function runGeminiAdapterAcceptance(): Promise<void> {
  const unconfigured = new GeminiOfficeAdapter({ apiKey: "", model: "" });
  assert.equal(await unconfigured.isAvailable(), false);

  const mock = createGeminiMock();
  const server = createOfficeCompanionServer({
    environment: {
      GEMINI_API_KEY: "test-gemini-secret",
      GEMINI_MODEL: "gemini-test-model",
      GEMINI_API_BASE_URL: "https://gemini.example.test/v1beta",
      GEMINI_TIMEOUT_MS: "5000",
    },
    providerFetch: mock.fetchImpl,
    now: () => fixedDate,
    providerTraceIdFactory: () => fixedProviderTraceId,
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
    assert.deepEqual(ready.operationalProviders, ["gemini"]);

    const completeResponse = await fetch(`${baseUrl}/v1/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(taskRequest()),
    });
    assert.equal(completeResponse.status, 200);
    const completed = await parseJson(completeResponse);
    const outputPackage = completed.outputPackage as JsonRecord;
    const provider = completed.provider as JsonRecord;

    assert.equal(provider.id, "gemini");
    assert.equal(provider.traceId, fixedProviderTraceId);
    assert.equal(outputPackage.status, "Draft / Review Candidate");
    assert.equal(outputPackage.targetSystem, "Microsoft Word / SharePoint");
    assert.equal(outputPackage.validationState, "unvalidated");
    assert.equal(outputPackage.humanReviewRequired, true);
    assert.equal(outputPackage.autonomousPublication, false);
    assert.equal(outputPackage.sensitivity, "YELLOW_SANITIZED");
    assert.deepEqual(outputPackage.excludedInformation, [
      "Personal names",
      "Customer names",
      "Confidential figures",
    ]);

    assert.equal(mock.calls.length, 1);
    assert.equal(
      mock.calls[0]?.url,
      "https://gemini.example.test/v1beta/models/gemini-test-model:generateContent",
    );
    assert.equal(mock.calls[0]?.apiKey, "test-gemini-secret");
    assert.equal(JSON.stringify(mock.calls[0]?.body).includes("test-gemini-secret"), false);

    const generationConfig = mock.calls[0]?.body.generationConfig as JsonRecord;
    assert.equal(generationConfig.responseMimeType, "application/json");
    assert.equal(typeof generationConfig.responseJsonSchema, "object");
    assert.equal("temperature" in generationConfig, false);

    const redResponse = await fetch(`${baseUrl}/v1/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        taskRequest({
          requestId: "office-gemini-red",
          dataClass: "red",
          sanitizationState: "not-sanitized",
        }),
      ),
    });
    assert.equal(redResponse.status, 422);
    const red = await parseJson(redResponse);
    assert.equal(red.code, "routing-rejected");
    assert.equal(mock.calls.length, 1, "RED data must be rejected before provider execution.");

    const noReviewResponse = await fetch(`${baseUrl}/v1/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        taskRequest({
          requestId: "office-gemini-no-review",
          validationRequirements: {
            humanReviewRequired: false,
            internalValidationRequired: true,
          },
        }),
      ),
    });
    assert.equal(noReviewResponse.status, 422);
    const noReview = await parseJson(noReviewResponse);
    assert.equal(noReview.code, "human-review-required");
    assert.equal(mock.calls.length, 1);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
