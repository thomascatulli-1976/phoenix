import type { EntityId, IsoDateTime } from "../core/domain";

export type ChoreRiskLevel = "low" | "medium" | "high";
export type ChoreStatus = "draft" | "assigned" | "in-progress" | "completed" | "skipped";

export interface HouseholdChore {
  id: EntityId;
  householdId: EntityId;
  title: string;
  description: string;
  area: "kitchen" | "bathroom" | "bedroom" | "living-room" | "laundry" | "general";
  riskLevel: ChoreRiskLevel;
  estimatedMinutes: number;
  dueAt?: IsoDateTime;
  recurring?: "daily" | "weekly" | "monthly";
  allowedAgeBands: Array<"under-6" | "6-9" | "10-13" | "14-17" | "adult">;
}

export interface ChoreAssignment {
  id: EntityId;
  choreId: EntityId;
  householdId: EntityId;
  assigneeMemberId: EntityId;
  assignedByMemberId: EntityId;
  assignedAt: IsoDateTime;
  status: ChoreStatus;
  requiresGuardianApproval: boolean;
  approvedBy?: EntityId;
  approvedAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  completionNote?: string;
}

const RISK_ORDER: Record<ChoreRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export const proposeChoreAssignment = (
  chore: HouseholdChore,
  assigneeMemberId: EntityId,
  assigneeAgeBand: HouseholdChore["allowedAgeBands"][number],
  assignedByMemberId: EntityId,
  assignedAt: IsoDateTime,
): ChoreAssignment => {
  if (!chore.allowedAgeBands.includes(assigneeAgeBand)) {
    throw new Error("Assignee age band is not allowed for this chore.");
  }

  const isChild = assigneeAgeBand !== "adult";
  const requiresGuardianApproval =
    isChild && RISK_ORDER[chore.riskLevel] >= RISK_ORDER.medium;

  return {
    id: `chore-assignment-${chore.id}-${assigneeMemberId}-${assignedAt}`,
    choreId: chore.id,
    householdId: chore.householdId,
    assigneeMemberId,
    assignedByMemberId,
    assignedAt,
    status: requiresGuardianApproval ? "draft" : "assigned",
    requiresGuardianApproval,
  };
};

export const approveChoreAssignment = (
  assignment: ChoreAssignment,
  guardianId: EntityId,
  childGuardianIds: EntityId[],
  approvedAt: IsoDateTime,
): ChoreAssignment => {
  if (!assignment.requiresGuardianApproval) {
    throw new Error("This chore assignment does not require guardian approval.");
  }
  if (!childGuardianIds.includes(guardianId)) {
    throw new Error("Only a registered guardian may approve this chore assignment.");
  }
  if (assignment.status !== "draft") {
    throw new Error("Only draft chore assignments can be approved.");
  }

  return {
    ...assignment,
    status: "assigned",
    approvedBy: guardianId,
    approvedAt,
  };
};

export const startChore = (
  assignment: ChoreAssignment,
  startedAt: IsoDateTime,
): ChoreAssignment => {
  if (assignment.status !== "assigned") {
    throw new Error("Only assigned chores can be started.");
  }
  return { ...assignment, status: "in-progress", startedAt };
};

export const completeChore = (
  assignment: ChoreAssignment,
  completedAt: IsoDateTime,
  completionNote?: string,
): ChoreAssignment => {
  if (assignment.status !== "in-progress") {
    throw new Error("Only chores in progress can be completed.");
  }

  return {
    ...assignment,
    status: "completed",
    completedAt,
    completionNote,
  };
};

export const validateChore = (chore: HouseholdChore): string[] => {
  const errors: string[] = [];
  if (chore.estimatedMinutes <= 0) errors.push("chore-duration-must-be-positive");
  if (chore.allowedAgeBands.length === 0) errors.push("chore-requires-allowed-age-band");
  if (!chore.title.trim()) errors.push("chore-title-required");
  return errors;
};
