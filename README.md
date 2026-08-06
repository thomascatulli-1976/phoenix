# Phoenix One

Phoenix One is the shared product and engineering platform for Phoenix modules such as Trading and Sports.

## Governance

- Canonical architecture and governance repository: Google Drive
- Canonical source repository: this GitHub repository
- Approval hierarchy: Death Star -> Darth Vader -> Billy (Phoenix Executive Office)
- Phoenix Executive Office: **Billy**
- Billy is not a Companion; Companions are developed within Phoenix.
- Machine-readable appointment: [`config/executive-office.json`](config/executive-office.json)
- Binding mandate: [`governance/PHX-GOV-006-Billy-Executive-Office.md`](governance/PHX-GOV-006-Billy-Executive-Office.md)

## Billy product responsibility

Billy owns coordinated active development for:

- Phoenix Trading
- Phoenix Sports
- Phoenix Hockey
- Phoenix Family
- Phoenix Thermomix & Cooking
- Signal Cockpit

The CI workflow [`billy-governance.yml`](.github/workflows/billy-governance.yml) verifies the appointment, command chain, product ownership, synchronization target and fail-closed execution policy.

## Current status

Repository baseline initialized on 2026-07-25. Billy EO governance was implemented on 2026-08-06.

This repository provides the controlled engineering skeleton for:

- platform core
- PDOS integration
- shared contracts
- modules
- tests
- CI

No production execution, live trading, broker credentials, or uncontrolled external actions are permitted. Billy coordinates development and governance; consequential external execution requires separate approval, credentials, testing and audit evidence.

## Repository structure

- `docs/` architecture and contract mirrors
- `governance/` binding Phoenix governance decisions
- `config/` machine-readable operating configuration
- `packages/contracts/` canonical shared contract package
- `src/` implementation source
- `tests/` verification tests
- `.github/workflows/` CI and synchronization controls

## GitHub Actions Setup

The Death Star issue synchronization workflow requires the repository secret:

```text
DEATH_STAR_SYNC_TOKEN
```

Create the secret administratively in GitHub under:

**Settings -> Secrets and variables -> Actions**

The workflow must reference only `secrets.DEATH_STAR_SYNC_TOKEN`. Do not use alternate secret names, hardcoded credentials, or repository-specific synchronization tokens.

The credential itself is provisioned and maintained outside this repository. See [`docs/architecture/github-secrets.md`](docs/architecture/github-secrets.md) for the enterprise standard, responsibilities, and onboarding guidance.

## Source-of-truth rule

Google Drive remains the canonical enterprise architecture and governance repository. Executable source, tests, build configuration and CI evidence live in GitHub. Any architecture-relevant change must remain traceable to an approved Drive artifact.
