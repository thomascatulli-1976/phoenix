import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import {
  officeProviderIds,
  type OfficeDataClass,
  type OfficeOperatingMode,
  type OfficeProviderId,
  type OfficeTaskRequest,
  type SanitizationState,
} from "./contracts.js";
import { registeredOfficeProviders } from "./provider-registry.js";
import { routeOfficeTask } from "./router.js";

const serviceName = "phoenix-office-companion";
const defaultConfigPath = "config/office-companion.json";
const maximumBodyBytes = 1_000_000;

interface RuntimeConfig {
  companion?: {
    id?: string;
    executiveOffice?: string;
    canonicalDriveFolderId?: string;
    technicalRepository?: string;
  };
  llmStrategy?: {
    permanentDefaultProvider?: unknown;
    providers?: Array<{ id?: string; status?: string }>;
  };
  executionPolicy?: {
    failClosed?: boolean;
    humanApprovalRequired?: boolean;
    consequentialExternalActions?: boolean;
  };
  runtimeHosting?: {
    mode?: string;
    firstProductionTarget?: string;
    liveProviderExecution?: boolean;
  };
}

interface RuntimeState {
  configPath: string;
  config: RuntimeConfig | null;
  failures: string[];
}

class HttpRequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function loadRuntimeState(): RuntimeState {
  const configPath = process.env.OFFICE_COMPANION_CONFIG_PATH ?? defaultConfigPath;
  const failures: string[] = [];
  let config: RuntimeConfig | null = null;

