# Phoenix Office Companion

**Status:** Active development — staging administration handoff  
**Executive Office:** Billy  
**Parent product:** Phoenix One  
**Parent runtime:** Phoenix Companion Runtime  
**Canonical Drive folder:** `02_Runtime_Companions/Office_Companion`  
**Drive folder ID:** `11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z`

## Purpose

The Phoenix Office Companion is a governed knowledge-work companion inside Phoenix One. Its universal core is LLM-independent. Gemini, Claude and ChatGPT implement the same request, response, routing, controlled-output and evaluation contracts.

No provider is a permanent default. Selection is governed by data policy, capability, approved evidence and an eligible explicit preference. Silent fallback is prohibited.

## Canonical artifacts

Drive is authoritative for approved business, governance and architecture specifications:

- `PHX-COMP-OFFICE-001` — Phoenix Office Companion System Definition v1.0
- `PHX-COMP-OFFICE-002` — Provider-Neutral Runtime and Routing Architecture v1.0
- `PHX-COMP-OFFICE-003` — Runtime Hosting and MVP Deployment Decision v1.0
- `PHX-COMP-OFFICE-004` — Gemini Reference Adapter and Controlled Output Workflow v1.0
- `PHX-COMP-OFFICE-005` — Multi-Provider Adapter Expansion and Evaluation Framework v1.0
- `PHX-COMP-OFFICE-006` — Governed Staging Deployment and Provider Evidence Protocol v1.0
- `PHX-COMP-OFFICE-007` — Staging Administration Handoff and Live Proof Runbook v1.0

GitHub is authoritative for executable implementation, configuration, tests, infrastructure definitions, container images and CI evidence.

## Runtime API

| Endpoint | Purpose |
|---|---|
| `GET /health` | Process liveness |
| `GET /ready` | Governance, configuration and provider readiness |
| `POST /v1/route` | Policy-first provider selection without execution |
| `POST /v1/complete` | Controlled provider execution and Microsoft-ready packaging |

The completion endpoint returns a `Draft / Review Candidate` with `validationState: unvalidated`, `humanReviewRequired: true` and `autonomousPublication: false`. It does not upload, send, approve or publish anything in Microsoft 365.

## Provider activation

Live execution requires the master switch and an explicit provider allowlist:

```text
OFFICE_COMPANION_ENABLE_LIVE_PROVIDER=true
OFFICE_COMPANION_ENABLED_PROVIDERS=gemini,claude,chatgpt
```

Every enabled provider requires its deployment credential and model. Unknown IDs, duplicates, incomplete enabled-provider configuration and credential residue for disabled providers fail readiness.

### Gemini

```text
GEMINI_API_KEY=<deployment secret>
GEMINI_MODEL=<approved model>
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=60000
```

### Claude

```text
ANTHROPIC_API_KEY=<deployment secret>
CLAUDE_MODEL=<approved model>
CLAUDE_API_BASE_URL=https://api.anthropic.com/v1
CLAUDE_TIMEOUT_MS=60000
ANTHROPIC_VERSION=2023-06-01
```

### ChatGPT

```text
OPENAI_API_KEY=<deployment secret>
OPENAI_MODEL=<approved model>
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT_MS=60000
```

Provider-specific credentials, model names, transports and error formats remain isolated inside adapters.

## Shared Microsoft-ready workflow

All adapters use one provider-neutral prompt builder and one draft schema. The provider generates content only. Phoenix adds target system, sensitivity, validation state, human-review requirement, provider metadata and the non-publication boundary.

The shared package contains a management summary, decision requirement, at least two options, recommendation, rationale, assumptions, open points, internal validation requirements, evidence status, excluded-information record and trace metadata.

## Data and execution boundary

| Class | Runtime behavior |
|---|---|
| GREEN | May be processed by an eligible operational provider |
| YELLOW | Must be explicitly sanitized before routing |
| RED | Rejected before any provider network call |

The first live staging protocol is intentionally GREEN-only. A provider credential never grants permission to process data. Human review remains mandatory. Microsoft Graph, SharePoint upload, Outlook send and Teams publication remain outside the current gate.

