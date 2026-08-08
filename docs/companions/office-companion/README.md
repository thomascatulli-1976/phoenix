# Phoenix Office Companion

**Status:** Active development — multi-provider adapter gate  
**Executive Office:** Billy  
**Parent product:** Phoenix One  
**Parent runtime:** Phoenix Companion Runtime  
**Canonical Drive folder:** `02_Runtime_Companions/Office_Companion`  
**Drive folder ID:** `11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z`

## Purpose

The Phoenix Office Companion is a governed knowledge-work companion inside Phoenix One. Its core remains LLM-independent. Gemini, Claude and ChatGPT implement the same provider-neutral request, response, routing and Microsoft-ready output contracts.

No provider is a permanent default. Selection is governed by data policy, capability, current evidence and an eligible explicit user preference.

## Canonical artifacts

Drive is authoritative for approved business, governance and architecture specifications:

- `PHX-COMP-OFFICE-001` — Phoenix Office Companion System Definition v1.0
- `PHX-COMP-OFFICE-002` — Provider-Neutral Runtime and Routing Architecture v1.0
- `PHX-COMP-OFFICE-003` — Runtime Hosting and MVP Deployment Decision v1.0
- `PHX-COMP-OFFICE-004` — Gemini Reference Adapter and Controlled Output Workflow v1.0
- `PHX-COMP-OFFICE-005` — Multi-Provider Adapter Expansion and Evaluation Framework v1.0

GitHub is authoritative for executable implementation, configuration, tests, container definition and CI evidence.

## Runtime API

| Endpoint | Purpose |
|---|---|
| `GET /health` | Process liveness |
| `GET /ready` | Governance, configuration and provider readiness |
| `POST /v1/route` | Policy-first provider selection without execution |
| `POST /v1/complete` | Controlled provider execution and Microsoft-ready packaging |

The completion endpoint returns a `Draft / Review Candidate` with `validationState: unvalidated`, `humanReviewRequired: true` and `autonomousPublication: false`. It does not upload, send, approve or publish anything in Microsoft 365.

## Provider activation

The master control is:

```text
OFFICE_COMPANION_ENABLE_LIVE_PROVIDER=true
```

The independent provider allowlist is:

```text
OFFICE_COMPANION_ENABLED_PROVIDERS=gemini,claude,chatgpt
```

When the master control is true and the allowlist is omitted, only Gemini is enabled for backward compatibility with the reference-adapter stage. This is not a routing default.

Every enabled provider requires both its credential and model. Credentials or model configuration for a provider outside the allowlist cause a fail-closed readiness error. Unknown and duplicate provider IDs also fail readiness.

### Gemini

```text
GEMINI_API_KEY=<deployment secret>
GEMINI_MODEL=<approved model>
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=60000
```

The adapter uses `x-goog-api-key` and JSON-schema-constrained content generation.

### Claude

```text
ANTHROPIC_API_KEY=<deployment secret>
CLAUDE_MODEL=<approved model>
CLAUDE_API_BASE_URL=https://api.anthropic.com/v1
CLAUDE_TIMEOUT_MS=60000
ANTHROPIC_VERSION=2023-06-01
```

The adapter uses the Anthropic Messages API, forces one `create_microsoft_ready_draft` client tool, disables parallel tool use and validates the resulting `tool_use` input.

### ChatGPT

```text
OPENAI_API_KEY=<deployment secret>
OPENAI_MODEL=<approved model>
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT_MS=60000
```

The adapter uses the OpenAI Responses API, `Authorization: Bearer`, `store: false` and strict JSON-schema output through `text.format`.

## Shared workflow

All adapters use one provider-neutral prompt builder and one Microsoft-ready draft schema. Providers generate draft content only. Phoenix adds governance fields including target system, sensitivity, validation state, human-review requirement, provider metadata and the non-publication boundary.

The shared output includes:

- decision memo identity and title;
- management summary and decision requirement;
- at least two options with benefits and risks;
- recommendation and rationale;
- assumptions, open points and internal validation requirements;
- source/evidence status;
- excluded-information record;
- provider, model, request and trace metadata;
- explicit unvalidated and non-publishing status.

## Data and execution boundary

| Class | Runtime behavior |
|---|---|
| GREEN | May be processed by an eligible operational provider |
| YELLOW | Must be explicitly sanitized before routing |
| RED | Rejected before any provider network call |

A provider credential never grants permission to process data. Human review remains mandatory. Silent fallback is prohibited. Microsoft Graph, SharePoint upload, Outlook send and Teams publication remain outside this gate.

## Fair routing

Newly activated adapters start with neutral, unverified evidence. Equal top scores are resolved by a deterministic hash of the request ID. The same request remains stable while equal-score requests are distributed across eligible providers. This avoids a hidden alphabetical or vendor default.

## Evaluation framework

Every successful controlled result can be evaluated across:

- schema compliance — 25%;
- governance compliance — 25%;
- content completeness — 20%;
- evidence compliance — 10%;
- latency efficiency — 10%;
- token efficiency — 10%;
- provider reliability — observed, initially unweighted;
- explicit error behavior — tested separately, initially unweighted.

Schema, governance and required evidence failures are blocking. A high aggregate score cannot override a blocking failure. Production quality scores may be updated only from approved tests, staging evidence or permitted telemetry.

## Development and tests

```text
npm install --no-audit --no-fund
npm run validate:office
npm run typecheck
npm run acceptance:office
npm run smoke:office-server
npm run acceptance:office-gemini
npm run acceptance:office-multi
npm run build:office
npm test
```

CI uses deterministic local provider mocks and no production credentials. It verifies activation controls, authentication headers, secret isolation, structured output, identical Microsoft-ready package shape, RED/YELLOW policy rejection, human review, tie distribution, evaluation scoring, build and credential-free container behavior.

## Hosting

- local development: Docker-compatible runtime;
- CI: GitHub Actions without provider secrets;
- first governed staging target: Azure Container Apps;
- secret target: Azure Key Vault or approved equivalent;
- universal core: no provider SDK or Azure SDK dependency.

## Current gate

The multi-provider gate passes when all five Drive artifacts are linked, all three adapters compile and pass deterministic tests, no provider is enabled by default, activation requires master switch plus allowlist plus complete provider configuration, structured output is validated, routing ties do not create a permanent default, governance metadata remains Phoenix-owned and no secret is persisted or exposed.

The next delivery gate is an approved GREEN-data staging proof for each provider, followed by evidence review and a separately governed Microsoft Graph connector design.
