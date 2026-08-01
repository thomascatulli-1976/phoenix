import type {
  DietaryConstraint,
  FamilyContextSnapshot,
  HouseholdMember,
} from "../core/domain";
import type {
  IngredientAmount,
  MealPlanEntry,
  MemberMealVariant,
  ShoppingListItem,
} from "./domain";
import { scoreRecipeFromFeedback } from "./learning";

export interface RecipeCandidate {
  id: string;
  title: string;
  ingredients: IngredientAmount[];
  tags: string[];
  estimatedMinutes: number;
}

export interface PlanningRequest {
  context: FamilyContextSnapshot;
  date: string;
  slot: MealPlanEntry["slot"];
  candidates: RecipeCandidate[];
  availableIngredientIds: string[];
  maximumMinutes?: number;
  learningWeight?: number;
}

export interface CandidateAssessment {
  candidateId: string;
  score: number;
  baseScore: number;
  learningAdjustment: number;
  blocked: boolean;
  reasons: string[];
  memberVariants: MemberMealVariant[];
  appliedConstraintIds: string[];
}

export interface PlanningResult {
  entry?: MealPlanEntry;
  assessments: CandidateAssessment[];
  unresolvedConflicts: string[];
}

const ingredientMatches = (
  ingredient: IngredientAmount,
  constraint: DietaryConstraint,
): boolean => {
  const needle = constraint.label.trim().toLowerCase();
  return (
    ingredient.ingredientId.toLowerCase() === needle ||
    ingredient.label.toLowerCase().includes(needle)
  );
};

const constraintsForMember = (
  context: FamilyContextSnapshot,
  member: HouseholdMember,
): DietaryConstraint[] =>
  context.dietaryConstraints.filter(
    (constraint) =>
      constraint.memberId === member.id &&
      constraint.metadata.consentStatus === "granted",
  );

const boundedLearningAdjustment = (
  context: FamilyContextSnapshot,
  recipeId: string,
  learningWeight: number,
): number => {
  const learned = scoreRecipeFromFeedback(context, recipeId).householdScore;
  const bounded = Math.max(-20, Math.min(20, learned));
  return bounded * learningWeight;
};

const assessCandidate = (
  request: PlanningRequest,
  candidate: RecipeCandidate,
): CandidateAssessment => {
  const reasons: string[] = [];
  const variants: MemberMealVariant[] = [];
  const appliedConstraintIds = new Set<string>();
  let baseScore = 100;
  let blocked = false;

  if (
    request.maximumMinutes !== undefined &&
    candidate.estimatedMinutes > request.maximumMinutes
  ) {
    baseScore -= 40;
    reasons.push("candidate exceeds maximum preparation time");
  }

  const available = new Set(request.availableIngredientIds);
  const missingCount = candidate.ingredients.filter(
    (ingredient) => !available.has(ingredient.ingredientId),
  ).length;
  baseScore -= missingCount * 3;
  if (missingCount > 0) {
    reasons.push(`${missingCount} ingredient(s) must be purchased`);
  }

  for (const member of request.context.members.filter((item) => item.active)) {
    const removedIngredientIds = new Set<string>();
    const notes: string[] = [];

    for (const constraint of constraintsForMember(request.context, member)) {
      const conflicts = candidate.ingredients.filter((ingredient) =>
        ingredientMatches(ingredient, constraint),
      );

      if (conflicts.length === 0) {
        continue;
      }

      appliedConstraintIds.add(constraint.id);

      if (constraint.severity === "strict") {
        conflicts.forEach((ingredient) =>
          removedIngredientIds.add(ingredient.ingredientId),
        );
        notes.push(`Strict constraint applied: ${constraint.label}`);
        baseScore -= 12;
      } else if (constraint.severity === "avoid") {
        conflicts.forEach((ingredient) =>
          removedIngredientIds.add(ingredient.ingredientId),
        );
        notes.push(`Avoidance applied: ${constraint.label}`);
        baseScore -= 6;
      } else {
        notes.push(`Preference conflict noted: ${constraint.label}`);
        baseScore -= 2;
      }
    }

    if (removedIngredientIds.size > 0 || notes.length > 0) {
      const allBaseIngredientsRemoved =
        removedIngredientIds.size === candidate.ingredients.length;

      if (allBaseIngredientsRemoved) {
        blocked = true;
        reasons.push(`No viable base remains for member ${member.id}`);
      }

      variants.push({
        memberId: member.id,
        label: `${candidate.title} – ${member.displayName}`,
        addedIngredients: [],
        removedIngredientIds: [...removedIngredientIds],
        notes,
      });
    }
  }

  const learningAdjustment = boundedLearningAdjustment(
    request.context,
    candidate.id,
    request.learningWeight ?? 0.5,
  );
  if (learningAdjustment !== 0) {
    reasons.push(`governed learning adjustment: ${learningAdjustment}`);
  }

  const score = blocked
    ? Number.NEGATIVE_INFINITY
    : baseScore + learningAdjustment;

  return {
    candidateId: candidate.id,
    score,
    baseScore,
    learningAdjustment,
    blocked,
    reasons,
    memberVariants: variants,
    appliedConstraintIds: [...appliedConstraintIds],
  };
};

export const planFamilyMeal = (request: PlanningRequest): PlanningResult => {
  const assessments = request.candidates
    .map((candidate) => assessCandidate(request, candidate))
    .sort((left, right) => right.score - left.score);

  const selectedAssessment = assessments.find((assessment) => !assessment.blocked);
  if (!selectedAssessment) {
    return {
      assessments,
      unresolvedConflicts: ["No candidate satisfies the active strict constraints."],
    };
  }

  const selectedCandidate = request.candidates.find(
    (candidate) => candidate.id === selectedAssessment.candidateId,
  );
  if (!selectedCandidate) {
    throw new Error("Selected candidate is missing from the planning request.");
  }

  return {
    assessments,
    unresolvedConflicts: [],
    entry: {
      id: `meal-${request.date}-${request.slot}-${selectedCandidate.id}`,
      householdId: request.context.household.id,
      date: request.date,
      slot: request.slot,
      recipeId: selectedCandidate.id,
      title: selectedCandidate.title,
      baseIngredients: selectedCandidate.ingredients,
      memberVariants: selectedAssessment.memberVariants,
      estimatedMinutes: selectedCandidate.estimatedMinutes,
      approvalState: "recommended",
      constraintIds: selectedAssessment.appliedConstraintIds,
    },
  };
};

export const buildShoppingList = (
  householdId: string,
  entries: MealPlanEntry[],
  availableIngredientIds: string[],
): ShoppingListItem[] => {
  const available = new Set(availableIngredientIds);
  const aggregated = new Map<string, ShoppingListItem>();

  for (const entry of entries) {
    for (const ingredient of entry.baseIngredients) {
      if (available.has(ingredient.ingredientId)) {
        continue;
      }

      const key = `${ingredient.ingredientId}:${ingredient.unit}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity += ingredient.quantity;
        if (!existing.sourceMealIds.includes(entry.id)) {
          existing.sourceMealIds.push(entry.id);
        }
        continue;
      }

      aggregated.set(key, {
        id: `shopping-${key}`,
        householdId,
        ingredientId: ingredient.ingredientId,
        label: ingredient.label,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: "other",
        sourceMealIds: [entry.id],
        checked: false,
      });
    }
  }

  return [...aggregated.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
};
