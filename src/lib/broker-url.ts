function normalizeEnvValue(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function normalizeAbsoluteUrl(value: string | null | undefined) {
  const normalized = normalizeEnvValue(value).replace(/\/$/, '')
  if (!normalized) return ''
  return /^https?:\/\//i.test(normalized) ? normalized : ''
}

export function getBrokerBaseUrl() {
  const raw =
    process.env.ECOBE_API_URL ||
    process.env.MCP_API_URL ||
    process.env.NEXT_PUBLIC_MCP_API_URL ||
    process.env.ECOBE_MVP_URL ||
    process.env.NEXT_PUBLIC_ECOBE_API_URL ||
    ''

  return normalizeEnvValue(raw).replace(/\/$/, '')
}

export function getServerBrokerBaseUrl() {
  const directEngineBase =
    normalizeAbsoluteUrl(process.env.ECOBE_API_URL) ||
    normalizeAbsoluteUrl(process.env.MCP_API_URL) ||
    normalizeAbsoluteUrl(process.env.ECOBE_MVP_URL)

  if (directEngineBase) {
    return directEngineBase
  }

  const browserBase = getBrokerBaseUrl()
  if (/^https?:\/\//i.test(browserBase)) {
    return browserBase
  }

  return 'https://co2router.tech'
}

export function getBrokerHost() {
  const baseUrl =
    typeof window === 'undefined' ? getServerBrokerBaseUrl() : getBrokerBaseUrl()
  if (!baseUrl) return null

  try {
    return new URL(baseUrl).host
  } catch {
    return null
  }
}
