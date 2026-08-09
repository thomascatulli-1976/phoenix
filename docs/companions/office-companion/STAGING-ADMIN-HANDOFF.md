# PHX-COMP-OFFICE-007 — Staging Administration Handoff

**Status:** External prerequisites required  
**Executive Office:** Billy  
**Canonical Drive artifact:** `PHX-COMP-OFFICE-007`  
**GitHub environment:** `office-companion-staging`  
**Live proof:** Not executed

This repository already contains the Azure Container Apps staging infrastructure, the manual OIDC deployment workflow and the GREEN-data evidence runner. A live deployment remains blocked until an authorized administrator completes the following handoff.

## GitHub environment

Create and protect `office-companion-staging` with at least one required human reviewer.

Environment secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Environment variables:

```text
OFFICE_STAGING_RESOURCE_GROUP
OFFICE_STAGING_LOCATION
OFFICE_STAGING_NAME_PREFIX
OFFICE_STAGING_ACR_NAME
OFFICE_STAGING_KEY_VAULT_SUBSCRIPTION_ID
OFFICE_STAGING_KEY_VAULT_RESOURCE_GROUP
OFFICE_STAGING_KEY_VAULT_NAME
OFFICE_STAGING_GEMINI_MODEL
OFFICE_STAGING_GEMINI_SECRET_NAME
OFFICE_STAGING_CLAUDE_MODEL
OFFICE_STAGING_CLAUDE_SECRET_NAME
OFFICE_STAGING_OPENAI_MODEL
OFFICE_STAGING_OPENAI_SECRET_NAME
```

Only provider secret names belong in GitHub variables. Provider API-key values remain in Azure Key Vault.

## OIDC trust

Use:

```text
Issuer: https://token.actions.githubusercontent.com
Audience: api://AzureADTokenExchange
Environment: office-companion-staging
```

Expected immutable subject for this repository:

```text
repo:thomascatulli-1976@300130643/phoenix@1307927751:environment:office-companion-staging
```

The Azure administrator must verify the repository's active GitHub OIDC subject before creating the federated credential. Use the actual configured subject if the repository has a custom or legacy claim template.

## Azure permissions

The deployment identity needs resource-deployment rights in the staging resource group and `Microsoft.Authorization/roleAssignments/write` at the scopes where the Bicep assigns:

- `AcrPull` to the runtime managed identity;
- `Key Vault Secrets User` to the runtime managed identity.

Use the organization's approved least-privilege role combination. Do not use a stored Azure client secret in GitHub.

## Key Vault

Create or identify enabled secrets for the selected providers:

- Gemini API key;
- Anthropic API key;
- OpenAI API key.

The runtime accesses them through versionless Key Vault references and a user-assigned managed identity. Never place secret values in repository files, workflow inputs, screenshots, issue comments or evidence artifacts.

## Run the staging proof

Open the manual workflow:

```text
Phoenix Office Companion Staging
```

Set:

```text
confirm_deploy = DEPLOY
enabled_providers = gemini,claude,chatgpt
```

The workflow deploys the reviewed Git-SHA image, verifies `/health` and `/ready`, and executes the same synthetic GREEN task separately for Gemini, Claude and ChatGPT with fallback disabled.

## Evidence review

The workflow artifact must show for each provider:

- successful explicit provider selection;
- `Draft / Review Candidate`;
- `Microsoft Word / SharePoint` target;
- `validationState: unvalidated`;
- `humanReviewRequired: true`;
- `autonomousPublication: false`;
- `sensitivity: GREEN`;
- no blocking schema, governance or evidence failure;
- no credentials or sensitive data.

Evidence does not automatically update routing scores. Billy or a delegated reviewer must record `PASS`, `PASS WITH CONDITIONS` or `REJECTED` before any promotion.

## Boundary

This handoff grants no production authority and no Microsoft Graph authority. RED data, unapproved YELLOW data, SharePoint writes, Outlook or Teams sending and autonomous publication remain disabled.
