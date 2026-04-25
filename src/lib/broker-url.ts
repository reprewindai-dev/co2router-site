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

export function getBrokerHost() {
  const baseUrl = getBrokerBaseUrl()
  if (!baseUrl) return null

  try {
    return new URL(baseUrl).host
  } catch {
    return null
  }
}
