import type { FeedbackSignal } from "../core/domain";
import { appendFeedback } from "../cooking/learning";
import { planFamilyMeal, type RecipeCandidate } from "../cooking/planning";
import { demoFamilyContext } from "./demo-family";

const recordedAt = "2026-08-05T18:30:00.000Z";

const equalCandidates: RecipeCandidate[] = [
  {
    id: "recipe-a",
    title: "Gemüsegericht A",
    ingredients: [
      { ingredientId: "carrot", label: "Karotten", quantity: 300, unit: "g" },
    ],
    tags: ["vegetarian"],
    estimatedMinutes: 20,
  },
  {
    id: "recipe-b",
    title: "Gemüsegericht B",
    ingredients: [
      { ingredientId: "zucchini", label: "Zucchini", quantity: 300, unit: "g" },
    ],
    tags: ["vegetarian"],
    estimatedMinutes: 20,
  },
];

const feedback: FeedbackSignal[] = [
  {
    id: "feedback-a-liked",
    householdId: demoFamilyContext.household.id,
    memberId: "member-parent-a",
    subjectType: "recipe",
    subjectId: "recipe-a",
    signal: "liked",
    recordedAt,
    metadata: {
      ownerMemberId: "member-parent-a",
      visibility: "household",
      consentStatus: "granted",
      provenance: {
        source: "user",
        recordedAt,
        recordedBy: "member-parent-a",
        confidence: 1,
      },
      lastUpdatedAt: recordedAt,
    },
  },
];

export const runLearningAcceptanceScenario = () => {
  const learnedContext = appendFeedback(demoFamilyContext, feedback);
  const learnedPlan = planFamilyMeal({
    context: learnedContext,
    date: "2026-08-06",
    slot: "dinner",
    candidates: equalCandidates,
    availableIngredientIds: ["carrot", "zucchini"],
  });

  const strictConflictCandidate: RecipeCandidate = {
    id: "recipe-meat-favorite",
    title: "Beliebtes Fleischgericht",
    ingredients: [
      { ingredientId: "meat", label: "Fleisch", quantity: 400, unit: "g" },
    ],
    tags: ["favorite"],
    estimatedMinutes: 20,
  };

  const favoriteFeedback: FeedbackSignal = {
    ...feedback[0],
    id: "feedback-meat-liked-many-times",
    subjectId: strictConflictCandidate.id,
    value: 100,
  };

  const guardedContext = appendFeedback(demoFamilyContext, [favoriteFeedback]);
  const guardedPlan = planFamilyMeal({
    context: guardedContext,
    date: "2026-08-07",
    slot: "dinner",
    candidates: [strictConflictCandidate, equalCandidates[0]],
    availableIngredientIds: ["meat", "carrot"],
  });

  return {
    learningSelectsPreferredRecipe:
      learnedPlan.entry?.recipeId === "recipe-a",
    learningAdjustmentIsBounded:
      Math.abs(
        guardedPlan.assessments.find(
          (assessment) => assessment.candidateId === strictConflictCandidate.id,
        )?.learningAdjustment ?? 0,
      ) <= 10,
    strictConstraintStillWins:
      guardedPlan.entry?.recipeId !== strictConflictCandidate.id,
    learnedPlan,
    guardedPlan,
  };
};

export const assertLearningAcceptance = (): void => {
  const result = runLearningAcceptanceScenario();
  const failures: string[] = [];

  if (!result.learningSelectsPreferredRecipe) {
    failures.push("learning-did-not-break-safe-tie");
  }
  if (!result.learningAdjustmentIsBounded) {
    failures.push("learning-adjustment-not-bounded");
  }
  if (!result.strictConstraintStillWins) {
    failures.push("learning-overrode-strict-constraint");
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
};
