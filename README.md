# CO2 Router Site

This is the public product site for CO2 Router and HalOGrid. It presents the
public doctrine, pricing, access path, and live operator-facing surfaces for
the pre-execution environmental authorization engine.

Public documentation lives in:
`docs/public/` (repository root).

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query

## Environment Variables

```env
NEXT_PUBLIC_ECOBE_API_URL=/api/ecobe
ECOBE_API_URL=http://localhost:3000
```

## Development

```bash
npm install
npm run dev
```
