import { proxyCanonicalEngineJson } from '@/lib/server-engine-route'

export const dynamic = 'force-dynamic'

export async function GET() {
  return proxyCanonicalEngineJson('/api/v1/dashboard/methodology/providers', {
    internal: true,
  })
}
