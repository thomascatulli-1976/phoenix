import {
  approveShoppingOrder,
  decideShoppingExecution,
  markShoppingExecutionCompleted,
  priceShoppingList,
  proposeShoppingOrder,
  requestShoppingExecution,
  type ShoppingBudget,
} from "../finance/shopping-budget";
import type { ShoppingListItem } from "../cooking/domain";

const shoppingList: ShoppingListItem[] = [
  {
    id: "shopping-carrot:g",
    householdId: "household-demo",
    ingredientId: "carrot",
    label: "Karotten",
    quantity: 0.5,
    unit: "kg",
    category: "produce",
    sourceMealIds: ["meal-demo"],
    checked: false,
  },
  {
    id: "shopping-cream-cheese:g",
    householdId: "household-demo",
    ingredientId: "cream-cheese",
    label: "Frischkäse",
    quantity: 1,
    unit: "piece",
    category: "dairy",
    sourceMealIds: ["meal-demo"],
    checked: false,
  },
];

const budget: ShoppingBudget = {
  id: "budget-week-32",
  householdId: "household-demo",
  currency: "EUR",
  maximumAmount: 25,
  period: "week",
  validFrom: "2026-08-03",
  validUntil: "2026-08-09",
};

export const runShoppingBudgetAcceptance = () => {
  const pricedItems = priceShoppingList(shoppingList, {
    "shopping-carrot:g": {
      unitPrice: 2.4,
      retailer: "demo-market",
      confidence: 0.9,
    },
    "shopping-cream-cheese:g": {
      unitPrice: 2.2,
      retailer: "demo-market",
      confidence: 0.95,
    },
  });

  const proposal = proposeShoppingOrder("household-demo", pricedItems, budget);
  const approvedProposal = approveShoppingOrder(proposal);
  const executionRequest = requestShoppingExecution(
    approvedProposal,
    "member-parent-a",
    "2026-08-02T05:30:00.000Z",
  );
  const approvedExecution = decideShoppingExecution(
    executionRequest,
    "approved",
    "member-parent-b",
    "2026-08-02T05:31:00.000Z",
  );
  const executed = markShoppingExecutionCompleted(
    approvedExecution,
    "external-order-demo-001",
  );

  const overBudgetProposal = proposeShoppingOrder(
    "household-demo",
    priceShoppingList(shoppingList, {
      "shopping-carrot:g": { unitPrice: 50, confidence: 1 },
      "shopping-cream-cheese:g": { unitPrice: 50, confidence: 1 },
    }),
    budget,
  );

  return {
    proposalRecommended: proposal.approvalState === "recommended",
    approvedWithinBudget: approvedProposal.approvalState === "approved",
    externalExecutionSeparated:
      executionRequest.status === "pending" && approvedExecution.status === "approved",
    executedWithTrace:
      executed.status === "executed" &&
      executed.externalOrderId === "external-order-demo-001",
    overBudgetBlocked:
      overBudgetProposal.approvalState === "draft" &&
      overBudgetProposal.reasons.includes("shopping-order-exceeds-budget"),
    proposal,
    executed,
    overBudgetProposal,
  };
};

export const assertShoppingBudgetAcceptance = (): void => {
  const result = runShoppingBudgetAcceptance();
  const failures: string[] = [];

  if (!result.proposalRecommended) failures.push("valid-order-not-recommended");
  if (!result.approvedWithinBudget) failures.push("valid-order-not-approved");
  if (!result.externalExecutionSeparated) failures.push("execution-approval-not-separated");
  if (!result.executedWithTrace) failures.push("execution-trace-missing");
  if (!result.overBudgetBlocked) failures.push("over-budget-order-not-blocked");

  if (failures.length > 0) throw new Error(failures.join("\n"));
};