  try {
    config = JSON.parse(readFileSync(configPath, "utf8")) as RuntimeConfig;
  } catch (error) {
    failures.push(
      `Unable to load runtime configuration: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { configPath, config, failures };
  }

  if (config.companion?.id !== serviceName) {
    failures.push("Companion ID does not match the Office Companion runtime.");
  }
  if (config.companion?.executiveOffice !== "Billy") {
    failures.push("Executive Office must be Billy.");
  }
  if (config.companion?.technicalRepository !== "thomascatulli-1976/phoenix") {
    failures.push("Technical repository anchor is invalid.");
  }
  if (config.companion?.canonicalDriveFolderId !== "11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z") {
    failures.push("Canonical Drive folder anchor is invalid.");
  }
  if (config.llmStrategy?.permanentDefaultProvider !== null) {
    failures.push("A permanent default provider is prohibited.");
  }

  const configuredProviderIds = (config.llmStrategy?.providers ?? []).map(
    (provider) => provider.id,
  );
  if (JSON.stringify(configuredProviderIds) !== JSON.stringify(officeProviderIds)) {
    failures.push("Configured providers must be Gemini, Claude and ChatGPT in canonical order.");
  }
  if (config.executionPolicy?.failClosed !== true) {
    failures.push("Runtime execution policy must fail closed.");
  }
  if (config.executionPolicy?.humanApprovalRequired !== true) {
    failures.push("Human approval must remain required.");
  }
  if (config.executionPolicy?.consequentialExternalActions !== false) {
    failures.push("Consequential external actions must remain disabled.");
  }
  if (config.runtimeHosting?.mode !== "stateless-container") {
    failures.push("Runtime hosting mode must be stateless-container.");
  }
  if (config.runtimeHosting?.firstProductionTarget !== "azure-container-apps") {
    failures.push("The first production target must remain Azure Container Apps.");
  }
  if (config.runtimeHosting?.liveProviderExecution !== false) {
    failures.push("Live provider execution must remain disabled in the server foundation.");
  }

  return { configPath, config, failures };
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  traceId: string,
  payload: unknown,
): void {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-phoenix-trace-id": traceId,
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    let body = "";
    let settled = false;

    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      if (settled) return;
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > maximumBodyBytes) {
        fail(new HttpRequestError(413, "payload-too-large", "Request body exceeds 1 MB."));
      }
    });
    request.on("error", fail);
    request.on("end", () => {
      if (settled) return;
      settled = true;
      if (body.trim().length === 0) {
        reject(new HttpRequestError(400, "empty-body", "A JSON request body is required."));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new HttpRequestError(400, "invalid-json", "Request body must contain valid JSON."));
      }
    });
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isProviderArray(value: unknown): value is OfficeProviderId[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === "string" &&
        (officeProviderIds as readonly string[]).includes(entry),
    )
  );
}

function validateTaskRequest(value: unknown): OfficeTaskRequest {
  if (!isObject(value)) {
    throw new HttpRequestError(400, "invalid-request", "Request must be a JSON object.");
  }

  const operatingModes: OfficeOperatingMode[] = ["find", "think", "build", "validate", "publish"];
  const dataClasses: OfficeDataClass[] = ["green", "yellow", "red"];
  const sanitizationStates: SanitizationState[] = [
    "not-required",
    "sanitized",
    "not-sanitized",
  ];
  const requiredStringFields = [
    "requestId",
    "task",
    "intendedOutcome",
    "input",
    "createdAt",
  ] as const;

  for (const field of requiredStringFields) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      throw new HttpRequestError(400, "invalid-request", `${field} must be a non-empty string.`);
    }
  }
  if (!operatingModes.includes(value.operatingMode as OfficeOperatingMode)) {
    throw new HttpRequestError(400, "invalid-request", "operatingMode is invalid.");
  }
  if (!dataClasses.includes(value.dataClass as OfficeDataClass)) {
    throw new HttpRequestError(400, "invalid-request", "dataClass is invalid.");
  }
  if (!sanitizationStates.includes(value.sanitizationState as SanitizationState)) {
    throw new HttpRequestError(400, "invalid-request", "sanitizationState is invalid.");
  }

  const stringArrayFields = [
    "contextReferences",
    "excludedInformation",
    "requiredCapabilities",
    "toolPermissions",
  ] as const;
  for (const field of stringArrayFields) {
    if (!isStringArray(value[field])) {
      throw new HttpRequestError(400, "invalid-request", `${field} must be a string array.`);
    }
  }
  if (!isProviderArray(value.allowedProviders)) {
    throw new HttpRequestError(
      400,
      "invalid-request",
      "allowedProviders must contain only gemini, claude or chatgpt.",
    );
  }
  if (
    value.preferredProvider !== undefined &&
    !(
      typeof value.preferredProvider === "string" &&
      (officeProviderIds as readonly string[]).includes(value.preferredProvider)
    )
  ) {
    throw new HttpRequestError(400, "invalid-request", "preferredProvider is invalid.");
  }
  if (typeof value.allowFallback !== "boolean") {
    throw new HttpRequestError(400, "invalid-request", "allowFallback must be boolean.");
  }
  if (!isObject(value.evidenceRequirements)) {
    throw new HttpRequestError(400, "invalid-request", "evidenceRequirements is required.");
  }
  if (typeof value.evidenceRequirements.citationsRequired !== "boolean") {
    throw new HttpRequestError(
      400,
      "invalid-request",
      "evidenceRequirements.citationsRequired must be boolean.",
    );
  }
  if (!isStringArray(value.evidenceRequirements.approvedSourceIds)) {
    throw new HttpRequestError(
      400,
      "invalid-request",
      "evidenceRequirements.approvedSourceIds must be a string array.",
    );
  }
  if (!isObject(value.validationRequirements)) {
    throw new HttpRequestError(400, "invalid-request", "validationRequirements is required.");
  }
  if (
    typeof value.validationRequirements.humanReviewRequired !== "boolean" ||
    typeof value.validationRequirements.internalValidationRequired !== "boolean"
  ) {
    throw new HttpRequestError(
      400,
      "invalid-request",
      "validationRequirements must define humanReviewRequired and internalValidationRequired.",
    );
  }

  return value as unknown as OfficeTaskRequest;
}

function methodNotAllowed(response: ServerResponse, traceId: string, allowed: string): void {
  response.setHeader("allow", allowed);
  writeJson(response, 405, traceId, {
    status: "error",
    code: "method-not-allowed",
    message: `Allowed method: ${allowed}`,
    traceId,
  });
}

export function createOfficeCompanionServer() {
  const runtimeState = loadRuntimeState();

  return createServer(async (request, response) => {
    const traceId = randomUUID();
    const url = new URL(request.url ?? "/", "http://localhost");

    try {
      if (url.pathname === "/health") {
        if (request.method !== "GET") {
          methodNotAllowed(response, traceId, "GET");
          return;
        }
        writeJson(response, 200, traceId, {
          service: serviceName,
          status: "ok",
          traceId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (url.pathname === "/ready") {
        if (request.method !== "GET") {
          methodNotAllowed(response, traceId, "GET");
          return;
        }
        const ready = runtimeState.failures.length === 0;
        writeJson(response, ready ? 200 : 503, traceId, {
          service: serviceName,
          status: ready ? "ready" : "not-ready",
          executiveOffice: runtimeState.config?.companion?.executiveOffice ?? null,
          hostingMode: runtimeState.config?.runtimeHosting?.mode ?? null,
          firstProductionTarget:
            runtimeState.config?.runtimeHosting?.firstProductionTarget ?? null,
          liveProviderExecution: false,
          registeredProviders: registeredOfficeProviders.map((provider) => ({
            id: provider.id,
            status: provider.status,
          })),
          failures: runtimeState.failures,
          traceId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (url.pathname === "/v1/route") {
        if (request.method !== "POST") {
          methodNotAllowed(response, traceId, "POST");
          return;
        }
        if (runtimeState.failures.length > 0) {
          writeJson(response, 503, traceId, {
            status: "error",
            code: "runtime-not-ready",
            message: "Runtime configuration failed readiness validation.",
            traceId,
          });
          return;
        }

        const taskRequest = validateTaskRequest(await readJsonBody(request));
        const decision = routeOfficeTask(taskRequest, registeredOfficeProviders);
        writeJson(response, 200, traceId, {
          requestId: taskRequest.requestId,
          traceId,
          liveProviderExecution: false,
          decision,
        });
        return;
      }

      writeJson(response, 404, traceId, {
        status: "error",
        code: "not-found",
        message: "Route not found.",
        traceId,
      });
    } catch (error) {
      const requestError =
        error instanceof HttpRequestError
          ? error
          : new HttpRequestError(500, "internal-error", "The request could not be processed.");
      writeJson(response, requestError.statusCode, traceId, {
        status: "error",
        code: requestError.code,
        message: requestError.message,
        traceId,
      });
    }
  });
}

export function startOfficeCompanionServer(): void {
  const host = process.env.HOST ?? "0.0.0.0";
  const parsedPort = Number.parseInt(process.env.PORT ?? "8080", 10);
  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65_535) {
    throw new Error("PORT must be an integer between 0 and 65535.");
  }

  const server = createOfficeCompanionServer();
  server.listen(parsedPort, host, () => {
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : parsedPort;
    console.log(`${serviceName} listening on ${host}:${port}`);
  });

  const shutdown = (): void => {
    server.close((error) => {
      if (error) {
        console.error(`${serviceName} shutdown failed: ${error.message}`);
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  startOfficeCompanionServer();
}
