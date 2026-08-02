import {
  approveChoreAssignment,
  completeChore,
  proposeChoreAssignment,
  startChore,
  type HouseholdChore,
} from "../household/chores";

const kitchenChore: HouseholdChore = {
  id: "chore-clear-table",
  householdId: "household-demo",
  title: "Tisch abräumen",
  description: "Geschirr sammeln und in die Küche bringen.",
  area: "kitchen",
  riskLevel: "low",
  estimatedMinutes: 10,
  recurring: "daily",
  allowedAgeBands: ["6-9", "10-13", "14-17", "adult"],
};

const laundryChore: HouseholdChore = {
  id: "chore-load-washer",
  householdId: "household-demo",
  title: "Waschmaschine beladen",
  description: "Wäsche sortieren und unter Aufsicht einlegen.",
  area: "laundry",
  riskLevel: "medium",
  estimatedMinutes: 15,
  recurring: "weekly",
  allowedAgeBands: ["10-13", "14-17", "adult"],
};

export const runChoreAcceptanceScenario = () => {
  const lowRiskAssignment = proposeChoreAssignment(
    kitchenChore,
    "member-child-a",
    "6-9",
    "member-parent-a",
    "2026-08-02T08:00:00.000Z",
  );

  const lowRiskStarted = startChore(
    lowRiskAssignment,
    "2026-08-02T08:05:00.000Z",
  );
  const lowRiskCompleted = completeChore(
    lowRiskStarted,
    "2026-08-02T08:15:00.000Z",
    "Gemeinsam kontrolliert.",
  );

  const mediumRiskDraft = proposeChoreAssignment(
    laundryChore,
    "member-child-b",
    "10-13",
    "member-parent-a",
    "2026-08-02T09:00:00.000Z",
  );
  const mediumRiskApproved = approveChoreAssignment(
    mediumRiskDraft,
    "member-parent-a",
    ["member-parent-a", "member-parent-b"],
    "2026-08-02T09:01:00.000Z",
  );

  let unsafeAgeBandBlocked = false;
  try {
    proposeChoreAssignment(
      laundryChore,
      "member-child-a",
      "6-9",
      "member-parent-a",
      "2026-08-02T09:05:00.000Z",
    );
  } catch {
    unsafeAgeBandBlocked = true;
  }

  return {
    lowRiskAssignedWithoutExtraApproval:
      lowRiskAssignment.status === "assigned" &&
      lowRiskAssignment.requiresGuardianApproval === false,
    lowRiskCompleted: lowRiskCompleted.status === "completed",
    mediumRiskRequiresGuardianApproval:
      mediumRiskDraft.status === "draft" &&
      mediumRiskDraft.requiresGuardianApproval === true,
    mediumRiskApproved:
      mediumRiskApproved.status === "assigned" &&
      mediumRiskApproved.approvedBy === "member-parent-a",
    unsafeAgeBandBlocked,
  };
};

export const assertChoreAcceptance = (): void => {
  const result = runChoreAcceptanceScenario();
  const failures = Object.entries(result)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
};
