import { assertFamilyAcceptance } from "./acceptance";
import { assertCalendarAcceptance } from "./calendar-acceptance";
import { assertChoreAcceptance } from "./chore-acceptance";
import { assertKidsKitchenAcceptance } from "./kids-kitchen-acceptance";
import { assertLearningAcceptance } from "./learning-acceptance";
import { assertLeftoverAcceptance } from "./leftover-acceptance";
import { assertOperationsAcceptance } from "./operations-acceptance";
import { assertShoppingBudgetAcceptance } from "./shopping-budget-acceptance";

export interface AcceptanceSuiteResult {
  suite: string;
  passed: boolean;
  error?: string;
}

const SUITES: Array<{ name: string; run: () => void }> = [
  { name: "family-vertical-slice", run: assertFamilyAcceptance },
  { name: "learning", run: assertLearningAcceptance },
  { name: "calendar", run: assertCalendarAcceptance },
  { name: "shopping-budget", run: assertShoppingBudgetAcceptance },
  { name: "kids-kitchen", run: assertKidsKitchenAcceptance },
  { name: "leftovers", run: assertLeftoverAcceptance },
  { name: "chores", run: assertChoreAcceptance },
  { name: "operations-cockpit", run: assertOperationsAcceptance },
];

export const runPhoenixFamilyAcceptanceSuite = (): AcceptanceSuiteResult[] =>
  SUITES.map(({ name, run }) => {
    try {
      run();
      return { suite: name, passed: true };
    } catch (error) {
      return {
        suite: name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

export const assertPhoenixFamilyAcceptanceSuite = (): void => {
  const failures = runPhoenixFamilyAcceptanceSuite().filter(
    (result) => !result.passed,
  );

  if (failures.length > 0) {
    throw new Error(
      failures
        .map((failure) => `${failure.suite}: ${failure.error ?? "unknown failure"}`)
        .join("\n"),
    );
  }
};
