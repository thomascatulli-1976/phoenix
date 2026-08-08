import {
  createFamilyOperation,
  decideFamilyOperation,
  startFamilyOperationExecution,
  submitFamilyOperation,
} from "../core/operations";
import {
  assertOperationMayExecuteIntegration,
  InMemoryDryRunAdapter,
  type FamilyIntegrationCommand,
} from "../integrations/ports";

const planner = { memberId: "member-planner", roles: ["planner"] };
const approver = { memberId: "member-admin", roles: ["admin"] };
const executor = { memberId: "member-executor", roles: ["admin"] };

const createExecutingCalendarOperation = () => {
  const proposed = createFamilyOperation({
    id: "operation-calendar-1",
    householdId: "household-1",
    kind: "calendar-write",
    subjectId: "meal-plan-1",
    requestedBy: planner.memberId,
    requestedAt: "2026-08-02T04:00:00.000Z",
    requiresApproval: true,
    approvalRole: "planner",
  });
  const submitted = submitFamilyOperation(
    proposed,
    planner,
    "2026-08-02T04:01:00.000Z",
  );
  const approved = decideFamilyOperation(
    submitted,
    approver,
    "approved",
    "2026-08-02T04:02:00.000Z",
  );
  return startFamilyOperationExecution(
    approved,
    executor,
    "2026-08-02T04:03:00.000Z",
  );
};

const validCommand: FamilyIntegrationCommand<{ title: string }> = {
  id: "command-calendar-1",
  operationId: "operation-calendar-1",
  householdId: "household-1",
  kind: "calendar",
  mode: "dry-run",
  idempotencyKey: "calendar:operation-calendar-1:v1",
  requestedAt: "2026-08-02T04:03:00.000Z",
  payload: { title: "Family dinner" },
};

export const assertIntegrationPortsAcceptance = (): void => {
  const operation = createExecutingCalendarOperation();
  assertOperationMayExecuteIntegration(operation, validCommand);

  const adapter = new InMemoryDryRunAdapter<{ title: string }>(
    "calendar-dry-run",
    "calendar",
    () => "2026-08-02T04:04:00.000Z",
  );
  if (adapter.kind !== "calendar" || adapter.executions.length !== 0) {
    throw new Error("Dry-run adapter did not initialize safely.");
  }

  let wrongKindRejected = false;
  try {
    assertOperationMayExecuteIntegration(operation, {
      ...validCommand,
      kind: "shopping",
    });
  } catch {
    wrongKindRejected = true;
  }
  if (!wrongKindRejected) {
    throw new Error("Mismatched integration kind was not rejected.");
  }

  let missingIdempotencyRejected = false;
  try {
    assertOperationMayExecuteIntegration(operation, {
      ...validCommand,
      idempotencyKey: " ",
    });
  } catch {
    missingIdempotencyRejected = true;
  }
  if (!missingIdempotencyRejected) {
    throw new Error("Missing idempotency key was not rejected.");
  }

  let unapprovedOperationRejected = false;
  try {
    assertOperationMayExecuteIntegration(
      { ...operation, approvedBy: undefined, approvedAt: undefined },
      validCommand,
    );
  } catch {
    unapprovedOperationRejected = true;
  }
  if (!unapprovedOperationRejected) {
    throw new Error("Integration command without recorded approval was accepted.");
  }
};
