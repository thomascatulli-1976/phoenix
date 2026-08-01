import type { FamilyContextSnapshot, FeedbackSignal } from "../core/domain";
import type { RecipeCandidate } from "./planning";

export interface RecipeLearningScore {
  recipeId: string;
  householdScore: number;
  memberScores: Record<string, number>;
  reasons: string[];
}

const SIGNAL_WEIGHT: Record<FeedbackSignal["signal"], number> = {
  liked: 4,
  accepted: 2,
  tolerated: 3,
  disliked: -3,
  refused: -5,
  "not-tolerated": -8,
  leftover: -1,
};

export const scoreRecipeFromFeedback = (
  context: FamilyContextSnapshot,
  recipeId: string,
): RecipeLearningScore => {
  const relevant = context.feedback.filter(
    (signal) =>
      (signal.subjectType === "recipe" || signal.subjectType === "meal") &&
      signal.subjectId === recipeId &&
      signal.metadata.consentStatus === "granted",
  );

  const memberScores: Record<string, number> = {};
  const reasons: string[] = [];

  for (const signal of relevant) {
    const weighted = SIGNAL_WEIGHT[signal.signal] * (signal.value ?? 1);
    memberScores[signal.memberId] = (memberScores[signal.memberId] ?? 0) + weighted;
    reasons.push(`${signal.memberId}:${signal.signal}:${weighted}`);
  }

  return {
    recipeId,
    householdScore: Object.values(memberScores).reduce(
      (sum, value) => sum + value,
      0,
    ),
    memberScores,
    reasons,
  };
};

export const rankCandidatesFromLearning = (
  context: FamilyContextSnapshot,
  candidates: RecipeCandidate[],
): Array<RecipeCandidate & { learningScore: number }> =>
  candidates
    .map((candidate) => ({
      ...candidate,
      learningScore: scoreRecipeFromFeedback(context, candidate.id).householdScore,
    }))
    .sort((left, right) => right.learningScore - left.learningScore);

export const appendFeedback = (
  context: FamilyContextSnapshot,
  signals: FeedbackSignal[],
): FamilyContextSnapshot => ({
  ...context,
  feedback: [...context.feedback, ...signals],
  generatedAt:
    signals.length > 0
      ? signals.reduce(
          (latest, signal) =>
            signal.recordedAt > latest ? signal.recordedAt : latest,
          context.generatedAt,
        )
      : context.generatedAt,
});
