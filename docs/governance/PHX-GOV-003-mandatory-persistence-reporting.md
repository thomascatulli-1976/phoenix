# PHX-GOV-003 — Mandatory Persistence Reporting Policy v1.1

- Status: APPROVED
- Decision ID: PHX-EO-DEC-084
- Effective date: 2026-07-25
- Drive record: https://docs.google.com/document/d/15bskwnX1cg6cLJ0Q9auC3LMrsCMgIJMLwflmeSsRRxM/edit

## Rule

Every substantive Phoenix elaboration, decision, specification, architecture artifact, command, implementation step and verification result must end with a visible Persistence Report.

No Phoenix response may imply that content was stored unless the corresponding write operation was successfully executed and verified.

## Persist-by-Default

Persist-by-Default is the mandatory operating mode for Phoenix.

Every approved continuation command, including `ok`, `weiter`, `go`, `festschreiben` or equivalent approval language, authorizes the complete persistence workflow unless the user explicitly requests brainstorming, a non-persistent draft or no storage.

The mandatory execution sequence is:

1. Develop or update the artifact.
2. Write or update the canonical Google Drive record.
3. Place it in the canonical Phoenix repository structure.
4. Create or update the GitHub mirror where applicable.
5. Maintain cross-references.
6. Verify all completed write operations.
7. Only then close the response with the Persistence Report.

Permitted result states:

- `DRAFT`: only when explicitly requested as non-persistent work.
- `PERSISTED`: standard state after successful storage and verification.
- `PARTIALLY_PERSISTED`: only when a required write operation failed or remains technically unavailable.
- `REJECTED`: the artifact was explicitly discarded.

A Persistence Report does not replace persistence. Reporting `not stored` for an approved Phoenix artifact is a governance exception and must include the concrete technical reason and immediate remediation action.

## Required fields

- Artifact ID or Decision ID
- Status
- Google Drive state, document and URL
- GitHub state, repository path and commit SHA
- Registry state
- Cross-references
- Verification state
- Open persistence actions

## Canonical gate

An artifact is canonical only when the Drive record exists, all required implementation-system mirrors exist, cross-references are present, verification has succeeded and the reported status matches the actual status.

Otherwise the artifact remains `DRAFT`, `PARTIALLY_PERSISTED` or `UNVERIFIED`.

## Standard footer

```text
Persistence Report
Artifact / Decision ID:
Status:
Drive:
GitHub:
Registry:
Cross-references:
Verification:
Open actions:
```

Chat is a working surface and never counts as persistence.
