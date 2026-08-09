targetScope = 'resourceGroup'

@description('Azure region for the Office Companion staging resources.')
param location string = resourceGroup().location

@description('Short lowercase prefix used for staging resource names.')
@minLength(3)
@maxLength(20)
param namePrefix string

@description('Globally unique Azure Container Registry name.')
@minLength(5)
@maxLength(50)
param acrName string

@description('Immutable container image reference, normally tagged with the Git commit SHA.')
param containerImage string = ''

@description('Deploy the Container App revision after the image is available.')
param deployContainerApp bool = false

@description('Explicit canonical provider allowlist: gemini, claude and/or chatgpt.')
param enabledProviders array = []

@description('Subscription containing the approved staging Key Vault.')
param keyVaultSubscriptionId string

@description('Resource group containing the approved staging Key Vault.')
param keyVaultResourceGroupName string

@description('Existing approved staging Key Vault name.')
param keyVaultName string

@description('Gemini model identifier. Required only when Gemini is enabled.')
param geminiModel string = ''

@description('Key Vault secret name holding the Gemini API key.')
param geminiSecretName string = ''

@description('Claude model identifier. Required only when Claude is enabled.')
param claudeModel string = ''

@description('Key Vault secret name holding the Anthropic API key.')
param claudeSecretName string = ''

@description('ChatGPT/OpenAI model identifier. Required only when ChatGPT is enabled.')
param openAiModel string = ''

@description('Key Vault secret name holding the OpenAI API key.')
param openAiSecretName string = ''

param geminiApiBaseUrl string = 'https://generativelanguage.googleapis.com/v1beta'
param claudeApiBaseUrl string = 'https://api.anthropic.com/v1'
param openAiApiBaseUrl string = 'https://api.openai.com/v1'
param anthropicVersion string = '2023-06-01'
param providerTimeoutMs string = '60000'

@minValue(0)
@maxValue(3)
param minReplicas int = 0

@minValue(1)
@maxValue(5)
param maxReplicas int = 1

var containerAppName = '${namePrefix}-office'
var managedEnvironmentName = '${namePrefix}-env'
var logAnalyticsName = '${namePrefix}-logs'
var runtimeIdentityName = '${namePrefix}-runtime'
var enabledProvidersCsv = join(enabledProviders, ',')
var liveProviderEnabled = length(enabledProviders) > 0
var acrPullRoleDefinitionId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var keyVaultSecretsUserRoleDefinitionId = '4633458b-17de-408a-b874-0445c86b69e6'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
  sku: {
    name: 'PerGB2018'
  }
}

resource managedEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: managedEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: listKeys(logAnalytics.id, logAnalytics.apiVersion).primarySharedKey
      }
    }
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource runtimeIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: runtimeIdentityName
  location: location
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  scope: resourceGroup(keyVaultSubscriptionId, keyVaultResourceGroupName)
  name: keyVaultName
}

resource registryPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, runtimeIdentity.id, acrPullRoleDefinitionId)
  scope: registry
  properties: {
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleDefinitionId)
  }
}

resource keyVaultSecretsAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, runtimeIdentity.id, keyVaultSecretsUserRoleDefinitionId)
  scope: keyVault
  properties: {
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      keyVaultSubscriptionId,
      'Microsoft.Authorization/roleDefinitions',
      keyVaultSecretsUserRoleDefinitionId
    )
  }
}

var providerSecrets = concat(
  contains(enabledProviders, 'gemini') ? [
    {
      name: 'gemini-api-key'
      keyVaultUrl: '${keyVault.properties.vaultUri}secrets/${geminiSecretName}'
      identity: runtimeIdentity.id
    }
  ] : [],
  contains(enabledProviders, 'claude') ? [
    {
      name: 'anthropic-api-key'
      keyVaultUrl: '${keyVault.properties.vaultUri}secrets/${claudeSecretName}'
      identity: runtimeIdentity.id
    }
  ] : [],
  contains(enabledProviders, 'chatgpt') ? [
    {
      name: 'openai-api-key'
      keyVaultUrl: '${keyVault.properties.vaultUri}secrets/${openAiSecretName}'
      identity: runtimeIdentity.id
    }
  ] : []
)

var providerEnvironment = concat(
  [
    {
      name: 'NODE_ENV'
      value: 'production'
    }
    {
      name: 'PORT'
      value: '8080'
    }
    {
      name: 'OFFICE_COMPANION_ENABLE_LIVE_PROVIDER'
      value: liveProviderEnabled ? 'true' : 'false'
    }
    {
      name: 'OFFICE_COMPANION_ENABLED_PROVIDERS'
      value: enabledProvidersCsv
    }
  ],
  contains(enabledProviders, 'gemini') ? [
    {
      name: 'GEMINI_API_KEY'
      secretRef: 'gemini-api-key'
    }
    {
      name: 'GEMINI_MODEL'
      value: geminiModel
    }
    {
      name: 'GEMINI_API_BASE_URL'
      value: geminiApiBaseUrl
    }
    {
      name: 'GEMINI_TIMEOUT_MS'
      value: providerTimeoutMs
    }
  ] : [],
  contains(enabledProviders, 'claude') ? [
    {
      name: 'ANTHROPIC_API_KEY'
      secretRef: 'anthropic-api-key'
    }
    {
      name: 'CLAUDE_MODEL'
      value: claudeModel
    }
    {
      name: 'CLAUDE_API_BASE_URL'
      value: claudeApiBaseUrl
    }
    {
      name: 'CLAUDE_TIMEOUT_MS'
      value: providerTimeoutMs
    }
    {
      name: 'ANTHROPIC_VERSION'
      value: anthropicVersion
    }
  ] : [],
  contains(enabledProviders, 'chatgpt') ? [
    {
      name: 'OPENAI_API_KEY'
      secretRef: 'openai-api-key'
    }
    {
      name: 'OPENAI_MODEL'
      value: openAiModel
    }
    {
      name: 'OPENAI_API_BASE_URL'
      value: openAiApiBaseUrl
    }
    {
      name: 'OPENAI_TIMEOUT_MS'
      value: providerTimeoutMs
    }
  ] : []
)

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = if (deployContainerApp) {
  name: containerAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${runtimeIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: runtimeIdentity.id
        }
      ]
      secrets: providerSecrets
    }
    template: {
      containers: [
        {
          name: 'office-companion'
          image: containerImage
          env: providerEnvironment
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/health'
                port: 8080
                scheme: 'HTTP'
              }
              initialDelaySeconds: 2
              periodSeconds: 5
              timeoutSeconds: 3
              failureThreshold: 30
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8080
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/ready'
                port: 8080
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 6
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
  dependsOn: [
    registryPullAssignment
    keyVaultSecretsAssignment
  ]
}

output registryName string = registry.name
output registryLoginServer string = registry.properties.loginServer
output managedEnvironmentName string = managedEnvironment.name
output runtimeIdentityResourceId string = runtimeIdentity.id
output containerAppName string = containerAppName
output deploymentMode string = deployContainerApp ? 'application-revision' : 'foundation-only'
