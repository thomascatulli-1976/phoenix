import type { FeedbackSignal } from "../core/domain";
import { appendFeedback, rankCandidatesFromLearning } from "../cooking/learning";
import { demoFamilyContext } from "./demo-family";
import { demoRecipeCandidates } from "./demo-recipes";

const recordedAt = "2026-08-03T18:10:00.000Z";

export const demoFeedbackSignals: FeedbackSignal[] = [
  {
    id: "feedback-alex-soup-liked",
    householdId: demoFamilyContext.household.id,
    memberId: "member-parent-a",
    subjectType: "recipe",
    subjectId: "recipe-mild-vegetable-soup",
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
  {
    id: "feedback-sam-soup-accepted",
    householdId: demoFamilyContext.household.id,
    memberId: "member-parent-b",
    subjectType: "recipe",
    subjectId: "recipe-mild-vegetable-soup",
    signal: "accepted",
    recordedAt,
    metadata: {
      ownerMemberId: "member-parent-b",
      visibility: "household",
      consentStatus: "granted",
      provenance: {
        source: "user",
        recordedAt,
        recordedBy: "member-parent-b",
        confidence: 1,
      },
      lastUpdatedAt: recordedAt,
    },
  },
  {
    id: "feedback-mia-soup-liked",
    householdId: demoFamilyContext.household.id,
    memberId: "member-child-a",
    subjectType: "recipe",
    subjectId: "recipe-mild-vegetable-soup",
    signal: "liked",
    recordedAt,
    metadata: {
      ownerMemberId: "member-child-a",
      visibility: "guardians",
      consentStatus: "granted",
      provenance: {
        source: "guardian",
        recordedAt,
        recordedBy: "member-parent-a",
        confidence: 1,
      },
      lastUpdatedAt: recordedAt,
    },
  },
  {
    id: "feedback-leo-soup-leftover",
    householdId: demoFamilyContext.household.id,
    memberId: "member-child-b",
    subjectType: "recipe",
    subjectId: "recipe-mild-vegetable-soup",
    signal: "leftover",
    value: 0.5,
    recordedAt,
    metadata: {
      ownerMemberId: "member-child-b",
      visibility: "guardians",
      consentStatus: "granted",
      provenance: {
        source: "guardian",
        recordedAt,
        recordedBy: "member-parent-a",
        confidence: 0.9,
      },
      lastUpdatedAt: recordedAt,
    },
  },
];

export const runDemoLearningScenario = () => {
  const context = appendFeedback(demoFamilyContext, demoFeedbackSignals);
  const ranking = rankCandidatesFromLearning(context, demoRecipeCandidates);

  return {
    context,
    ranking,
    preferredRecipeId: ranking[0]?.id,
  };
};
