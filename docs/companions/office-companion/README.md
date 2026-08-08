# Phoenix Office Companion

**Status:** Active development — foundation  
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

GitHub remains authoritative for executable implementation, configuration, tests and CI evidence.

## Foundation structure

- `config/office-companion.json` — machine-readable ownership, Drive anchors, provider registry and execution boundary
- `src/companions/office-companion/contracts.ts` — normalized request, response, evidence, tool and adapter contracts
- `src/companions/office-companion/provider-registry.ts` — registered provider targets and controlled activation helper
- `src/companions/office-companion/router.ts` — policy-first provider selection
- `src/companions/office-companion/fixtures/` — acceptance tests
- `scripts/validate-office-companion.mjs` — configuration and governance drift validation
- `.github/workflows/office-companion.yml` — CI gate

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
| GREEN | May be routed to an allowed provider |
| YELLOW | Requires minimization, anonymization, aggregation or abstraction before routing |
| RED | Rejected for external provider routing by default |

A provider connection never grants permission to process data. Deployment policy and data classification remain authoritative.

## Operating modes

- **FIND** — retrieve and summarize approved information
- **THINK** — structure, challenge and synthesize
- **BUILD** — produce working artifacts
- **VALIDATE** — check against approved evidence and internal records
- **PUBLISH** — transfer reviewed outputs into the applicable system of record

Material publication remains human-approved in the foundation stage.

## Microsoft deployment boundary

For a Microsoft deployment, Microsoft 365 remains the system of record for Outlook, Teams, SharePoint, OneDrive and approved Office artifacts. Microsoft 365 Copilot may be used for tenant-side retrieval and validation, but it is neither the universal reasoning core nor a hard dependency of the Office Companion.

## Development commands

```text
npm run validate:office
npm run acceptance:office
npm run typecheck
npm test
```

## Current gate

The foundation gate requires:

- Billy ownership and correct Phoenix repository anchors;
- the canonical Drive root, folder and artifact IDs;
- Gemini, Claude and ChatGPT registered as equal first-class targets;
- no permanent provider default;
- fail-closed data and execution policies;
- compile-safe provider-neutral contracts;
- acceptance evidence for routing and data-gate behavior.

The next delivery gate is one sanitized end-to-end workflow using one approved provider adapter, explicit validation and a Microsoft-ready output package. The provider used for that proof does not become the permanent default.
