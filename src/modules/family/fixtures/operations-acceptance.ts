import {
  completeFamilyOperation,
  createFamilyOperation,
  decideFamilyOperation,
  startFamilyOperationExecution,
  submitFamilyOperation,
} from "../core/operations";

export const runOperationsAcceptanceScenario = () => {
  const created = createFamilyOperation({
    id: "operation-shopping-demo",
    householdId: "household-demo",
    kind: "shopping-execution",
    subjectId: "shopping-order-demo",
    requestedBy: "member-parent-a",
    requestedAt: "2026-08-02T05:35:00.000+02:00",
    requiresApproval: true,
    approvalRole: "shopper",
  });

  const submitted = submitFamilyOperation(
    created,
    { memberId: "member-parent-a", roles: ["planner"] },
    "2026-08-02T05:36:00.000+02:00",
  );

  let selfApprovalBlocked = false;
  try {
    decideFamilyOperation(
      submitted,
      { memberId: "member-parent-a", roles: ["shopper"] },
      "approved",
      "2026-08-02T05:37:00.000+02:00",
    );
  } catch {
    selfApprovalBlocked = true;
  }

  const approved = decideFamilyOperation(
    submitted,
    { memberId: "member-parent-b", roles: ["shopper"] },
    "approved",
    "2026-08-02T05:38:00.000+02:00",
    "Budget und Einkaufsliste geprüft.",
  );

  const executing = startFamilyOperationExecution(
    approved,
    { memberId: "phoenix-family-runtime", roles: ["admin"] },
    "2026-08-02T05:39:00.000+02:00",
  );

  const completed = completeFamilyOperation(
    executing,
    { memberId: "phoenix-family-runtime", roles: ["admin"] },
    "2026-08-02T05:40:00.000+02:00",
    "external-order-demo-001",
  );

  return {
    selfApprovalBlocked,
    completed,
    auditTrailComplete:
      completed.auditTrail.map((entry) => entry.action).join(",") ===
      "created,submitted,approved,execution-started,completed",
  };
};

export const assertOperationsAcceptance = (): void => {
  const result = runOperationsAcceptanceScenario();
  const failures: string[] = [];

  if (!result.selfApprovalBlocked) failures.push("self-approval-was-not-blocked");
  if (result.completed.status !== "completed") failures.push("operation-not-completed");
  if (!result.completed.externalReference) failures.push("external-reference-missing");
  if (!result.auditTrailComplete) failures.push("audit-trail-incomplete");

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
};
