# Phoenix Office Companion

**Status:** Active development — runtime foundation  
**Executive Office:** Billy  
**Parent product:** Phoenix One  
**Parent runtime:** Phoenix Companion Runtime  
**Canonical Drive folder:** `02_Runtime_Companions/Office_Companion`  
**Drive folder ID:** `11xgFf_OR6Q6DqvKeH0iDOFDDoW4dOP1z`

## Purpose

The Phoenix Office Companion is a specialized companion for governed knowledge work across personal AI workspaces and enterprise office systems. It is not a separate top-level Phoenix product and it does not replace the shared Phoenix Companion Runtime.

Its core is LLM-independent. Gemini, Claude and ChatGPT are the initial first-class provider targets. Provider names remain in adapters and configuration; universal task, policy, workflow and response contracts remain provider-neutral.

## Canonical artifacts

Drive remains authoritative for approved business, governance and architecture specifications:

- `PHX-COMP-OFFICE-001` — Phoenix Office Companion System Definition v1.0
- `PHX-COMP-OFFICE-002` — Provider-Neutral Runtime and Routing Architecture v1.0
- `PHX-COMP-OFFICE-003` — Runtime Hosting and MVP Deployment Decision v1.0

GitHub remains authoritative for executable implementation, configuration, tests, container definition and CI evidence.

## Runtime decision

The Office Companion runs as a stateless HTTP service inside a portable container image.

- local development: Docker-compatible runtime
- CI and acceptance: GitHub Actions
- first governed production target: Azure Container Apps
- portable core: no Azure SDK types in universal contracts
- live provider execution: disabled during the server-foundation gate
- production credentials: prohibited in source control and Drive specifications

Azure is the first deployment target because the intended enterprise integration surface includes Microsoft Entra ID, Microsoft Graph, Azure Key Vault and Microsoft 365. The Office Companion core remains deployable on another approved container platform.

## Foundation endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Process liveness |
| `GET /ready` | Configuration, governance-anchor and provider-registry readiness |
| `POST /v1/route` | Policy-first provider selection without a live model call |

The routing endpoint validates the normalized task contract, rejects RED data, rejects unsanitized YELLOW data and fails closed when no registered provider is operational. No endpoint sends, publishes, approves or performs consequential external actions.

## Foundation structure

- `config/office-companion.json` — ownership, Drive anchors, provider registry, hosting and execution boundary
- `src/companions/office-companion/contracts.ts` — normalized request, response, evidence, tool and adapter contracts
- `src/companions/office-companion/provider-registry.ts` — registered provider targets and controlled activation helper
- `src/companions/office-companion/router.ts` — policy-first provider selection
- `src/companions/office-companion/server.ts` — stateless HTTP runtime
- `src/companions/office-companion/fixtures/` — routing acceptance and server smoke tests
- `scripts/validate-office-companion.mjs` — governance, hosting and repository drift validation
- `Dockerfile` — non-root, multi-stage runtime image
- `.github/workflows/office-companion.yml` — CI and container gate

## Provider policy

The foundation registers:

- Gemini
- Claude
- ChatGPT

No provider is represented as operational until a tested adapter and approved deployment credentials exist. There is no permanent default provider. Runtime selection is based on:

1. data and enterprise policy;
2. required capability and tool access;
3. explicit eligible user preference;
4. current quality, reliability, latency and cost evidence;
5. provider availability.

Fallback is never silent. It must be permitted, policy-compliant, recorded and disclosed.

## Data gate

| Class | Foundation behavior |
|---|---|
| GREEN | May be routed to an allowed and operational provider |
| YELLOW | Requires minimization, anonymization, aggregation or abstraction before routing |
| RED | Rejected for external provider routing by default |

A provider connection never grants permission to process data. Deployment policy and data classification remain authoritative.

## Operating modes

- **FIND** — retrieve and summarize approved information
- **THINK** — structure, challenge and synthesize
- **BUILD** — produce working artifacts
- **VALIDATE** — check against approved evidence and internal records
- **PUBLISH** — transfer reviewed outputs into the applicable system of record

Material publication remains human-approved.

## Microsoft deployment boundary

For a Microsoft deployment, Microsoft 365 remains the system of record for Outlook, Teams, SharePoint, OneDrive and approved Office artifacts. Microsoft 365 Copilot may be used for tenant-side retrieval and validation, but it is neither the universal reasoning core nor a hard dependency of the Office Companion.

Microsoft Graph access is introduced only through a separately approved connector, tenant administration and explicit scopes.

## Development commands

```text
npm install --no-audit --no-fund
npm run validate:office
npm run typecheck
npm run acceptance:office
npm run smoke:office-server
npm run build:office
npm test
```

Run the compiled server:

```text
npm run build:office
npm run start:office
```

Build and run the container:

```text
docker build -t phoenix-office-companion .
docker run --rm -p 8080:8080 phoenix-office-companion
```

## Current gate

The runtime-foundation gate requires:

- Billy ownership and correct Phoenix repository anchors;
- all three canonical Drive artifacts;
- Gemini, Claude and ChatGPT registered as equal first-class targets;
- no permanent provider default;
- fail-closed data and execution policies;
- compile-safe provider-neutral contracts;
- health, readiness and routing smoke evidence;
- a successful non-root container build and health check;
- no production credential or live model call.

The next delivery gate is the Gemini reference adapter and one sanitized end-to-end workflow that creates a Microsoft-ready output package, requires human validation and does not establish Gemini as a permanent default.
