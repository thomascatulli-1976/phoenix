# PHX-REP-001 — Phoenix One Canonical Repository Policy v1.0

**Status:** Active  
**Approval Authority:** Phoenix One Architecture Governance  
**Effective Date:** 2026-07-25

## Canonical repositories

- Documentation: `https://drive.google.com/drive/folders/18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg`
- Implementation: `thomascatulli-1976/phoenix`

## Mandatory rule

Every Phoenix artifact must be created, stored, versioned and verified relative to the canonical Drive root. Source code, schemas, tests and machine-readable contracts must also be persisted in GitHub.

## Persistence workflow

1. Create or update the artifact.
2. Store it in the correct canonical Drive folder.
3. Mirror implementation-relevant content in GitHub.
4. Update the master artifact registry.
5. Update relationships and synchronization state.
6. Read back and verify both repositories.
7. Report only operations that actually succeeded.

## Prohibited practices

- Parallel Phoenix root repositories
- Unverified persistence claims
- Approved artifacts left in personal or temporary locations
- Silent divergence between Drive and GitHub
- Overwriting final artifacts without version control
- Moving or deleting artifacts without traceability

## Canonical identifier

- Repository ID: `18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg`
- Role: `PHOENIX_CANONICAL_DOCUMENTATION_REPOSITORY`
- Status: `ACTIVE`
