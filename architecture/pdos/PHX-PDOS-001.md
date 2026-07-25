# PHX-PDOS-001 — Phoenix Decision Operating System Architecture v1.0

Status: Architecture Baseline  
Approval Authority: Phoenix One Architecture Governance

## Purpose

PDOS is the domain-neutral decision core of Phoenix One. It transforms evidence, context, policies, risk constraints and authority into traceable decisions and executable commands.

## Position

- PKOS provides knowledge, evidence and provenance.
- PROS provides canonical risk, exposure, limits and portfolio constraints.
- PDOS evaluates and resolves decisions.
- PEOS executes approved commands and workflows.
- Commander, Pilot and Copilot interact through governed commands, events and delegations.

## Core components

1. Decision Intake
2. Context Builder
3. Evidence Resolver
4. Confidence Engine
5. Policy Engine
6. Risk Adapter
7. Option Evaluator
8. Authority Resolver
9. Decision Orchestrator
10. Decision Ledger
11. Learning Adapter

## Canonical lifecycle

`DRAFT -> INTAKE_VALIDATED -> CONTEXT_READY -> EVIDENCE_READY -> OPTIONS_READY -> POLICY_EVALUATED -> RISK_EVALUATED -> AUTHORITY_READY -> RECOMMENDED -> APPROVED|REJECTED|DEFERRED -> EXECUTION_REQUESTED -> EXECUTING -> EXECUTED|EXECUTION_FAILED|CANCELLED -> OUTCOME_OBSERVED -> REVIEWED -> CLOSED`

Exceptional states: `SUSPENDED`, `EXPIRED`, `SUPERSEDED`, `VOID`.

## Mandatory decision sections

- identity
- request
- context
- options
- evidence
- confidence
- policyEvaluation
- riskEvaluation
- authority
- resolution
- execution
- outcome
- audit

## Invariants

- No material action without an explicit decision or policy-approved delegated decision.
- Unknown, conflicting and stale evidence remains visible.
- Confidence is structured metadata, not rhetorical certainty.
- Risk and authority are evaluated before execution.
- Every state transition is event-backed and auditable.
- Finalized decisions are immutable; changes create superseding versions.
- Runtime roles derive authority only from registered delegations and policies.
- Modules may extend PDOS contracts but may not weaken governance controls.

## Policy result set

`PASS`, `PASS_WITH_CONDITIONS`, `REVIEW_REQUIRED`, `EXCEPTION_REQUIRED`, `BLOCK`, `NOT_APPLICABLE`.

## Required engineering contracts

- `decision.schema.json`
- `decision-context.schema.json`
- `decision-option.schema.json`
- `confidence-assessment.schema.json`
- `policy-evaluation.schema.json`
- `authority-resolution.schema.json`
- `decision-state.schema.json`
- command and event schemas
- registry seeds
- valid and invalid fixtures
- conformance tests

The canonical long-form architecture document is stored in Google Drive under `01_Platform_Core/02_PDOS_Decision_OS`.
