# PHX-GOV-005 Repository Context Policy v1.0

Status: APPROVED

## Purpose
Defines the permanent repository context for Phoenix.

## Canonical Anchors
Drive Folder ID: 18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg
GitHub Repository: thomascatulli-1976/phoenix

## Principles
- Repository context is implicit.
- Drive is the business source of truth.
- GitHub is the implementation source.
- Every persistence operation must be verified.
- Repository changes require governance approval.

## Runtime
All Phoenix agents shall preload these anchors before executing work and shall not request them again from the user unless a repository migration is requested.

## Persistence Workflow
Develop -> Persist -> Verify -> Report.

## Reporting
Every save reports artifact, target, identifier and verification result.

## Future
This policy is the basis for the Phoenix Enterprise Repository Agent (PERA).
