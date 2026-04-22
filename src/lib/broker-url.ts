export function getBrokerBaseUrl() {
  const raw =
    process.env.MCP_API_URL ||
    process.env.ECOBE_API_URL ||
    process.env.NEXT_PUBLIC_MCP_API_URL ||
    process.env.NEXT_PUBLIC_ECOBE_API_URL ||
    process.env.ECOBE_MVP_URL ||
    ''

  return String(raw).trim().replace(/\/$/, '')
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