## Fair routing and evaluation

Newly activated adapters begin with neutral, unverified evidence. Equal top scores are resolved by a deterministic hash of the request ID, keeping one request stable while distributing equal-score requests across providers.

Controlled results can be evaluated across schema compliance, governance compliance, content completeness, evidence compliance, latency, token efficiency, reliability and explicit error behavior. Schema, governance and required-evidence failures are blocking. Repository configuration does not invent production quality scores.

## Governed staging target

The prepared staging target is Azure Container Apps. Nothing is provisioned automatically by a pull request or ordinary push.

The staging foundation includes:

- Azure Container Registry with admin authentication disabled;
- a user-assigned managed identity;
- `AcrPull` and `Key Vault Secrets User` role assignments;
- an existing approved Azure Key Vault with versionless provider secret references;
- Log Analytics and an Azure Container Apps managed environment;
- Git-SHA-tagged application images;
- startup and liveness probes on `/health`;
- readiness probe on `/ready`;
- multiple revision mode for controlled rollback.

Infrastructure entry point:

```text
infra/office-companion/staging/main.bicep
```

## Manual deployment gate

Live staging is available only through:

```text
.github/workflows/office-companion-staging.yml
```

The workflow:

1. is `workflow_dispatch` only;
2. requires the protected GitHub environment `office-companion-staging`;
3. requires the explicit `DEPLOY` confirmation input;
4. authenticates to Azure with GitHub OIDC;
5. deploys the foundation;
6. builds an immutable Git-SHA image in Azure Container Registry;
7. deploys the Container App revision using managed identity and Key Vault references;
8. verifies health and readiness;
9. executes one fixed GREEN-data proof per selected provider;
10. uploads an evidence package for human review.

Provider secret values never enter GitHub workflow inputs, Bicep parameter files or evidence output.

## Staging evidence package

The evidence runner is:

```text
src/companions/office-companion/staging/run-staging-proof.ts
```

For each explicitly selected provider it sends the same synthetic GREEN scenario with fallback disabled and writes:

- sanitized request;
- normalized response;
- provider evaluation;
- health and readiness metadata;
- JSON and Markdown summaries.

Evidence is a review candidate, not an automatic routing-score update. Promotion into canonical records requires human review.

## Staging administration handoff

The canonical operational runbook is `PHX-COMP-OFFICE-007`. The repository summary is:

```text
docs/companions/office-companion/STAGING-ADMIN-HANDOFF.md
```

Before a live workflow can run, an authorized administrator must configure:

- protected GitHub environment `office-companion-staging` and required reviewers;
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and `AZURE_SUBSCRIPTION_ID` as environment secrets;
- GitHub-to-Azure OIDC federation matching the active environment subject;
- Azure resource and `Microsoft.Authorization/roleAssignments/write` permissions at the required scopes;
- Azure Key Vault coordinates and provider secret names;
- provider API keys inside Key Vault only;
- approved model identifiers;
- an accepted location and globally unique registry name.

The expected immutable GitHub environment subject for the current repository metadata is recorded in the runbook, but the Azure administrator must verify the active repository OIDC subject before creating the federated credential.

These values are deployment administration, not repository content. Until they exist, the staging status remains `prepared-not-provisioned` and the live-proof status remains `not-executed`.

## Development and tests

```text
npm install --no-audit --no-fund
npm run validate:office
npm run validate:office-staging
npm run typecheck
npm run acceptance:office
npm run smoke:office-server
npm run acceptance:office-gemini
npm run acceptance:office-multi
npm run acceptance:office-staging
npm run build:office
npm test
```

Pull-request CI uses deterministic local provider and staging mocks. It requires no Azure account and no provider credential.

## Current gate

The repository contains the staging infrastructure, proof machinery and administration runbook, but no Azure resources or real provider evidence are claimed. The next external gate is to complete `PHX-COMP-OFFICE-007`, execute one approved GREEN-data proof for Gemini, Claude and ChatGPT, and review the evidence before provider scores change or a Microsoft Graph connector gate opens.
