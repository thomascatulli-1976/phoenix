# PHX-ROS-001 — Phoenix Repository Operating System Architecture v1.0

**Status:** Active  
**Approval Authority:** Phoenix One Architecture Governance  
**Effective Date:** 2026-07-25

## Purpose

The Phoenix Repository Operating System (ROS) turns the canonical Phoenix Drive and GitHub repository into a governed, traceable and machine-readable enterprise repository.

## Scope

ROS governs:

- artifact registration
- repository indexing
- dependency relationships
- synchronization between Drive and GitHub
- repository health checks
- change history
- search metadata
- dashboard metrics
- digital-twin representation

## Core components

1. **Master Artifact Registry** — canonical inventory of Phoenix artifacts.
2. **Relationship Registry** — typed edges between artifacts and capabilities.
3. **Repository Index** — navigational views by domain, module, lifecycle and status.
4. **Synchronization Layer** — Drive/GitHub state and divergence tracking.
5. **Repository Health Engine** — validation of IDs, versions, owners, paths and references.
6. **Architecture Dashboard** — aggregate maturity and defect metrics.
7. **Repository Digital Twin** — graph representation for agents, impact analysis and automated navigation.

## Canonical artifact lifecycle

`DRAFT -> REVIEW -> APPROVED -> ACTIVE -> SUPERSEDED -> ARCHIVED`

## Synchronization states

- `IN_SYNC`
- `DRIVE_AHEAD`
- `GITHUB_AHEAD`
- `DIVERGED`
- `NOT_APPLICABLE`
- `UNKNOWN`

## Health states

- `HEALTHY`
- `WARNING`
- `CRITICAL`
- `UNVERIFIED`

## Mandatory controls

Every governed artifact must have:

- unique artifact ID
- title and type
- semantic version
- lifecycle and approval status
- owner and approval authority
- canonical Drive path and file ID
- GitHub path where applicable
- synchronization status
- health status
- effective and review dates
- tags and relationships
- last verification timestamp

## Invariants

- The canonical Drive root never changes without an approved migration decision.
- GitHub is mandatory for source code, schemas, tests and machine-readable contracts.
- No artifact is considered persisted until it has been read back and verified.
- Registry and repositories must not silently diverge.
- Unknown or conflicting artifacts are isolated in Review Hold.

## Implementation contracts

Machine-readable contracts live under:

- `registry/`
- `schemas/repository/`
- `governance/repository/`
- `architecture/repository/`

## Initial implementation

The first operational registry is `PHX-REG-002 — Phoenix Master Artifact Registry v1.0` in the canonical Drive repository, mirrored through `registry/artifacts.json` in GitHub.
