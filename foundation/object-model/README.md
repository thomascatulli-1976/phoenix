# Phoenix Universal Object Foundation

Status: G4 IMPLEMENTATION BASELINE
Architecture: PHX-OBJ-001, PHX-ID-001, PHX-TYPE-001, PHX-REL-001, PHX-META-001, PHX-REG-001, PHX-REG-SVC-001, PHX-REF-001

## Scope

This package contains the first machine-readable implementation contracts for the Phoenix One Universal Object Foundation.

## Structure

- `schemas/` canonical JSON Schemas
- `registry/` seed registry records
- `examples/valid/` conforming fixtures
- `examples/invalid/` deliberately invalid fixtures
- `scripts/` validation tooling
- `.github/workflows/` CI conformance gate

## Rules

1. Drive architecture documents govern meaning.
2. GitHub schemas govern implementation shape.
3. A schema change that alters meaning requires an approved ADR.
4. Major versions are stored side-by-side.
5. All fixtures must be validated in CI.
6. Unknown top-level fields are rejected; governed extensions belong under `extensions`.

## Current maturity

This package establishes G4/M3 readiness for the foundation contracts. It does not yet constitute a production registry service or runtime implementation.
