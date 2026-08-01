import type { EntityId, IsoDateTime } from "../core/domain";
import type { MealPlanEntry } from "./domain";

export interface MealPlanApproval {
  id: EntityId;
  householdId: EntityId;
  mealPlanEntryIds: EntityId[];
  requestedBy: EntityId;
  requestedAt: IsoDateTime;
  status: "pending" | "approved" | "rejected";
  decidedBy?: EntityId;
  decidedAt?: IsoDateTime;
  reason?: string;
}

export interface ApprovalResult {
  approval: MealPlanApproval;
  entries: MealPlanEntry[];
}

export const requestMealPlanApproval = (
  householdId: EntityId,
  entries: MealPlanEntry[],
  requestedBy: EntityId,
  requestedAt: IsoDateTime,
): ApprovalResult => {
  if (entries.length === 0) {
    throw new Error("Cannot request approval for an empty meal plan.");
  }

  return {
    approval: {
      id: `meal-plan-approval-${householdId}-${requestedAt}`,
      householdId,
      mealPlanEntryIds: entries.map((entry) => entry.id),
      requestedBy,
      requestedAt,
      status: "pending",
    },
    entries: entries.map((entry) => ({
      ...entry,
      approvalState: "recommended",
    })),
  };
};

export const decideMealPlanApproval = (
  approval: MealPlanApproval,
  entries: MealPlanEntry[],
  decision: "approved" | "rejected",
  decidedBy: EntityId,
  decidedAt: IsoDateTime,
  reason?: string,
): ApprovalResult => {
  if (approval.status !== "pending") {
    throw new Error("Meal plan approval has already been decided.");
  }

  const coveredIds = new Set(approval.mealPlanEntryIds);
  const updatedEntries = entries.map((entry) =>
    coveredIds.has(entry.id)
      ? {
          ...entry,
          approvalState: decision,
        }
      : entry,
  );

  return {
    approval: {
      ...approval,
      status: decision,
      decidedBy,
      decidedAt,
      reason,
    },
    entries: updatedEntries,
  };
};
