import type { EntityId, IsoDateTime } from "../core/domain";
import type { FamilyOperation } from "../core/operations";

export type FamilyIntegrationKind = "calendar" | "shopping" | "device";
export type FamilyIntegrationMode = "dry-run" | "live";

export interface FamilyIntegrationCommand<TPayload> {
  id: EntityId;
  operationId: EntityId;
  householdId: EntityId;
  kind: FamilyIntegrationKind;
  mode: FamilyIntegrationMode;
  idempotencyKey: string;
  requestedAt: IsoDateTime;
  payload: TPayload;
}

export interface FamilyIntegrationReceipt {
  commandId: EntityId;
  adapterId: string;
  mode: FamilyIntegrationMode;
  accepted: boolean;
  externalReference?: string;
  completedAt: IsoDateTime;
  detail?: string;
}

export interface FamilyIntegrationAdapter<TPayload> {
  readonly id: string;
  readonly kind: FamilyIntegrationKind;
  execute(command: FamilyIntegrationCommand<TPayload>): Promise<FamilyIntegrationReceipt>;
}

export const assertOperationMayExecuteIntegration = (
  operation: FamilyOperation,
  command: FamilyIntegrationCommand<unknown>,
): void => {
  if (operation.id !== command.operationId) {
    throw new Error("Integration command is not bound to this family operation.");
  }
  if (operation.householdId !== command.householdId) {
    throw new Error("Integration command household does not match the operation.");
  }
  if (operation.status !== "executing") {
    throw new Error("Integration commands require an executing family operation.");
  }
  if (!operation.approvedBy || !operation.approvedAt) {
    throw new Error("Integration commands require recorded approval.");
  }
  if (!command.idempotencyKey.trim()) {
    throw new Error("Integration command requires an idempotency key.");
  }

  const expectedKind: Partial<Record<FamilyOperation["kind"], FamilyIntegrationKind>> = {
    "calendar-write": "calendar",
    "shopping-execution": "shopping",
  };
  const requiredKind = expectedKind[operation.kind];
  if (!requiredKind || requiredKind !== command.kind) {
    throw new Error("Integration kind does not match the approved operation kind.");
  }
};

export const executeGovernedIntegration = async <TPayload>(
  operation: FamilyOperation,
  command: FamilyIntegrationCommand<TPayload>,
  adapter: FamilyIntegrationAdapter<TPayload>,
): Promise<FamilyIntegrationReceipt> => {
  assertOperationMayExecuteIntegration(operation, command);
  if (adapter.kind !== command.kind) {
    throw new Error("Adapter kind does not match the integration command.");
  }

  const receipt = await adapter.execute(command);
  if (receipt.commandId !== command.id) {
    throw new Error("Adapter receipt does not match the integration command.");
  }
  if (receipt.mode !== command.mode) {
    throw new Error("Adapter receipt mode does not match the command mode.");
  }
  if (command.mode === "dry-run" && receipt.externalReference) {
    throw new Error("Dry-run integrations must not return an external reference.");
  }

  return receipt;
};

export class InMemoryDryRunAdapter<TPayload>
  implements FamilyIntegrationAdapter<TPayload>
{
  public readonly executions: FamilyIntegrationCommand<TPayload>[] = [];

  public constructor(
    public readonly id: string,
    public readonly kind: FamilyIntegrationKind,
    private readonly now: () => IsoDateTime,
  ) {}

  public async execute(
    command: FamilyIntegrationCommand<TPayload>,
  ): Promise<FamilyIntegrationReceipt> {
    if (command.mode !== "dry-run") {
      throw new Error("In-memory adapter only supports dry-run commands.");
    }
    if (
      this.executions.some(
        (existing) => existing.idempotencyKey === command.idempotencyKey,
      )
    ) {
      throw new Error("Duplicate integration idempotency key.");
    }

    this.executions.push(command);
    return {
      commandId: command.id,
      adapterId: this.id,
      mode: command.mode,
      accepted: true,
      completedAt: this.now(),
      detail: "dry-run accepted; no external side effect executed",
    };
  }
}
