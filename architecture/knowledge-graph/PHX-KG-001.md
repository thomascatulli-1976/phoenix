# PHX-KG-001 — Phoenix Knowledge Graph Architecture v1.0

**Status:** ACTIVE  
**Approval:** APPROVED  
**Owner:** Phoenix Knowledge Architecture  
**Approval Authority:** Phoenix One Architecture Governance  
**Effective Date:** 2026-07-25

## Executive definition

The Phoenix Knowledge Graph (PKG) is the semantic control layer connecting Phoenix artifacts, decisions, evidence, policies, capabilities, modules, runtime components and implementation assets into one governed graph.

It is not merely a search index. It represents what Phoenix knows, what each object means, how objects are related, which source is authoritative and what is affected by change.

## Mission

The PKG gives Commander, Pilot, Copilot and every Phoenix module a common, governed knowledge substrate for retrieval, decisions, provenance, impact analysis, execution and learning.

## Core principles

- Canonical-source integrity
- Provenance first
- Typed relationships
- Version-aware knowledge
- Separation of shared and domain knowledge
- Confidence and validity metadata
- Human and agent readability
- Permission-aware traversal

## Node classes

`ARTIFACT`, `DECISION`, `POLICY`, `STANDARD`, `REQUIREMENT`, `CAPABILITY`, `MODULE`, `SERVICE`, `COMPONENT`, `AGENT`, `ROLE`, `PERSON`, `ORGANIZATION`, `DATASET`, `SCHEMA`, `EVENT`, `RISK`, `CONTROL`, `EVIDENCE`, `CLAIM`, `METRIC`, `WORKFLOW`, `TASK`, `RELEASE`, `REPOSITORY_LOCATION`.

Mandatory node attributes include identity, type, canonical name, lifecycle, version, owner, authority, source system, source identifier, canonical URI, validity interval, confidence, classification, tags and verification timestamps.

## Relationship vocabulary

`DEPENDS_ON`, `IMPLEMENTS`, `GOVERNED_BY`, `APPROVED_BY`, `OWNED_BY`, `PART_OF`, `CONTAINS`, `REFERENCES`, `SUPERSEDES`, `DERIVED_FROM`, `EVIDENCED_BY`, `CONTRADICTS`, `SUPPORTS`, `AFFECTS`, `MITIGATES`, `TRIGGERS`, `PRODUCES`, `CONSUMES`, `EXECUTED_BY`, `MONITORED_BY`, `VALIDATED_BY`, `SYNCHRONIZED_WITH`, `MIRRORED_IN`, `APPLIES_TO`, `REQUIRES`, `BLOCKS`, `ENABLES`.

Every edge carries source, target, type, authority, confidence, validity, provenance and verification metadata.

## Graph layers

1. Repository Graph
2. Architecture Graph
3. Decision Graph
4. Knowledge Graph
5. Execution Graph
6. Learning Graph

## Authority hierarchy

1. Approved governance and architecture artifacts in canonical Drive
2. Approved machine-readable contracts and implementation in GitHub
3. Master Artifact Registry and Relationship Registry
4. Approved decision records
5. Verified internal datasets
6. Approved external sources
7. Unverified working material

Conflicts create explicit findings and are never silently merged.

## Ingestion pipeline

`SOURCE DISCOVERY -> IDENTITY RESOLUTION -> METADATA EXTRACTION -> CLASSIFICATION -> NODE UPSERT -> EDGE EXTRACTION -> PROVENANCE -> VALIDATION -> CONFLICT CHECK -> GRAPH COMMIT -> INDEX UPDATE -> HEALTH CHECK -> AUDIT LOG`

## Retrieval capabilities

- Artifact-ID lookup
- Relationship traversal
- Current and historical state reconstruction
- Dependency and impact analysis
- Provenance tracing
- Authority and ownership lookup
- Risk and control lookup
- Module and capability maps
- Conflict discovery
- Semantic retrieval constrained by graph context

## Impact levels

`LOCAL`, `DOMAIN`, `PLATFORM`, `ENTERPRISE`, `CRITICAL`.

## Agent access

- Commander: enterprise state, authority, conflicts and cross-domain impact
- Pilot: execution dependencies, controls and next actions
- Copilot: bounded contextual retrieval
- Domain companions: authorized subgraphs plus shared platform dependencies

Unverified nodes may not be presented as approved truth.

## Security classifications

`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Derived answers inherit the highest classification of their supporting sources.

## Critical graph defects

- Orphan approved artifact
- Duplicate canonical ID
- Missing provenance
- Broken canonical URI
- Active node depending only on superseded evidence
- Circular governance dependency
- Unknown relationship type
- Unauthorized source-priority override
- Stale critical node
- Drive/GitHub divergence

## Synchronization model

Drive is the documentation source of truth. GitHub is the implementation source of truth. The registry controls identity and synchronization state. The graph links both without replacing either repository.

States: `IN_SYNC`, `DRIVE_AHEAD`, `GITHUB_AHEAD`, `DIVERGED`, `NOT_APPLICABLE`, `UNKNOWN`.

## V1 delivery

- Node and edge schemas
- Controlled vocabularies
- Registry integration
- Initial graph export
- Active artifact nodes
- Repository and dependency edges
- Provenance links
- Health findings
- One executable impact-analysis query

## Dependencies

- `PHX-KG-001 DEPENDS_ON PHX-ROS-001`
- `PHX-KG-001 CONSUMES PHX-REG-002`
- `PHX-KG-001 REFERENCES PHX-REP-001`
- `PHX-KG-001 ENABLES Commander, Pilot and Copilot repository navigation`

## Canonical locations

- Drive: `05_Governance_Repository/01_Repository_Operating_System/PHX-KG-001`
- GitHub: `architecture/knowledge-graph/PHX-KG-001.md`
- Schemas: `schemas/knowledge-graph/`
- Graph exports: `registry/knowledge-graph/`
