# Phoenix One

Phoenix One is the shared product and engineering platform for Phoenix modules such as Trading and Sports.

## Governance

- Canonical architecture and governance repository: Google Drive
- Canonical source repository: this GitHub repository
- Approval hierarchy: Death Star -> Darth Vader -> Phoenix Executive Office

## Current status

Repository baseline initialized on 2026-07-25.

This repository provides the controlled engineering skeleton for:

- platform core
- PDOS integration
- shared contracts
- modules
- tests
- CI

No production execution, live trading, broker credentials, or uncontrolled external actions are permitted.

## Repository structure

- `docs/` architecture and contract mirrors
- `packages/contracts/` canonical shared contract package
- `src/` implementation source
- `tests/` verification tests
- `.github/workflows/` CI controls

## Source-of-truth rule

Google Drive remains the canonical enterprise architecture and governance repository. Executable source, tests, build configuration and CI evidence live in GitHub. Any architecture-relevant change must remain traceable to an approved Drive artifact.
