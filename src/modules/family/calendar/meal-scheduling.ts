import type { EntityId, IsoDateTime } from "../core/domain";
import type { MealPlanEntry } from "../cooking/domain";

export interface FamilyCalendarWindow {
  id: EntityId;
  householdId: EntityId;
  memberId?: EntityId;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  kind: "busy" | "available" | "preferred-meal-time";
  source: "manual" | "calendar-import" | "routine";
  confidence: number;
}

export interface MealScheduleProposal {
  id: EntityId;
  householdId: EntityId;
  mealPlanEntryId: EntityId;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  participantMemberIds: EntityId[];
  conflicts: EntityId[];
  approvalState: "draft" | "recommended" | "approved" | "rejected";
}

export interface CalendarWriteRequest {
  id: EntityId;
  proposalId: EntityId;
  requestedBy: EntityId;
  requestedAt: IsoDateTime;
  status: "pending" | "approved" | "rejected" | "executed";
  decidedBy?: EntityId;
  decidedAt?: IsoDateTime;
  externalEventId?: string;
}

const overlaps = (
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  window: FamilyCalendarWindow,
): boolean =>
  Date.parse(startsAt) < Date.parse(window.endsAt) &&
  Date.parse(endsAt) > Date.parse(window.startsAt);

export const proposeMealSchedule = (
  meal: MealPlanEntry,
  startsAt: IsoDateTime,
  durationMinutes: number,
  participantMemberIds: EntityId[],
  windows: FamilyCalendarWindow[],
): MealScheduleProposal => {
  if (meal.approvalState !== "approved") {
    throw new Error("Meal must be approved before calendar scheduling.");
  }
  if (durationMinutes <= 0) {
    throw new Error("Meal schedule duration must be positive.");
  }

  const endsAt = new Date(
    Date.parse(startsAt) + durationMinutes * 60_000,
  ).toISOString();

  const participantSet = new Set(participantMemberIds);
  const conflicts = windows
    .filter(
      (window) =>
        window.kind === "busy" &&
        (window.memberId === undefined || participantSet.has(window.memberId)) &&
        overlaps(startsAt, endsAt, window),
    )
    .map((window) => window.id);

  return {
    id: `meal-schedule-${meal.id}-${startsAt}`,
    householdId: meal.householdId,
    mealPlanEntryId: meal.id,
    startsAt,
    endsAt,
    participantMemberIds,
    conflicts,
    approvalState: conflicts.length === 0 ? "recommended" : "draft",
  };
};

export const approveMealSchedule = (
  proposal: MealScheduleProposal,
): MealScheduleProposal => {
  if (proposal.conflicts.length > 0) {
    throw new Error("Conflicting meal schedule cannot be approved.");
  }
  if (proposal.approvalState !== "recommended") {
    throw new Error("Only recommended meal schedules can be approved.");
  }
  return { ...proposal, approvalState: "approved" };
};

export const requestCalendarWrite = (
  proposal: MealScheduleProposal,
  requestedBy: EntityId,
  requestedAt: IsoDateTime,
): CalendarWriteRequest => {
  if (proposal.approvalState !== "approved") {
    throw new Error("Calendar write requires an approved meal schedule.");
  }

  return {
    id: `calendar-write-${proposal.id}`,
    proposalId: proposal.id,
    requestedBy,
    requestedAt,
    status: "pending",
  };
};

export const decideCalendarWrite = (
  request: CalendarWriteRequest,
  decision: "approved" | "rejected",
  decidedBy: EntityId,
  decidedAt: IsoDateTime,
): CalendarWriteRequest => {
  if (request.status !== "pending") {
    throw new Error("Calendar write request has already been decided.");
  }

  return {
    ...request,
    status: decision,
    decidedBy,
    decidedAt,
  };
};

export const markCalendarWriteExecuted = (
  request: CalendarWriteRequest,
  externalEventId: string,
): CalendarWriteRequest => {
  if (request.status !== "approved") {
    throw new Error("Only approved calendar writes can be executed.");
  }
  if (!externalEventId.trim()) {
    throw new Error("External calendar event id is required.");
  }

  return {
    ...request,
    status: "executed",
    externalEventId,
  };
};
