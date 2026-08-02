import {
  approveMealSchedule,
  decideCalendarWrite,
  markCalendarWriteExecuted,
  proposeMealSchedule,
  requestCalendarWrite,
  type FamilyCalendarWindow,
} from "../calendar/meal-scheduling";
import { runDemoFamilyScenario } from "./demo-scenario";

export const runCalendarAcceptanceScenario = () => {
  const scenario = runDemoFamilyScenario();
  const meal = scenario.approval?.entries[0];
  if (!meal) {
    throw new Error("Approved demo meal is required for calendar acceptance.");
  }

  const windows: FamilyCalendarWindow[] = [
    {
      id: "busy-child-a-sports",
      householdId: meal.householdId,
      memberId: "member-child-a",
      startsAt: "2026-08-03T16:30:00.000Z",
      endsAt: "2026-08-03T17:15:00.000Z",
      kind: "busy",
      source: "calendar-import",
      confidence: 1,
    },
  ];

  const conflictingProposal = proposeMealSchedule(
    meal,
    "2026-08-03T17:00:00.000Z",
    45,
    ["member-parent-a", "member-parent-b", "member-child-a", "member-child-b"],
    windows,
  );

  const safeProposal = proposeMealSchedule(
    meal,
    "2026-08-03T17:30:00.000Z",
    45,
    ["member-parent-a", "member-parent-b", "member-child-a", "member-child-b"],
    windows,
  );

  const approvedProposal = approveMealSchedule(safeProposal);
  const writeRequest = requestCalendarWrite(
    approvedProposal,
    "member-parent-a",
    "2026-08-02T03:20:00.000Z",
  );
  const approvedWrite = decideCalendarWrite(
    writeRequest,
    "approved",
    "member-parent-a",
    "2026-08-02T03:21:00.000Z",
  );
  const executedWrite = markCalendarWriteExecuted(
    approvedWrite,
    "demo-calendar-event-001",
  );

  return {
    conflictingProposalDetected:
      conflictingProposal.conflicts.includes("busy-child-a-sports"),
    conflictingProposalNotRecommended:
      conflictingProposal.approvalState === "draft",
    safeProposalRecommended: safeProposal.approvalState === "recommended",
    writeRequiresTwoApprovals:
      approvedProposal.approvalState === "approved" &&
      writeRequest.status === "pending",
    externalWriteTraceable:
      executedWrite.status === "executed" &&
      executedWrite.externalEventId === "demo-calendar-event-001",
    conflictingProposal,
    safeProposal,
    executedWrite,
  };
};

export const assertCalendarAcceptance = (): void => {
  const result = runCalendarAcceptanceScenario();
  const failures: string[] = [];

  if (!result.conflictingProposalDetected) failures.push("calendar-conflict-not-detected");
  if (!result.conflictingProposalNotRecommended) failures.push("conflicting-proposal-recommended");
  if (!result.safeProposalRecommended) failures.push("safe-proposal-not-recommended");
  if (!result.writeRequiresTwoApprovals) failures.push("calendar-write-not-approval-gated");
  if (!result.externalWriteTraceable) failures.push("calendar-write-not-traceable");

  if (failures.length > 0) throw new Error(failures.join("\n"));
};
