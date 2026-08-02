# Phoenix Family Shopping Budget Governance

## Purpose

The shopping-budget boundary connects meal planning and Family Finance without allowing the companion to spend money autonomously.

## Control flow

1. A shopping list is generated from approved meal plans.
2. Price estimates are attached with retailer and confidence metadata.
3. The estimated order total is checked against an active household budget.
4. Only complete, within-budget proposals become `recommended`.
5. A household member must approve the order proposal.
6. External execution requires a second explicit approval.
7. The resulting external order id is stored for traceability.

## Hard rules

- Missing or zero-confidence prices keep the proposal in `draft`.
- Orders exceeding the approved budget cannot be approved.
- Approval of the internal proposal does not authorize an external purchase.
- External execution cannot be marked complete without an external order id.
- Price estimates are advisory and must not be presented as guaranteed retailer prices.

## Acceptance coverage

`src/modules/family/fixtures/shopping-budget-acceptance.ts` verifies:

- a complete order within budget can be recommended and approved;
- external execution remains a separate approval step;
- the external order id is recorded;
- an over-budget order is blocked.
