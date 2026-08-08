import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createOfficeCompanionServer } from "../server.js";

interface JsonResponse {
  [key: string]: unknown;
}

async function parseJson(response: Response): Promise<JsonResponse> {
  return (await response.json()) as JsonResponse;
}

function baseTaskRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    requestId: "office-server-smoke-001",
    operatingMode: "think",
    task: "Structure a sanitized office decision memo",
    intendedOutcome: "A review-ready outline",
    input: "Public and sanitized context only",
    contextReferences: [],
    dataClass: "green",
    sanitizationState: "not-required",
    excludedInformation: [],
    requiredCapabilities: ["reasoning"],
    allowedProviders: ["gemini", "claude", "chatgpt"],
    allowFallback: true,
    evidenceRequirements: {
      citationsRequired: false,
      approvedSourceIds: [],
    },
    validationRequirements: {
      humanReviewRequired: true,
      internalValidationRequired: true,
    },
    toolPermissions: [],
    createdAt: "2026-08-08T00:00:00.000Z",
    ...overrides,
  };
}

export async function runOfficeCompanionServerSmoke(): Promise<void> {
  const server = createOfficeCompanionServer({ environment: {} });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo | null;
  assert.ok(address, "Server address must be available after listen.");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const healthResponse = await fetch(`${baseUrl}/health`);
    assert.equal(healthResponse.status, 200);
    const health = await parseJson(healthResponse);
    assert.equal(health.service, "phoenix-office-companion");
    assert.equal(health.status, "ok");

    const readyResponse = await fetch(`${baseUrl}/ready`);
    assert.equal(readyResponse.status, 200);
    const ready = await parseJson(readyResponse);
    assert.equal(ready.status, "ready");
    assert.equal(ready.executiveOffice, "Billy");
    assert.equal(ready.hostingMode, "stateless-container");
    assert.equal(ready.firstProductionTarget, "azure-container-apps");
    assert.equal(ready.liveProviderExecution, false);
    assert.deepEqual(ready.operationalProviders, []);
    assert.deepEqual(
      (ready.registeredProviders as Array<{ id: string }>).map((provider) => provider.id),
      ["gemini", "claude", "chatgpt"],
    );

    const greenResponse = await fetch(`${baseUrl}/v1/route`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseTaskRequest()),
    });
    assert.equal(greenResponse.status, 200);
    const green = await parseJson(greenResponse);
    assert.equal(green.liveProviderExecution, false);
    assert.deepEqual(green.decision, {
      status: "rejected",
      code: "no-provider-capable",
      eligibleProviders: [],
      fallbackProviders: [],
      reason: "No available provider satisfies the data policy and required capabilities.",
    });

    const completeResponse = await fetch(`${baseUrl}/v1/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseTaskRequest()),
    });
    assert.equal(completeResponse.status, 503);
    const completion = await parseJson(completeResponse);
    assert.equal(completion.code, "routing-rejected");

    const redResponse = await fetch(`${baseUrl}/v1/route`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        baseTaskRequest({
          requestId: "office-server-smoke-red",
          dataClass: "red",
          sanitizationState: "not-sanitized",
        }),
      ),
    });
    assert.equal(redResponse.status, 200);
    const red = await parseJson(redResponse);
    assert.deepEqual(red.decision, {
      status: "rejected",
      code: "red-data-prohibited",
      eligibleProviders: [],
      fallbackProviders: [],
      reason: "RED data is rejected for external LLM routing by the foundation policy.",
    });

    const invalidResponse = await fetch(`${baseUrl}/v1/route`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "invalid" }),
    });
    assert.equal(invalidResponse.status, 400);
    const invalid = await parseJson(invalidResponse);
    assert.equal(invalid.status, "error");
    assert.equal(invalid.code, "invalid-request");

    const missingResponse = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(missingResponse.status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
