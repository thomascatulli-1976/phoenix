# PHX-GOV-002 — Traceability and Persistence Architecture v1.0

- Status: APPROVED
- Decision ID: PHX-EO-DEC-083
- Effective date: 2026-07-25
- Drive record: https://docs.google.com/document/d/10JbTUInY-pU78C-KNKo209WIddU4UdSfFiKpgm0FsrE/edit

## Rule

Every approved decision and every operative command must be persisted at least once in the canonical Phoenix Google Drive repository and additionally in every system where it is implemented, executed or evidenced.

The chat is a working surface and is never the sole system of record.

## Memory layers

1. Executive Memory — Google Drive
2. Operational Memory — GitHub and implementation systems
3. Runtime Memory — audit store, events, logs and state transitions

## Identifier standard

- Decision: `PHX-EO-DEC-NNN`
- Command: `PHX-CMD-NNN`
- ADR: `PHX-ADR-NNN`
- Engineering artifact: `PHX-ENG-NNN`
- Governance artifact: `PHX-GOV-NNN`
- Contract: `PHX-CTR-NNN`
- Verification: `PHX-VER-NNN`

## Decision lifecycle

`PROPOSED -> REVIEW -> APPROVED -> IMPLEMENTED -> VERIFIED -> RELEASED -> ARCHIVED`

## Command lifecycle

`REQUESTED -> ACCEPTED -> EXECUTING -> COMPLETED -> VERIFIED -> CLOSED`

## Completion gate

A governed step is complete only when:

1. it is documented in the canonical Drive;
2. target-system implementation or execution exists;
3. both records are cross-referenced;
4. verification evidence exists;
5. status is consistent.

An undocumented or unlinked implementation is an `UNGOVERNED CHANGE` and is not canonical or production-ready.
