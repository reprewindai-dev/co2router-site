# CO2 Router Dashboard

## Workspace Map

This workspace is split across four production repos:

- `ecobe-engineclaude`: the canonical engine. Owns routing, replay, proof, adapters, and provider intelligence.
- `co2router-site`: the public-facing website. Owns the marketing site and the interactive CI/CD demo.
- `co2router-site` remote tech checkout: the same site repo on a separate branch for the operator and proof surface.
- `ecobe-mvp`: the remote runtime and proxy. Accepts demo traffic and forwards it to the engine over the private boundary.

This is the public control‑surface UI for CO2 Router. It presents live system
state, recent decisions, trace/replay status, and governance visibility for the
pre‑execution environmental authorization engine.

Public documentation lives in:
`docs/public/` (repository root).

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query

## Environment Variables

```env
NEXT_PUBLIC_ECOBE_API_URL=http://localhost:3000
ECOBE_API_URL=http://localhost:3000
```

## Development

```bash
npm install
npm run dev
```
