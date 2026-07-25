# PHX-STATE-001 — Universal Object Lifecycle v1.0

Status: APPROVED  
Decision ID: PHX-EO-DEC-087  
Effective date: 2026-07-25  
Approval Authority: Phoenix Executive Office

Canonical Drive repository:  
https://drive.google.com/drive/folders/18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg?usp=drive_link

Canonical Drive document:  
https://docs.google.com/document/d/1hNyy6tyHiadv-6A8ANjcN4yM4Od4S4roKG4bKURPkkc/edit

## Purpose

Defines the universal, domain-independent lifecycle for all governed Phoenix objects.

## Standard lifecycle

`DRAFT -> CREATED -> VALIDATED -> APPROVED -> ACTIVE -> COMPLETED -> ARCHIVED`

`ACTIVE` may transition to `SUSPENDED` and later return to `ACTIVE`.

## Terminal states

- `REJECTED`
- `CANCELLED`
- `FAILED`
- `DELETED`, only where governance permits deletion

## Transition governance

Every state transition must be explicitly allowed, policy-authorized, attributable to an actor and recorded as an immutable event. Silent status changes are prohibited.

## Mandatory transition record

- event_id
- object_id
- object_type
- previous_state
- new_state
- actor_id and actor_type
- timestamp
- reason
- policy_reference
- confidence_snapshot
- risk_snapshot
- object_version
- correlation_id
- causation_id
- audit metadata

## Transition rules

- DRAFT -> CREATED | CANCELLED
- CREATED -> VALIDATED | REJECTED | CANCELLED | FAILED
- VALIDATED -> APPROVED | REJECTED | CANCELLED | FAILED
- APPROVED -> ACTIVE | CANCELLED | FAILED
- ACTIVE -> SUSPENDED | COMPLETED | CANCELLED | FAILED
- SUSPENDED -> ACTIVE | CANCELLED | FAILED
- COMPLETED -> ARCHIVED
- REJECTED requires a new governed version
- CANCELLED, FAILED and ARCHIVED are terminal unless an explicit recovery policy creates a new version
- DELETED is terminal

## Architecture relationships

- PHX-OBJ-000 defines object identity and structure.
- PHX-GRAPH-001 defines object relationships.
- PHX-STATE-001 defines object lifecycle.
- PHX-EVENT-001 records lifecycle changes.
- PHX-POLICY-001 authorizes transitions.
- PDOS executes the governed state machine.
