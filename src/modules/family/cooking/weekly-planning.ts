import type { FamilyContextSnapshot } from "../core/domain";
import type { MealPlanEntry, MealSlot, ShoppingListItem } from "./domain";
import {
  buildShoppingList,
  planFamilyMeal,
  type CandidateAssessment,
  type RecipeCandidate,
} from "./planning";

export interface WeeklyMealRequest {
  date: string;
  slot: MealSlot;
  candidates: RecipeCandidate[];
  maximumMinutes?: number;
}

export interface WeeklyPlanningRequest {
  context: FamilyContextSnapshot;
  meals: WeeklyMealRequest[];
  availableIngredientIds: string[];
}

export interface WeeklyMealFailure {
  date: string;
  slot: MealSlot;
  conflicts: string[];
  assessments: CandidateAssessment[];
}

export interface WeeklyPlanningResult {
  entries: MealPlanEntry[];
  failures: WeeklyMealFailure[];
  shoppingList: ShoppingListItem[];
  approvalState: "draft" | "ready-for-approval";
}

export const planFamilyWeek = (
  request: WeeklyPlanningRequest,
): WeeklyPlanningResult => {
  const entries: MealPlanEntry[] = [];
  const failures: WeeklyMealFailure[] = [];

  for (const meal of request.meals) {
    const result = planFamilyMeal({
      context: request.context,
      date: meal.date,
      slot: meal.slot,
      candidates: meal.candidates,
      availableIngredientIds: request.availableIngredientIds,
      maximumMinutes: meal.maximumMinutes,
    });

    if (result.entry) {
      entries.push(result.entry);
    } else {
      failures.push({
        date: meal.date,
        slot: meal.slot,
        conflicts: result.unresolvedConflicts,
        assessments: result.assessments,
      });
    }
  }

  return {
    entries,
    failures,
    shoppingList: buildShoppingList(
      request.context.household.id,
      entries,
      request.availableIngredientIds,
    ),
    approvalState:
      entries.length > 0 && failures.length === 0
        ? "ready-for-approval"
        : "draft",
  };
};
