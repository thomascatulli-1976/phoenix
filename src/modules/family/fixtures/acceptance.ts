import { validateFamilyContext } from "../core/policy";
import { compileThermomixRecipe } from "../cooking/compiler";
import { completeCurrentStep } from "../cooking/session";
import { planFamilyWeek } from "../cooking/weekly-planning";
import { demoFamilyContext } from "./demo-family";
import {
  demoRecipeCandidates,
  mildVegetableSoupRecipe,
} from "./demo-recipes";
import { runDemoFamilyScenario } from "./demo-scenario";

export interface AcceptanceCheck {
  name: string;
  passed: boolean;
  detail: string;
}

const check = (
  name: string,
  condition: boolean,
  detail: string,
): AcceptanceCheck => ({ name, passed: condition, detail });

export const runFamilyAcceptanceChecks = (): AcceptanceCheck[] => {
  const contextErrors = validateFamilyContext(demoFamilyContext);

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

  const scenario = runDemoFamilyScenario();
  const selectedMeal = weeklyPlan.entries[0];
  const selectedAssessment = weeklyPlan.entries.length > 0;
  const lowCarbVariant = selectedMeal?.memberVariants.find(
    (variant) => variant.memberId === "member-parent-b",
  );

  const unapprovedCompilation = selectedMeal
    ? compileThermomixRecipe({
        meal: { ...selectedMeal, approvalState: "recommended" },
        recipe: mildVegetableSoupRecipe,
        model: "TM6",
      })
    : undefined;

  let completedSession = scenario.session?.session;
  if (completedSession) {
    while (completedSession.status === "active") {
      completedSession = completeCurrentStep(
        completedSession,
        "2026-08-03T18:00:00.000Z",
      ).session;
    }
  }

  return [
    check(
      "family-context-valid",
      contextErrors.length === 0,
      contextErrors.length === 0
        ? "Demo household satisfies Family Core invariants."
        : contextErrors.join(", "),
    ),
    check(
      "weekly-plan-ready",
      weeklyPlan.approvalState === "ready-for-approval",
      `Approval state: ${weeklyPlan.approvalState}`,
    ),
    check(
      "vegetarian-base-selected",
      selectedAssessment && selectedMeal?.recipeId === "recipe-mild-vegetable-soup",
      selectedMeal
        ? `Selected recipe: ${selectedMeal.recipeId}`
        : "No meal selected.",
    ),
    check(
      "low-carb-variant-created",
      lowCarbVariant?.removedIngredientIds.includes("potato") === true,
      lowCarbVariant
        ? `Removed ingredients: ${lowCarbVariant.removedIngredientIds.join(", ")}`
        : "No low-carbohydrate variant created.",
    ),
    check(
      "shopping-list-generated",
      weeklyPlan.shoppingList.length > 0,
      `Shopping items: ${weeklyPlan.shoppingList.length}`,
    ),
    check(
      "approval-required-before-compilation",
      unapprovedCompilation?.errors.includes(
        "meal-must-be-approved-before-compilation",
      ) === true,
      unapprovedCompilation?.errors.join(", ") ?? "Compilation not attempted.",
    ),
    check(
      "approved-recipe-compiles",
      scenario.compilation?.errors.length === 0,
      scenario.compilation
        ? `Compiled steps: ${scenario.compilation.steps.length}`
        : "No compilation result.",
    ),
    check(
      "guided-session-starts",
      scenario.session?.session.status === "active",
      scenario.session
        ? `Session status: ${scenario.session.session.status}`
        : "No session created.",
    ),
    check(
      "guided-session-completes",
      completedSession?.status === "completed",
      completedSession
        ? `Final session status: ${completedSession.status}`
        : "No session available.",
    ),
  ];
};

export const assertFamilyAcceptance = (): void => {
  const failures = runFamilyAcceptanceChecks().filter((item) => !item.passed);
  if (failures.length > 0) {
    throw new Error(
      failures.map((failure) => `${failure.name}: ${failure.detail}`).join("\n"),
    );
  }
};
