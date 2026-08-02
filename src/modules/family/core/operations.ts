import type { EntityId, IsoDateTime } from "./domain";

export type FamilyOperationKind =
  | "meal-plan-approval"
  | "calendar-write"
  | "shopping-execution"
  | "child-kitchen-task"
  | "chore-assignment"
  | "leftover-reuse";

export type FamilyOperationStatus =
  | "proposed"
  | "awaiting-approval"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed";

export interface FamilyOperation {
  id: EntityId;
  householdId: EntityId;
  kind: FamilyOperationKind;
  subjectId: EntityId;
  requestedBy: EntityId;
  requestedAt: IsoDateTime;
  status: FamilyOperationStatus;
  requiresApproval: boolean;
  approvalRole?: "guardian" | "planner" | "shopper" | "cook" | "admin";
  approvedBy?: EntityId;
  approvedAt?: IsoDateTime;
  executedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  failureReason?: string;
  externalReference?: string;
  auditTrail: FamilyOperationAuditEntry[];
}

export interface FamilyOperationAuditEntry {
  at: IsoDateTime;
  actorId: EntityId;
  action:
    | "created"
    | "submitted"
    | "approved"
    | "rejected"
    | "execution-started"
    | "completed"
    | "failed";
  note?: string;
}

export interface OperationActor {
  memberId: EntityId;
  roles: string[];
}

export const createFamilyOperation = (
  input: Omit<FamilyOperation, "status" | "auditTrail">,
): FamilyOperation => ({
  ...input,
  status: input.requiresApproval ? "proposed" : "approved",
  auditTrail: [
    {
      at: input.requestedAt,
      actorId: input.requestedBy,
      action: "created",
    },
  ],
});

export const submitFamilyOperation = (
  operation: FamilyOperation,
  actor: OperationActor,
  at: IsoDateTime,
): FamilyOperation => {
  if (operation.status !== "proposed") {
    throw new Error("Only proposed family operations can be submitted.");
  }
  if (actor.memberId !== operation.requestedBy) {
    throw new Error("Only the requesting member can submit this operation.");
  }

  return {
    ...operation,
    status: operation.requiresApproval ? "awaiting-approval" : "approved",
    auditTrail: [
      ...operation.auditTrail,
      { at, actorId: actor.memberId, action: "submitted" },
    ],
  };
};

export const decideFamilyOperation = (
  operation: FamilyOperation,
  actor: OperationActor,
  decision: "approved" | "rejected",
  at: IsoDateTime,
  note?: string,
): FamilyOperation => {
  if (operation.status !== "awaiting-approval") {
    throw new Error("Family operation is not awaiting approval.");
  }
  if (
    operation.approvalRole &&
    !actor.roles.includes(operation.approvalRole) &&
    !actor.roles.includes("admin")
  ) {
    throw new Error("Actor lacks the required approval role.");
  }
  if (actor.memberId === operation.requestedBy) {
    throw new Error("Requester cannot self-approve this family operation.");
  }

  return {
    ...operation,
    status: decision,
    approvedBy: decision === "approved" ? actor.memberId : undefined,
    approvedAt: decision === "approved" ? at : undefined,
    auditTrail: [
      ...operation.auditTrail,
      { at, actorId: actor.memberId, action: decision, note },
    ],
  };
};

export const startFamilyOperationExecution = (
  operation: FamilyOperation,
  actor: OperationActor,
  at: IsoDateTime,
): FamilyOperation => {
  if (operation.status !== "approved") {
    throw new Error("Only approved family operations can be executed.");
  }

  return {
    ...operation,
    status: "executing",
    executedAt: at,
    auditTrail: [
      ...operation.auditTrail,
      { at, actorId: actor.memberId, action: "execution-started" },
    ],
  };
};

export const completeFamilyOperation = (
  operation: FamilyOperation,
  actor: OperationActor,
  at: IsoDateTime,
  externalReference?: string,
): FamilyOperation => {
  if (operation.status !== "executing") {
    throw new Error("Only executing family operations can be completed.");
  }

  return {
    ...operation,
    status: "completed",
    completedAt: at,
    externalReference,
    auditTrail: [
      ...operation.auditTrail,
      { at, actorId: actor.memberId, action: "completed" },
    ],
  };
};

export const failFamilyOperation = (
  operation: FamilyOperation,
  actor: OperationActor,
  at: IsoDateTime,
  failureReason: string,
): FamilyOperation => {
  if (operation.status !== "executing") {
    throw new Error("Only executing family operations can fail.");
  }
  if (!failureReason.trim()) {
    throw new Error("Failure reason is required.");
  }

  return {
    ...operation,
    status: "failed",
    failureReason,
    auditTrail: [
      ...operation.auditTrail,
      { at, actorId: actor.memberId, action: "failed", note: failureReason },
    ],
  };
};
