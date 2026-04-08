import 'server-only'

const LOCAL_ENGINE_URL = 'http://localhost:3000'

function normalizeBaseUrl(value: string) {
  return value.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}

function isManagedProductionRuntime() {
  return (
    process.env.NODE_ENV === 'production' &&
    Boolean(process.env.VERCEL || process.env.RENDER || process.env.RENDER_INSTANCE_ID)
  )
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

  if (isManagedProductionRuntime()) {
    throw new Error(
      'ECOBE_API_URL must be set in production and should point to the Render backend origin.'
    )
  }

  return LOCAL_ENGINE_URL
}
