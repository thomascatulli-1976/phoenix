# Phoenix Office Companion staging infrastructure

This directory implements `PHX-COMP-OFFICE-006` without provisioning resources during pull-request validation.

## Components

- Azure Container Registry with the admin user disabled
- user-assigned managed identity for runtime access
- Log Analytics workspace
- Azure Container Apps managed environment
- optional Office Companion Container App revision
- `AcrPull` role assignment on the registry
- `Key Vault Secrets User` role assignment on an existing approved Key Vault
- versionless Key Vault secret references for provider API keys
- startup, liveness and readiness probes

## Deployment sequence

The manual staging workflow deploys the same Bicep file twice:

1. foundation-only deployment with `deployContainerApp=false`;
2. Git-SHA-tagged image build in Azure Container Registry;
3. application deployment with `deployContainerApp=true` and the immutable image reference.

The two-stage sequence prevents a Container App revision from referencing an image that does not yet exist.

## Identity and secrets

GitHub authenticates to Azure through OIDC. The runtime uses a separate user-assigned managed identity. Provider secret values never enter GitHub workflow inputs or Bicep parameters; only Key Vault secret names are passed.

The runtime identity receives:

- `AcrPull` on the staging registry;
- `Key Vault Secrets User` on the approved Key Vault.

## Required GitHub environment

Create a protected environment named `office-companion-staging` and require a human reviewer.

Environment secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Environment variables:

- `OFFICE_STAGING_RESOURCE_GROUP`
- `OFFICE_STAGING_LOCATION`
- `OFFICE_STAGING_NAME_PREFIX`
- `OFFICE_STAGING_ACR_NAME`
- `OFFICE_STAGING_KEY_VAULT_SUBSCRIPTION_ID` (optional when the Key Vault uses the deployment subscription)
- `OFFICE_STAGING_KEY_VAULT_RESOURCE_GROUP`
- `OFFICE_STAGING_KEY_VAULT_NAME`
- `OFFICE_STAGING_GEMINI_MODEL`
- `OFFICE_STAGING_GEMINI_SECRET_NAME`
- `OFFICE_STAGING_CLAUDE_MODEL`
- `OFFICE_STAGING_CLAUDE_SECRET_NAME`
- `OFFICE_STAGING_OPENAI_MODEL`
- `OFFICE_STAGING_OPENAI_SECRET_NAME`

Provider model and secret-name variables are required only for providers selected in the manual workflow.

## Safety boundary

This infrastructure exposes the staging API over HTTPS for controlled proof execution. It does not configure Microsoft Graph, SharePoint, Outlook or Teams permissions. It accepts no provider key values as deployment parameters and makes no production claim.
