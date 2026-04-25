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

export function getInternalApiKey() {
  const value =
    process.env.MCP_INTERNAL_API_KEY ||
    process.env.ECOBE_INTERNAL_API_KEY ||
    process.env.CO2ROUTER_INTERNAL_API_KEY ||
    null

  return normalizeEnvValue(value) || null
}

export function getOperatorKey() {
  return (
    normalizeEnvValue(process.env.CO2ROUTER_OPERATOR_KEY) ||
    normalizeEnvValue(process.env.ECOBE_OPERATOR_KEY) ||
    getInternalApiKey()
  )
}
