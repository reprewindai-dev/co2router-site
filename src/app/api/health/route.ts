import { proxyCanonicalEngineJson } from '@/lib/server-engine-route'

export const dynamic = 'force-dynamic'

export async function GET() {
  return proxyCanonicalEngineJson('/health')
}
