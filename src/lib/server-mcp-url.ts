import 'server-only'

const LOCAL_MCP_URL = 'http://localhost:3000'

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, '')
}

function isProductionBuild() {
  return process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build'
}

export function getServerMcpBaseUrl() {
  const configuredUrl =
    process.env.MCP_API_URL ||
    process.env.CO2ROUTER_MCP_URL ||
    process.env.NEXT_PUBLIC_MCP_API_URL ||
    null

  if (configuredUrl && configuredUrl.trim().length > 0) {
    return normalizeBaseUrl(configuredUrl)
  }

  if (isProductionBuild()) {
    return LOCAL_MCP_URL
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MCP base URL must be set in production and should point to ecobe-mvp.')
  }

  return LOCAL_MCP_URL
}
