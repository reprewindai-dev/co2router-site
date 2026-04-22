import 'server-only'

const LOCAL_ENGINE_URL = 'http://localhost:3000'

function normalizeBaseUrl(value: string) {
  return value.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}

function isProductionBuild() {
  return process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build'
}

export function getServerEngineBaseUrl() {
  const configuredUrl =
    process.env.ECOBE_API_URL ||
    process.env.CO2ROUTER_API_URL ||
    process.env.ENGINE_BASE_URL ||
    null

  if (configuredUrl && configuredUrl.trim().length > 0) {
    return normalizeBaseUrl(configuredUrl)
  }

  if (isProductionBuild()) {
    return LOCAL_ENGINE_URL
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Engine base URL must be set in production and should point to the canonical CO2 Router engine origin.'
    )
  }

  return LOCAL_ENGINE_URL
}
