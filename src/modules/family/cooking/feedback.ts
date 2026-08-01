import type { FeedbackSignal, FamilyContextSnapshot } from "../core/domain";

export interface MealFeedbackInput {
  householdId: string;
  memberId: string;
  mealId: string;
  signal: FeedbackSignal["signal"];
  notes?: string;
  recordedAt: string;
  recordedBy: string;
}

export interface MemberLearningSummary {
  memberId: string;
  likedMealIds: string[];
  dislikedMealIds: string[];
  refusedMealIds: string[];
  notToleratedMealIds: string[];
  leftoverMealIds: string[];
}

export const createMealFeedback = (
  input: MealFeedbackInput,
): FeedbackSignal => ({
  id: `feedback-${input.memberId}-${input.mealId}-${input.recordedAt}`,
  householdId: input.householdId,
  memberId: input.memberId,
  subjectType: "meal",
  subjectId: input.mealId,
  signal: input.signal,
  notes: input.notes,
  recordedAt: input.recordedAt,
  metadata: {
    ownerMemberId: input.memberId,
    visibility: "guardians",
    consentStatus: "granted",
    provenance: {
      source: input.recordedBy === input.memberId ? "user" : "guardian",
      recordedAt: input.recordedAt,
      recordedBy: input.recordedBy,
      confidence: 1,
    },
    lastUpdatedAt: input.recordedAt,
  },
});

export const summarizeMemberLearning = (
  context: FamilyContextSnapshot,
  memberId: string,
): MemberLearningSummary => {
  const feedback = context.feedback.filter(
    (signal) => signal.memberId === memberId && signal.subjectType === "meal",
  );

  const subjectsFor = (signal: FeedbackSignal["signal"]): string[] =>
    feedback
      .filter((item) => item.signal === signal)
      .map((item) => item.subjectId);

  return {
    memberId,
    likedMealIds: subjectsFor("liked"),
    dislikedMealIds: subjectsFor("disliked"),
    refusedMealIds: subjectsFor("refused"),
    notToleratedMealIds: subjectsFor("not-tolerated"),
    leftoverMealIds: subjectsFor("leftover"),
  };
};
