import type { EntityId, IsoDateTime } from "../core/domain";
import type { IngredientAmount, MealPlanEntry } from "./domain";

export interface LeftoverBatch {
  id: EntityId;
  householdId: EntityId;
  sourceMealPlanEntryId: EntityId;
  label: string;
  portions: number;
  ingredients: IngredientAmount[];
  storedAt: IsoDateTime;
  storageLocation: "refrigerator" | "freezer";
  useBy: string;
  status: "available" | "reserved" | "consumed" | "discarded";
}

export interface LeftoverReuseOption {
  id: EntityId;
  leftoverBatchId: EntityId;
  targetDate: string;
  slot: MealPlanEntry["slot"];
  title: string;
  requiredAdditions: IngredientAmount[];
  estimatedMinutes: number;
  safetyNotes: string[];
  approvalState: "draft" | "recommended" | "approved" | "rejected";
}

export interface LeftoverDecision {
  option?: LeftoverReuseOption;
  reasons: string[];
}

const daysBetween = (from: string, to: string): number =>
  Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

export const validateLeftoverBatch = (
  batch: LeftoverBatch,
  today: string,
): string[] => {
  const errors: string[] = [];

  if (batch.portions <= 0) errors.push("leftover-portions-must-be-positive");
  if (batch.ingredients.length === 0) errors.push("leftover-ingredients-required");
  if (Date.parse(batch.useBy) < Date.parse(today)) {
    errors.push("leftover-use-by-expired");
  }
  if (batch.status !== "available") {
    errors.push(`leftover-not-available:${batch.status}`);
  }

  return errors;
};

export const proposeLeftoverReuse = (
  batch: LeftoverBatch,
  targetDate: string,
  slot: MealPlanEntry["slot"],
): LeftoverDecision => {
  const errors = validateLeftoverBatch(batch, targetDate);
  if (errors.length > 0) return { reasons: errors };

  const storageDays = daysBetween(batch.storedAt.slice(0, 10), targetDate);
  const safetyNotes = [
    "Reste vor dem Verzehr vollständig durcherhitzen.",
    "Geruch, Aussehen und Konsistenz vor der Verwendung prüfen.",
  ];

  if (batch.storageLocation === "refrigerator" && storageDays >= 2) {
    safetyNotes.push("Kühl gelagerte Reste bevorzugt heute verbrauchen.");
  }

  return {
    reasons: ["available-leftover-reuse-option"],
    option: {
      id: `leftover-reuse-${batch.id}-${targetDate}-${slot}`,
      leftoverBatchId: batch.id,
      targetDate,
      slot,
      title: `${batch.label} als Restemahlzeit`,
      requiredAdditions: [],
      estimatedMinutes: 10,
      safetyNotes,
      approvalState: "recommended",
    },
  };
};

export const reserveLeftover = (
  batch: LeftoverBatch,
  option: LeftoverReuseOption,
): LeftoverBatch => {
  if (batch.id !== option.leftoverBatchId) {
    throw new Error("Leftover option does not reference the supplied batch.");
  }
  if (option.approvalState !== "approved") {
    throw new Error("Leftover reuse must be approved before reservation.");
  }
  if (batch.status !== "available") {
    throw new Error("Only available leftovers can be reserved.");
  }

  return { ...batch, status: "reserved" };
};

export const completeLeftoverReuse = (batch: LeftoverBatch): LeftoverBatch => {
  if (batch.status !== "reserved") {
    throw new Error("Only reserved leftovers can be marked consumed.");
  }
  return { ...batch, status: "consumed", portions: 0 };
};
