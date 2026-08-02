import {
  completeLeftoverReuse,
  proposeLeftoverReuse,
  reserveLeftover,
  type LeftoverBatch,
} from "../cooking/leftovers";

const batch: LeftoverBatch = {
  id: "leftover-demo-soup",
  householdId: "household-demo",
  sourceMealPlanEntryId: "meal-2026-08-03-dinner-recipe-mild-vegetable-soup",
  label: "Milde Gemüsecremesuppe",
  portions: 2,
  ingredients: [
    { ingredientId: "potato", label: "Kartoffeln", quantity: 250, unit: "g" },
    { ingredientId: "carrot", label: "Karotten", quantity: 150, unit: "g" },
    { ingredientId: "zucchini", label: "Zucchini", quantity: 125, unit: "g" },
  ],
  storedAt: "2026-08-03T18:15:00.000Z",
  storageLocation: "refrigerator",
  useBy: "2026-08-05",
  status: "available",
};

export const runLeftoverAcceptanceScenario = () => {
  const proposal = proposeLeftoverReuse(batch, "2026-08-04", "lunch");
  if (!proposal.option) {
    return {
      proposal,
      approvedOption: undefined,
      reserved: undefined,
      consumed: undefined,
    };
  }

  const approvedOption = {
    ...proposal.option,
    approvalState: "approved" as const,
  };
  const reserved = reserveLeftover(batch, approvedOption);
  const consumed = completeLeftoverReuse(reserved);

  return { proposal, approvedOption, reserved, consumed };
};

export const assertLeftoverAcceptance = (): void => {
  const result = runLeftoverAcceptanceScenario();
  const failures: string[] = [];

  if (!result.proposal.option) failures.push("leftover-option-not-generated");
  if (result.reserved?.status !== "reserved") {
    failures.push("leftover-not-reserved-after-approval");
  }
  if (result.consumed?.status !== "consumed") {
    failures.push("leftover-not-consumed");
  }
  if (result.consumed?.portions !== 0) {
    failures.push("leftover-portions-not-cleared");
  }

  const expired = proposeLeftoverReuse(
    { ...batch, useBy: "2026-08-03" },
    "2026-08-04",
    "lunch",
  );
  if (!expired.reasons.includes("leftover-use-by-expired")) {
    failures.push("expired-leftover-not-blocked");
  }

  if (failures.length > 0) throw new Error(failures.join("\n"));
};
