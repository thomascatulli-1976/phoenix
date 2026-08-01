import type { EntityId, IsoDateTime } from "../core/domain";

export type ThermomixModel = "TM5" | "TM6" | "TM7" | "unknown";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface ThermomixProfile {
  householdId: EntityId;
  model: ThermomixModel;
  accessories: Array<"varoma" | "simmering-basket" | "butterfly-whisk" | "spatula" | "peeler-cover">;
  guidedModeExperience: "beginner" | "comfortable" | "advanced";
}

export interface IngredientAmount {
  ingredientId: EntityId;
  label: string;
  quantity: number;
  unit: "g" | "kg" | "ml" | "l" | "piece" | "tbsp" | "tsp" | "pinch";
  preparation?: string;
}

export interface MemberMealVariant {
  memberId: EntityId;
  label: string;
  addedIngredients: IngredientAmount[];
  removedIngredientIds: EntityId[];
  notes: string[];
}

export interface MealPlanEntry {
  id: EntityId;
  householdId: EntityId;
  date: string;
  slot: MealSlot;
  recipeId: EntityId;
  title: string;
  baseIngredients: IngredientAmount[];
  memberVariants: MemberMealVariant[];
  estimatedMinutes: number;
  approvalState: "draft" | "recommended" | "approved" | "rejected";
  constraintIds: EntityId[];
}

export interface ThermomixStep {
  id: EntityId;
  sequence: number;
  title: string;
  instruction: string;
  ingredients: IngredientAmount[];
  vessel: "mixing-bowl" | "varoma" | "varoma-tray" | "simmering-basket" | "external-bowl";
  durationSeconds?: number;
  temperatureCelsius?: number;
  speed?: number | "spoon";
  reverse?: boolean;
  measuringCup: "inserted" | "removed" | "not-applicable";
  expectedResult: string;
  recoveryInstruction?: string;
  safetyNote?: string;
}

export interface CookingSession {
  id: EntityId;
  householdId: EntityId;
  mealPlanEntryId: EntityId;
  model: ThermomixModel;
  status: "planned" | "active" | "paused" | "completed" | "aborted";
  currentStep: number;
  steps: ThermomixStep[];
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
}

export interface ShoppingListItem {
  id: EntityId;
  householdId: EntityId;
  ingredientId: EntityId;
  label: string;
  quantity: number;
  unit: IngredientAmount["unit"];
  category: "produce" | "dairy" | "protein" | "pantry" | "bakery" | "frozen" | "other";
  sourceMealIds: EntityId[];
  checked: boolean;
}
