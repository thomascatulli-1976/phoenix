import type {
  ConsentGrant,
  DietaryConstraint,
  FamilyContextSnapshot,
  HouseholdMember,
  PermissionGrant,
} from "./domain";

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
}

export function isGuardianOf(actorId: string, subject: HouseholdMember): boolean {
  return subject.guardianIds.includes(actorId);
}

export function hasActiveConsent(
  grants: ConsentGrant[],
  subjectMemberId: string,
  scope: ConsentGrant["scope"],
): boolean {
  return grants.some(
    (grant) =>
      grant.subjectMemberId === subjectMemberId &&
      grant.scope === scope &&
      grant.status === "granted",
  );
}

export function canReadDietaryConstraint(
  actorMemberId: string,
  subject: HouseholdMember,
  constraint: DietaryConstraint,
  context: FamilyContextSnapshot,
): PolicyDecision {
  const reasons: string[] = [];

  if (constraint.memberId !== subject.id) {
    return { allowed: false, reasons: ["constraint-subject-mismatch"] };
  }

  if (actorMemberId === subject.id) {
    return { allowed: true, reasons: ["self-access"] };
  }

  if (subject.kind === "child" && isGuardianOf(actorMemberId, subject)) {
    if (hasActiveConsent(context.consents, subject.id, "health-context")) {
      return { allowed: true, reasons: ["guardian-access", "active-consent"] };
    }
    reasons.push("guardian-access-requires-active-consent");
  }

  if (constraint.metadata.visibility === "household") {
    return { allowed: true, reasons: ["household-visible"] };
  }

  return { allowed: false, reasons: reasons.length ? reasons : ["not-authorized"] };
}

export function canRequestExternalAction(
  actor: string,
  permissions: PermissionGrant[],
  resource: string,
): PolicyDecision {
  const grant = permissions.find(
    (permission) =>
      permission.actor === actor &&
      permission.action === "request-external-action" &&
      permission.resource === resource,
  );

  return grant
    ? { allowed: true, reasons: ["explicit-permission-grant"] }
    : { allowed: false, reasons: ["external-action-not-granted"] };
}

export function validateFamilyContext(context: FamilyContextSnapshot): string[] {
  const errors: string[] = [];
  const memberIds = new Set(context.members.map((member) => member.id));

  for (const memberId of context.household.memberIds) {
    if (!memberIds.has(memberId)) errors.push(`missing-household-member:${memberId}`);
  }

  for (const member of context.members) {
    if (member.householdId !== context.household.id) {
      errors.push(`member-household-mismatch:${member.id}`);
    }
    if (member.kind === "child" && member.guardianIds.length === 0) {
      errors.push(`child-without-guardian:${member.id}`);
    }
  }

  for (const constraint of context.dietaryConstraints) {
    if (!memberIds.has(constraint.memberId)) {
      errors.push(`constraint-member-missing:${constraint.id}`);
    }
    if (constraint.metadata.provenance.confidence < 0 || constraint.metadata.provenance.confidence > 1) {
      errors.push(`invalid-confidence:${constraint.id}`);
    }
  }

  return errors;
}
