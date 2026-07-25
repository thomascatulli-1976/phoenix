# PHX-GOV-003 — Mandatory Persistence Reporting Policy v1.0

- Status: APPROVED
- Decision ID: PHX-EO-DEC-084
- Effective date: 2026-07-25
- Drive record: https://docs.google.com/document/d/15bskwnX1cg6cLJ0Q9auC3LMrsCMgIJMLwflmeSsRRxM/edit

## Rule

Every substantive Phoenix elaboration, decision, specification, architecture artifact, command, implementation step and verification result must end with a visible Persistence Report.

No Phoenix response may imply that content was stored unless the corresponding write operation was successfully executed and verified.

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
