# GitHub Actions Secrets

## Purpose

This document defines the enterprise standard for GitHub Actions secrets used by PHOENIX and other connected Operating System repositories.

Repository workflows must use the shared enterprise integration mechanism. Repository-specific secret names, hardcoded credentials, and custom synchronization credentials are not permitted.

## Required secrets

### `DEATH_STAR_SYNC_TOKEN`

**Purpose:** Authenticates GitHub Actions workflows that dispatch standardized repository events to the Death Star enterprise orchestration repository.

**Required for:** Every repository connected to the Death Star synchronization mechanism, including PHOENIX and future Operating System repositories.

**Used by:** `.github/workflows/death-star-issue-sync.yml`

**Configuration location:**

1. Open the repository in GitHub.
2. Go to **Settings**.
3. Open **Secrets and variables**.
4. Open **Actions**.
5. Create a repository secret named exactly `DEATH_STAR_SYNC_TOKEN`.

The secret value is provisioned and maintained administratively outside the repository. Tokens, GitHub Apps, and repository secrets must not be created or committed by repository workflows or source code.

## Responsibility

- **Enterprise platform administration** provisions, rotates, and revokes the credential.
- **Repository administrators** ensure that the required secret exists under the exact enterprise-standard name.
- **Workflow maintainers** reference only `secrets.DEATH_STAR_SYNC_TOKEN` and must not introduce aliases, fallback names, embedded credentials, or repository-specific alternatives.
- **Repository contributors** must never place secret values in source code, workflow files, documentation, logs, issues, or pull requests.

## Enterprise standard

All current and future repository-to-Death-Star workflows must:

- use the secret name `DEATH_STAR_SYNC_TOKEN`;
- communicate through the approved enterprise synchronization mechanism;
- fail safely and clearly when the secret is unavailable;
- avoid hardcoded credentials and repository-specific authentication variants;
- keep the target repository and event contract configurable independently from the credential;
- preserve the Death Star as the orchestration and synchronization boundary.

This standard applies consistently across repositories such as `phoenix`, `death-star`, `forstner`, `pactley`, `ashborne`, `moosburger`, and any subsequently onboarded Operating System repository.

## Onboarding new repositories

Before enabling a Death Star synchronization workflow in a new repository:

1. Install or copy the approved enterprise workflow implementation.
2. Verify that it references only `secrets.DEATH_STAR_SYNC_TOKEN` for outbound authentication.
3. Configure the repository secret administratively under the exact required name.
4. Confirm that no token value, alternate secret name, or repository-specific credential is present in the repository.
5. Trigger a controlled test event and verify successful dispatch to the Death Star.
6. Record the repository in the applicable enterprise governance and orchestration registry.

A repository is not operationally ready for Death Star synchronization until the administrative secret rollout is complete.