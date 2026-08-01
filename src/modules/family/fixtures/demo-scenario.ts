import { approveWeeklyPlan, requestWeeklyPlanApproval } from "../cooking/approval";
import { compileThermomixRecipe } from "../cooking/compiler";
import { createCookingSession, startCookingSession } from "../cooking/session";
import { planFamilyWeek } from "../cooking/weekly-planning";
import { demoFamilyContext } from "./demo-family";
import {
  demoRecipeCandidates,
  mildVegetableSoupRecipe,
} from "./demo-recipes";

export const runDemoFamilyScenario = () => {
  const weeklyPlan = planFamilyWeek({
    context: demoFamilyContext,
    availableIngredientIds: ["carrot", "zucchini", "water"],
    meals: [
      {
        date: "2026-08-03",
        slot: "dinner",
        candidates: demoRecipeCandidates,
        maximumMinutes: 35,
      },
    ],
  });

  if (weeklyPlan.approvalState !== "ready-for-approval") {
    return {
      weeklyPlan,
      approval: undefined,
      compilation: undefined,
      session: undefined,
    };
  }

  const approvalRequest = requestWeeklyPlanApproval({
    householdId: demoFamilyContext.household.id,
    requestedByMemberId: "member-parent-a",
    entries: weeklyPlan.entries,
    requestedAt: "2026-08-01T21:40:00.000Z",
  });

  const approval = approveWeeklyPlan({
    request: approvalRequest,
    decidedByMemberId: "member-parent-a",
    decidedAt: "2026-08-01T21:41:00.000Z",
    reason: "Familienplan geprüft und freigegeben.",
  });

  const approvedMeal = approval.entries[0];
  const compilation = compileThermomixRecipe({
    meal: approvedMeal,
    recipe: mildVegetableSoupRecipe,
    model: "TM6",
  });

  if (compilation.errors.length > 0) {
    return { weeklyPlan, approval, compilation, session: undefined };
  }

  const plannedSession = createCookingSession({
    id: "session-demo-soup",
    householdId: demoFamilyContext.household.id,
    mealPlanEntryId: approvedMeal.id,
    model: "TM6",
    steps: compilation.steps,
  });

  const session = startCookingSession(
    plannedSession,
    "2026-08-03T17:30:00.000Z",
  );

  return { weeklyPlan, approval, compilation, session };
};
