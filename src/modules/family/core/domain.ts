export type EntityId = string;
export type IsoDateTime = string;

export type MemberKind = "adult" | "child";
export type Visibility = "household" | "guardians" | "private";
export type ConsentStatus = "granted" | "denied" | "pending" | "revoked";
export type ConstraintSeverity = "preference" | "avoid" | "strict";

export interface Provenance {
  source: "user" | "guardian" | "import" | "companion";
  recordedAt: IsoDateTime;
  recordedBy: EntityId;
  confidence: number;
}

export interface SensitiveMetadata {
  ownerMemberId: EntityId;
  visibility: Visibility;
  consentStatus: ConsentStatus;
  provenance: Provenance;
  lastUpdatedAt: IsoDateTime;
}

export interface Household {
  id: EntityId;
  name: string;
  timezone: string;
  locale: string;
  memberIds: EntityId[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface HouseholdMember {
  id: EntityId;
  householdId: EntityId;
  kind: MemberKind;
  displayName: string;
  birthDate?: string;
  guardianIds: EntityId[];
  roles: Array<"guardian" | "planner" | "shopper" | "cook" | "member">;
  active: boolean;
}

export interface DietaryConstraint {
  id: EntityId;
  memberId: EntityId;
  category: "diet" | "allergy" | "intolerance" | "medical-context" | "dislike";
  label: string;
  severity: ConstraintSeverity;
  notes?: string;
  metadata: SensitiveMetadata;
}

export interface FoodPreference {
  id: EntityId;
  memberId: EntityId;
  ingredientOrDish: string;
  sentiment: "love" | "like" | "neutral" | "dislike" | "refuse";
  metadata: SensitiveMetadata;
}

export interface ConsentGrant {
  id: EntityId;
  householdId: EntityId;
  subjectMemberId: EntityId;
  grantedByMemberId: EntityId;
  scope: "profile" | "health-context" | "planning" | "feedback" | "external-action";
  status: ConsentStatus;
  grantedAt?: IsoDateTime;
  revokedAt?: IsoDateTime;
}

export interface PermissionGrant {
  id: EntityId;
  householdId: EntityId;
  actor: string;
  action: "read" | "recommend" | "modify" | "request-external-action" | "approve-external-action";
  resource: string;
  memberScope?: EntityId[];
  expiresAt?: IsoDateTime;
}

export interface FeedbackSignal {
  id: EntityId;
  householdId: EntityId;
  memberId: EntityId;
  subjectType: "meal" | "recipe" | "ingredient" | "cooking-session";
  subjectId: EntityId;
  signal: "liked" | "disliked" | "accepted" | "refused" | "tolerated" | "not-tolerated" | "leftover";
  value?: number;
  notes?: string;
  recordedAt: IsoDateTime;
  metadata: SensitiveMetadata;
}

export interface FamilyContextSnapshot {
  household: Household;
  members: HouseholdMember[];
  dietaryConstraints: DietaryConstraint[];
  foodPreferences: FoodPreference[];
  consents: ConsentGrant[];
  permissions: PermissionGrant[];
  feedback: FeedbackSignal[];
  generatedAt: IsoDateTime;
}
