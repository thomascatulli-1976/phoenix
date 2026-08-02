import { runDemoFamilyScenario } from "./demo-scenario";
import {
  approveChildKitchenTask,
  completeChildKitchenTask,
  proposeChildKitchenTask,
  type ChildKitchenProfile,
} from "../kids/kitchen-participation";

export const runKidsKitchenAcceptance = () => {
  const scenario = runDemoFamilyScenario();
  const session = scenario.session?.session;
  const lowRiskStep = scenario.compilation?.steps.find(
    (step) => (step.temperatureCelsius ?? 0) === 0 && step.speed === undefined,
  );
  const highRiskStep = scenario.compilation?.steps.find(
    (step) => (step.temperatureCelsius ?? 0) >= 80,
  );

  if (!session || !lowRiskStep || !highRiskStep) {
    throw new Error("Demo scenario did not produce the required cooking steps.");
  }

  const childProfile: ChildKitchenProfile = {
    memberId: "member-child-a",
    ageBand: "6-9",
    allowedRiskLevel: "low",
    guardianIds: ["member-parent-a", "member-parent-b"],
    restrictions: ["no-hot-vessels", "no-high-speed-blending"],
  };

  const safeTask = proposeChildKitchenTask(session, lowRiskStep, childProfile);
  const approvedTask = approveChildKitchenTask(
    safeTask,
    childProfile,
    "member-parent-a",
    "2026-08-03T17:31:00.000Z",
  );
  const completedTask = completeChildKitchenTask(
    approvedTask,
    "2026-08-03T17:32:00.000Z",
    true,
  );

  const blockedTask = proposeChildKitchenTask(session, highRiskStep, childProfile);

  return {
    safeTaskApproved: approvedTask.approvalState === "approved",
    safeTaskCompleted: completedTask.approvalState === "completed",
    highRiskTaskRejected: blockedTask.approvalState === "rejected",
    completedTask,
    blockedTask,
  };
};

export const assertKidsKitchenAcceptance = (): void => {
  const result = runKidsKitchenAcceptance();
  const failures: string[] = [];

  if (!result.safeTaskApproved) failures.push("safe-task-not-approved");
  if (!result.safeTaskCompleted) failures.push("safe-task-not-completed");
  if (!result.highRiskTaskRejected) failures.push("high-risk-task-not-rejected");

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
};
