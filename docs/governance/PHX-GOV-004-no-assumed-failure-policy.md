# PHX-GOV-004 — No Assumed Failure Policy v1.1

Status: APPROVED  
Decision IDs: PHX-EO-DEC-085, PHX-EO-DEC-086  
Effective date: 2026-07-25  
Approval Authority: Phoenix Executive Office

Canonical Drive repository:  
https://drive.google.com/drive/folders/18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg?usp=drive_link

Canonical policy document:  
https://docs.google.com/document/d/1qD6WXujrbvCvSq4EIEicVbQ7VFUKzEhpjCY_rfEqNg8/edit

## 1. Purpose

This policy prevents Phoenix agents from falsely assuming that persistence, connector access, permissions or repository writes are unavailable.

## 2. Mandatory rule

A Phoenix agent may never claim that a write operation is unavailable, blocked or impossible without first executing the relevant write attempt.

## 3. Required execution order

1. Identify the required persistence action.
2. Execute the available Drive, GitHub, registry or runtime write operation.
3. Read back or otherwise verify the resulting artifact, file, revision or commit.
4. Only after an actual failure may the agent report a persistence problem.
5. Every failure report must include the exact technical error, affected system, remediation action and remaining state.

## 4. Prohibited behavior

- assuming missing permissions without a tool response;
- assuming that a connector is unavailable because it was not yet invoked;
- replacing a required write attempt with a verbal explanation;
- reporting DRAFT merely because persistence was not attempted;
- claiming successful persistence without verification.

## 5. Relationship to Persist-by-Default

PHX-GOV-003 defines Persist-by-Default as the mandatory Phoenix operating mode.

PHX-GOV-004 enforces that policy operationally: every approved continuation command must trigger actual persistence attempts before any exception is reported.

Commands such as `ok`, `weiter`, `go` and `festschreiben` authorize the full persistence workflow unless the user explicitly requests a non-persistent draft.

## 6. Failure classification

Only these verified failure classes are permitted:

- `AUTHORIZATION_FAILED`
- `CONNECTOR_FAILED`
- `VALIDATION_FAILED`
- `CONFLICT_DETECTED`
- `DESTINATION_UNAVAILABLE`
- `WRITE_FAILED`
- `VERIFICATION_FAILED`

Each failure must preserve all successfully completed writes and identify the next corrective action.

## 7. Enforcement

A response that reports unavailable persistence without an actual attempted operation is governance-noncompliant.

Chat is never evidence of persistence. Tool results, Drive revisions, repository files, commit SHAs and verified registry records are evidence.

## 8. Mandatory Repository Link Propagation

Every persistence operation must actively include the canonical destination link in the tool call, execution context or handoff instruction.

The repository link must not be treated as implicit conversational memory. It must be propagated again with every Drive persistence action and every persistence handoff that depends on repository access.

A persistence workflow is incomplete when it references only a document title, artifact ID or prior chat context without also supplying the applicable destination folder link or exact file link.

Required behavior:

1. Resolve the canonical repository or target-file link before writing.
2. Include that link in the write operation or connector context.
3. Preserve the link in the persistence report.
4. Reuse the exact canonical link in subsequent write steps instead of assuming inherited access.
5. If multiple repositories exist, explicitly bind each artifact to its designated repository link.

This rule is designated **PHX-EO-DEC-086 — Mandatory Repository Link Propagation** and is effective immediately.

## 9. Cross-references

- PHX-GOV-003 — Mandatory Persistence Reporting Policy
- PHX-GOV-002 — Traceability and Persistence Architecture
- PHX-EO-DEC-084 — Persist-by-Default
- PHX-EO-DEC-085 — No Assumed Failure
- PHX-EO-DEC-086 — Mandatory Repository Link Propagation
