import {
  defaultPhoenixApprovalPolicy,
  evaluatePhoenixApproval,
  type PhoenixApprovalAttestation,
} from "./approval-engine";

const headSha = "abc123";
const pullRequest = 3;
const policy = defaultPhoenixApprovalPolicy({
  technical: ["github-actions"],
  "death-star": ["death-star"],
  "darth-vader": ["darth-vader"],
  "phoenix-executive-office": ["billy"],
});

const approved = (
  gate: PhoenixApprovalAttestation["gate"],
  actor: string,
): PhoenixApprovalAttestation => ({
  gate,
  pullRequest,
  commitSha: headSha,
  decision: "approved",
  actor,
  policyVersion: policy.policyVersion,
  evaluatedAt: "2026-08-02T04:00:00.000Z",
  evidence: ["verified"],
});

const completeAttestations: PhoenixApprovalAttestation[] = [
  approved("technical", "github-actions"),
  approved("death-star", "death-star"),
  approved("darth-vader", "darth-vader"),
  approved("phoenix-executive-office", "billy"),
];

export const assertPhoenixApprovalAcceptance = (): void => {
  const granted = evaluatePhoenixApproval(
    {
      pullRequest,
      headSha,
      attestations: completeAttestations,
      openReviewThreads: 0,
    },
    policy,
  );
  if (granted.mergeAuthorization !== "granted") {
    throw new Error("Complete governance chain did not grant authorization.");
  }

  const stale = evaluatePhoenixApproval(
    {
      pullRequest,
      headSha: "new-head",
      attestations: completeAttestations,
      openReviewThreads: 0,
    },
    policy,
  );
  if (stale.mergeAuthorization !== "denied") {
    throw new Error("Stale attestations were not invalidated.");
  }

  const unauthorized = evaluatePhoenixApproval(
    {
      pullRequest,
      headSha,
      attestations: completeAttestations.map((attestation) =>
        attestation.gate === "phoenix-executive-office"
          ? { ...attestation, actor: "unknown" }
          : attestation,
      ),
      openReviewThreads: 0,
    },
    policy,
  );
  if (unauthorized.mergeAuthorization !== "denied") {
    throw new Error("Unauthorized approval actor was accepted.");
  }

  const openThread = evaluatePhoenixApproval(
    {
      pullRequest,
      headSha,
      attestations: completeAttestations,
      openReviewThreads: 1,
    },
    policy,
  );
  if (openThread.mergeAuthorization !== "denied") {
    throw new Error("Open review thread did not block authorization.");
  }
};
