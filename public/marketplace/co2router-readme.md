# CO2 Router Package

CO2 Router is a pre-execution control plane for cloud and AI workload placement.
It decides whether a workload should run now, reroute, delay, throttle, or deny
before execution, then attaches proof posture to the decision frame.

## Production Endpoints

- Site: https://co2router.com
- Console: https://co2router.com/live
- Broker API: https://api.co2router.com
- MCP manifest: https://mcp.co2router.com/mcp
- x402 gateway: https://x402.co2router.com
- Package manifest: https://co2router.com/marketplace/co2router.manifest.json

## Runtime Boundary

Browser and marketplace clients must call the public site, broker, MCP, or x402
gateway only. Private engine hostnames, database URLs, Redis URLs, provider
keys, and internal API keys are never part of this package.

```text
Marketplace or agent
  -> co2router.com / mcp.co2router.com / x402.co2router.com
  -> api.co2router.com broker
  -> internal ecobe-engineclaude engine
  -> database, Redis, provider mirrors, proof posture
```

## Decision Contract

Primary workload authorization route:

```http
POST https://api.co2router.com/api/v1/ci/authorize
content-type: application/json
```

The response returns one binding action:

- `run_now`
- `reroute`
- `delay`
- `throttle`
- `deny`

The response also carries selected region, reason code, source posture,
confidence, trace posture, and proof hash when available.

## Route Signal Policy

CO2 Router only promotes a route to active when a source-backed sample is
current and stored. Structural baselines remain fallback/baseline. Stale public
operator feeds are not promoted as live routes.

Current source classes include:

- EIA-930 direct US balancing-authority fuel mix
- GB Carbon Intensity API
- Denmark Energi Data Service
- France RTE eCO2mix through ODRE
- Ontario IESO generator output
- Hydro-Quebec open data

Configured but key-gated source classes:

- Fingrid Finland API

## x402 Agent Access

Agent-facing paid access is exposed through `https://x402.co2router.com`.

Initial paid routes:

- `POST /x402/v1/authorize`
- `POST /x402/v1/route`
- `GET /x402/v1/proof/:frameId`
- `GET /x402/v1/intelligence/grid/summary`
- `GET /x402/v1/intelligence/grid/region/:region`
- `POST /x402/v1/compliance/report`

The broker service must define a public Base-compatible payout wallet in
`CO2ROUTER_PAY_TO` before x402 paid routes can settle.

## Pricing

Founding customer pricing:

- Pilot: $250/month
- Validation: $750/month
- Operator: $1,500/month
- Governance: $3,500/month
- Assurance: custom

Pricing is based on controlled workload paths, decision volume, proof depth,
and governance requirements, not seats.

## Install Requirements

Runtime services:

- `co2router-site`
- `ecobe-mvp` broker
- `ecobe-engineclaude` engine
- Postgres
- Redis
- Forecast and route refresh workers

Required environment variables are listed in the JSON manifest. The package does
not include secrets.
