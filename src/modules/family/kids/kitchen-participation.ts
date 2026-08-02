import type { EntityId, IsoDateTime } from "../core/domain";
import type { CookingSession, ThermomixStep } from "../cooking/domain";

export type KitchenRiskLevel = "low" | "medium" | "high";

export interface ChildKitchenProfile {
  memberId: EntityId;
  ageBand: "under-6" | "6-9" | "10-13" | "14-17";
  allowedRiskLevel: KitchenRiskLevel;
  guardianIds: EntityId[];
  restrictions: string[];
}

export interface KitchenParticipationTask {
  id: EntityId;
  sessionId: EntityId;
  stepId: EntityId;
  childMemberId: EntityId;
  title: string;
  instruction: string;
  riskLevel: KitchenRiskLevel;
  requiresDirectSupervision: boolean;
  approvalState: "draft" | "approved" | "rejected" | "completed";
  approvedBy?: EntityId;
  approvedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
}

const RISK_ORDER: Record<KitchenRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const inferStepRisk = (step: ThermomixStep): KitchenRiskLevel => {
  if ((step.temperatureCelsius ?? 0) >= 80) return "high";
  if ((typeof step.speed === "number" && step.speed >= 6) || step.vessel === "varoma") {
    return "high";
  }
  if ((step.temperatureCelsius ?? 0) > 0 || (typeof step.speed === "number" && step.speed >= 3)) {
    return "medium";
  }
  return "low";
};

export const proposeChildKitchenTask = (
  session: CookingSession,
  step: ThermomixStep,
  profile: ChildKitchenProfile,
): KitchenParticipationTask => {
  if (session.status !== "active" && session.status !== "planned") {
    throw new Error("Child kitchen task requires a planned or active cooking session.");
  }

  const riskLevel = inferStepRisk(step);
  const allowed = RISK_ORDER[riskLevel] <= RISK_ORDER[profile.allowedRiskLevel];

  return {
    id: `child-task-${session.id}-${step.id}-${profile.memberId}`,
    sessionId: session.id,
    stepId: step.id,
    childMemberId: profile.memberId,
    title: `${step.title} gemeinsam durchführen`,
    instruction: step.instruction,
    riskLevel,
    requiresDirectSupervision: riskLevel !== "low" || profile.ageBand === "under-6",
    approvalState: allowed ? "draft" : "rejected",
  };
};

export const approveChildKitchenTask = (
  task: KitchenParticipationTask,
  profile: ChildKitchenProfile,
  guardianId: EntityId,
  approvedAt: IsoDateTime,
): KitchenParticipationTask => {
  if (!profile.guardianIds.includes(guardianId)) {
    throw new Error("Only a registered guardian may approve a child kitchen task.");
  }
  if (task.childMemberId !== profile.memberId) {
    throw new Error("Kitchen task does not belong to the supplied child profile.");
  }
  if (task.approvalState !== "draft") {
    throw new Error("Only draft child kitchen tasks can be approved.");
  }
  if (RISK_ORDER[task.riskLevel] > RISK_ORDER[profile.allowedRiskLevel]) {
    throw new Error("Task risk exceeds the child's approved kitchen risk level.");
  }

  return {
    ...task,
    approvalState: "approved",
    approvedBy: guardianId,
    approvedAt,
  };
};

export const completeChildKitchenTask = (
  task: KitchenParticipationTask,
  completedAt: IsoDateTime,
  guardianPresent: boolean,
): KitchenParticipationTask => {
  if (task.approvalState !== "approved") {
    throw new Error("Child kitchen task must be approved before completion.");
  }
  if (task.requiresDirectSupervision && !guardianPresent) {
    throw new Error("Direct guardian supervision is required for this task.");
  }

  return {
    ...task,
    approvalState: "completed",
    completedAt,
  };
};
