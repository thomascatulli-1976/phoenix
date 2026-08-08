export type PhoenixGate =
  | "technical"
  | "death-star"
  | "darth-vader"
  | "phoenix-executive-office";

export type PhoenixGateDecision = "approved" | "rejected" | "changes-required";

export interface PhoenixApprovalAttestation {
  gate: PhoenixGate;
  pullRequest: number;
  commitSha: string;
  decision: PhoenixGateDecision;
  actor: string;
  policyVersion: string;
  evaluatedAt: string;
  evidence: string[];
}

export interface PhoenixApprovalPolicy {
  policyVersion: string;
  requiredGates: PhoenixGate[];
  authorizedActors: Partial<Record<PhoenixGate, string[]>>;
  requireNoOpenReviewThreads: boolean;
}

export interface PhoenixApprovalInput {
  pullRequest: number;
  headSha: string;
  attestations: PhoenixApprovalAttestation[];
  openReviewThreads: number;
}

export interface PhoenixApprovalReport {
  pullRequest: number;
  headSha: string;
  policyVersion: string;
  gateResults: Array<{
    gate: PhoenixGate;
    status: "passed" | "missing" | "stale" | "unauthorized" | "rejected";
    actor?: string;
    detail: string;
  }>;
  mergeAuthorization: "granted" | "denied";
  reasons: string[];
}

const newestAttestationForGate = (
  attestations: PhoenixApprovalAttestation[],
  gate: PhoenixGate,
): PhoenixApprovalAttestation | undefined =>
  attestations
    .filter((attestation) => attestation.gate === gate)
    .sort(
      (left, right) =>
        Date.parse(right.evaluatedAt) - Date.parse(left.evaluatedAt),
    )[0];

export const evaluatePhoenixApproval = (
  input: PhoenixApprovalInput,
  policy: PhoenixApprovalPolicy,
): PhoenixApprovalReport => {
  const reasons: string[] = [];
  const gateResults = policy.requiredGates.map((gate) => {
    const attestation = newestAttestationForGate(input.attestations, gate);
    if (!attestation) {
      reasons.push(`${gate}: attestation missing`);
      return { gate, status: "missing" as const, detail: "No attestation found." };
    }
    if (
      attestation.pullRequest !== input.pullRequest ||
      attestation.commitSha !== input.headSha
    ) {
      reasons.push(`${gate}: attestation is not bound to the current head SHA`);
      return {
        gate,
        status: "stale" as const,
        actor: attestation.actor,
        detail: "Attestation targets a different pull request or commit SHA.",
      };
    }
    if (attestation.policyVersion !== policy.policyVersion) {
      reasons.push(`${gate}: attestation uses a different policy version`);
      return {
        gate,
        status: "stale" as const,
        actor: attestation.actor,
        detail: "Attestation policy version does not match.",
      };
    }
    const authorizedActors = policy.authorizedActors[gate] ?? [];
    if (
      authorizedActors.length > 0 &&
      !authorizedActors.includes(attestation.actor)
    ) {
      reasons.push(`${gate}: actor ${attestation.actor} is not authorized`);
      return {
        gate,
        status: "unauthorized" as const,
        actor: attestation.actor,
        detail: "Attestation actor is not authorized for this gate.",
      };
    }
    if (attestation.decision !== "approved") {
      reasons.push(`${gate}: decision is ${attestation.decision}`);
      return {
        gate,
        status: "rejected" as const,
        actor: attestation.actor,
        detail: `Gate decision is ${attestation.decision}.`,
      };
    }
    return {
      gate,
      status: "passed" as const,
      actor: attestation.actor,
      detail: "Approved for the current head SHA and policy version.",
    };
  });

  if (policy.requireNoOpenReviewThreads && input.openReviewThreads > 0) {
    reasons.push(`${input.openReviewThreads} review thread(s) remain open`);
  }

  return {
    pullRequest: input.pullRequest,
    headSha: input.headSha,
    policyVersion: policy.policyVersion,
    gateResults,
    mergeAuthorization: reasons.length === 0 ? "granted" : "denied",
    reasons,
  };
};

export const defaultPhoenixApprovalPolicy = (
  authorizedActors: PhoenixApprovalPolicy["authorizedActors"] = {},
): PhoenixApprovalPolicy => ({
  policyVersion: "phoenix-governance-v1",
  requiredGates: [
    "technical",
    "death-star",
    "darth-vader",
    "phoenix-executive-office",
  ],
  authorizedActors,
  requireNoOpenReviewThreads: true,
});
