import type { EntityId, IsoDateTime } from "../core/domain";
import type { ShoppingListItem } from "../cooking/domain";

export interface ShoppingBudget {
  id: EntityId;
  householdId: EntityId;
  currency: "EUR" | "USD" | "GBP";
  maximumAmount: number;
  period: "shopping-trip" | "week" | "month";
  validFrom: string;
  validUntil: string;
}

export interface PricedShoppingItem {
  shoppingListItemId: EntityId;
  label: string;
  quantity: number;
  unit: ShoppingListItem["unit"];
  estimatedUnitPrice: number;
  estimatedTotal: number;
  retailer?: string;
  confidence: number;
}

export interface ShoppingOrderProposal {
  id: EntityId;
  householdId: EntityId;
  currency: ShoppingBudget["currency"];
  items: PricedShoppingItem[];
  estimatedTotal: number;
  budgetId: EntityId;
  budgetRemainingAfterOrder: number;
  approvalState: "draft" | "recommended" | "approved" | "rejected";
  reasons: string[];
}

export interface ShoppingExecutionRequest {
  id: EntityId;
  proposalId: EntityId;
  requestedBy: EntityId;
  requestedAt: IsoDateTime;
  status: "pending" | "approved" | "rejected" | "executed";
  decidedBy?: EntityId;
  decidedAt?: IsoDateTime;
  externalOrderId?: string;
}

export const priceShoppingList = (
  items: ShoppingListItem[],
  estimates: Record<EntityId, { unitPrice: number; retailer?: string; confidence: number }>,
): PricedShoppingItem[] =>
  items.map((item) => {
    const estimate = estimates[item.id];
    const estimatedUnitPrice = estimate?.unitPrice ?? 0;
    return {
      shoppingListItemId: item.id,
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      estimatedUnitPrice,
      estimatedTotal: item.quantity * estimatedUnitPrice,
      retailer: estimate?.retailer,
      confidence: estimate?.confidence ?? 0,
    };
  });

export const proposeShoppingOrder = (
  householdId: EntityId,
  items: PricedShoppingItem[],
  budget: ShoppingBudget,
): ShoppingOrderProposal => {
  if (budget.householdId !== householdId) {
    throw new Error("Shopping budget belongs to another household.");
  }

  const reasons: string[] = [];
  const estimatedTotal = items.reduce((sum, item) => sum + item.estimatedTotal, 0);
  const missingPrices = items.filter((item) => item.confidence <= 0 || item.estimatedUnitPrice <= 0);

  if (missingPrices.length > 0) {
    reasons.push(`missing-price-estimates:${missingPrices.length}`);
  }
  if (estimatedTotal > budget.maximumAmount) {
    reasons.push("shopping-order-exceeds-budget");
  }

  return {
    id: `shopping-order-${householdId}-${budget.id}`,
    householdId,
    currency: budget.currency,
    items,
    estimatedTotal,
    budgetId: budget.id,
    budgetRemainingAfterOrder: budget.maximumAmount - estimatedTotal,
    approvalState: reasons.length === 0 ? "recommended" : "draft",
    reasons,
  };
};

export const approveShoppingOrder = (
  proposal: ShoppingOrderProposal,
): ShoppingOrderProposal => {
  if (proposal.approvalState !== "recommended") {
    throw new Error("Only recommended shopping orders can be approved.");
  }
  if (proposal.budgetRemainingAfterOrder < 0) {
    throw new Error("Shopping order exceeds the approved budget.");
  }
  return { ...proposal, approvalState: "approved" };
};

export const requestShoppingExecution = (
  proposal: ShoppingOrderProposal,
  requestedBy: EntityId,
  requestedAt: IsoDateTime,
): ShoppingExecutionRequest => {
  if (proposal.approvalState !== "approved") {
    throw new Error("Shopping execution requires an approved order proposal.");
  }

  return {
    id: `shopping-execution-${proposal.id}`,
    proposalId: proposal.id,
    requestedBy,
    requestedAt,
    status: "pending",
  };
};

export const decideShoppingExecution = (
  request: ShoppingExecutionRequest,
  decision: "approved" | "rejected",
  decidedBy: EntityId,
  decidedAt: IsoDateTime,
): ShoppingExecutionRequest => {
  if (request.status !== "pending") {
    throw new Error("Shopping execution request has already been decided.");
  }

  return {
    ...request,
    status: decision,
    decidedBy,
    decidedAt,
  };
};

export const markShoppingExecutionCompleted = (
  request: ShoppingExecutionRequest,
  externalOrderId: string,
): ShoppingExecutionRequest => {
  if (request.status !== "approved") {
    throw new Error("Only approved shopping executions can be completed.");
  }
  if (!externalOrderId.trim()) {
    throw new Error("External order id is required.");
  }

  return {
    ...request,
    status: "executed",
    externalOrderId,
  };
};
