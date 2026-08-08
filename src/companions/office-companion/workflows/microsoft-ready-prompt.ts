import type { OfficeTaskRequest } from "../contracts.js";

export const microsoftReadyDraftToolName = "create_microsoft_ready_draft";
export const microsoftReadyDraftSchemaName = "microsoft_ready_decision_memo";

export const microsoftReadyDraftSystemInstruction =
  "You are the Phoenix Office Companion drafting engine. Follow the supplied data boundaries and output schema exactly. Never claim internal validation, approval or publication.";

export function buildMicrosoftReadyDraftPrompt(
  request: OfficeTaskRequest,
): string {
  const taskEnvelope = {
    operatingMode: request.operatingMode,
    task: request.task,
    intendedOutcome: request.intendedOutcome,
    sanitizedInput: request.input,
    contextReferences: request.contextReferences,
    excludedInformation: request.excludedInformation,
    evidenceRequirements: request.evidenceRequirements,
    validationRequirements: request.validationRequirements,
  };

  return [
    "Create a Microsoft-ready decision memo draft from the supplied sanitized context.",
    "Use only the supplied context. Do not invent internal facts, names, numbers, approvals or source validation.",
    "When information is missing, record it under openPoints and internalValidationRequired.",
    "Provide at least two distinct decision options. Keep recommendation and rationale separate.",
    "Return only the structured content required by the supplied schema.",
    "The provider must not set owner, approval, validation state, sensitivity, target system or publication status; Phoenix adds those governance fields after generation.",
    "TASK ENVELOPE:",
    JSON.stringify(taskEnvelope, null, 2),
  ].join("\n\n");
}
