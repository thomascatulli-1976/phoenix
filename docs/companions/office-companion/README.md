# Phoenix Office Companion

**Status:** Active development — Gemini reference adapter  
**Executive Office:** Billy  
**Parent product:** Phoenix One  
**Parent runtime:** Phoenix Companion Runtime  
**Canonical Drive folder:** `02_Runtime_Companions/Office_Companion`  
**Drive folder ID:** `11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z`

## Purpose

The Phoenix Office Companion is a specialized companion for governed knowledge work across personal AI workspaces and enterprise office systems. It remains part of Phoenix One and uses the shared Phoenix Companion Runtime.

The core is LLM-independent. Gemini, Claude and ChatGPT are equal first-class provider targets. Gemini is implemented first as a reference adapter; it is not a permanent default.

## Canonical artifacts

Drive remains authoritative for approved business, governance and architecture specifications:

- `PHX-COMP-OFFICE-001` — Phoenix Office Companion System Definition v1.0
- `PHX-COMP-OFFICE-002` — Provider-Neutral Runtime and Routing Architecture v1.0
- `PHX-COMP-OFFICE-003` — Runtime Hosting and MVP Deployment Decision v1.0
- `PHX-COMP-OFFICE-004` — Gemini Reference Adapter and Controlled Output Workflow v1.0

GitHub remains authoritative for executable implementation, configuration, tests, container definition and CI evidence.

## Runtime

The Office Companion is a stateless HTTP service in a portable container image.

| Endpoint | Purpose |
|---|---|
| `GET /health` | Process liveness |
| `GET /ready` | Governance, runtime and provider readiness |
| `POST /v1/route` | Policy-first provider selection without execution |
| `POST /v1/complete` | Credential-gated provider execution and Microsoft-ready packaging |

The completion endpoint never publishes to Microsoft 365. It returns a `Draft / Review Candidate` with `validationState: unvalidated`, `humanReviewRequired: true` and `autonomousPublication: false`.

## Gemini reference adapter

The Gemini adapter:

- activates only when both `GEMINI_API_KEY` and `GEMINI_MODEL` are present;
- sends the credential only in the provider authentication header;
- requests JSON structured output using the Phoenix decision-memo schema;
- normalizes provider output into the universal Office Companion response contract;
- rejects provider failures, blocked responses, empty responses and invalid structured output;
- does not log or persist the credential;
- does not make Gemini the permanent default provider.

Runtime configuration:

```text
GEMINI_API_KEY=<deployment secret>
GEMINI_MODEL=<approved model identifier>
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=60000
```

Real values belong only in a local untracked environment file or an approved deployment secret store. The repository contains `.env.example` with an empty credential field.

## Controlled output workflow

The first end-to-end workflow produces a Microsoft-ready decision memo package containing:

- artifact title and type;
- draft/review status;
- target system;
- decision requirement;
- management summary;
- options, recommendation and rationale;
- assumptions and open points;
- internal validation requirements;
- source/evidence status;
- excluded information;
- provider and trace metadata;
- explicit human-review and non-publication controls.

The provider generates only the draft content. Phoenix adds governance fields such as owner placeholder, sensitivity, validation state, target system and publication boundary.

## Data gate

| Class | Runtime behavior |
|---|---|
| GREEN | May be routed to an eligible operational provider |
| YELLOW | Must be sanitized before routing |
| RED | Rejected before any external provider call |

A provider credential never grants permission to process data.

## Provider policy

- Gemini: registered, reference adapter implemented, operational only when configured
- Claude: registered, adapter planned
- ChatGPT: registered, adapter planned
- permanent default: none
- silent fallback: prohibited
- fallback: only when policy permits and the selected change is disclosed

## Microsoft boundary

Microsoft 365 remains the enterprise system of record for Outlook, Teams, SharePoint, OneDrive and approved Office artifacts. The current workflow produces a Microsoft-ready package but performs no Graph call, upload, send, approval or publication.

A future Microsoft Graph connector requires separate tenant administration, scopes, security review and approval.

## Development and tests

```text
npm install --no-audit --no-fund
npm run validate:office
npm run typecheck
npm run acceptance:office
npm run smoke:office-server
npm run acceptance:office-gemini
npm run build:office
npm test
```

The Gemini acceptance test uses a deterministic local mock. It checks authentication-header handling, structured-output configuration, RED-data rejection, human-review enforcement and Microsoft-ready packaging without calling a live provider or requiring a real secret.

Run without a provider credential:

```text
npm run build:office
npm run start:office
```

The server reports ready, while `/v1/complete` fails closed because no provider is operational.

Run a credential-gated local proof:

```text
cp .env.example .env
# Populate GEMINI_API_KEY and GEMINI_MODEL locally, then export the variables.
npm run build:office
npm run start:office
```

No `.env` file may be committed.

## Hosting

- local development: Docker-compatible runtime
- CI: GitHub Actions without provider credentials
- first governed staging target: Azure Container Apps
- secret target: Azure Key Vault or an approved equivalent
- universal core: no Azure SDK or Gemini SDK dependency

## Current gate

The reference-adapter gate passes when:

- Billy ownership and all four Drive artifacts are traceable;
- Gemini, Claude and ChatGPT remain registered in canonical order;
- Gemini activates only through deployment configuration;
- no permanent provider default is introduced;
- RED and unsanitized YELLOW data are rejected before execution;
- structured output is validated and normalized;
- every output package remains unvalidated and human-reviewed;
- unit, server, adapter, build and container gates pass without a live secret.

The next delivery gate is one live sanitized Gemini staging proof using an approved deployment secret. After that, Claude and ChatGPT adapters can be implemented against the same contracts.
