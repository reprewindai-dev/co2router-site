export function getInternalApiKey() {
  return (
    process.env.MCP_INTERNAL_API_KEY ||
    process.env.ECOBE_INTERNAL_API_KEY ||
    process.env.CO2ROUTER_INTERNAL_API_KEY ||
    null
  )
}

export function getOperatorKey() {
  return process.env.CO2ROUTER_OPERATOR_KEY || process.env.ECOBE_OPERATOR_KEY || getInternalApiKey()
}
