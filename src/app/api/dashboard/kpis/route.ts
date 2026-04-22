import { NextResponse } from 'next/server'
import { getServerEngineBaseUrl } from '@/lib/server-engine-url'

export const dynamic = 'force-dynamic'

const ECOBE_ENGINE_URL = getServerEngineBaseUrl()

const ECOBE_ENGINE_API_KEY =
  process.env.DEKES_API_KEY ||
  process.env.ECOBE_API_KEY ||
  process.env.CO2ROUTER_API_KEY

async function fetchFromEngine(path: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (ECOBE_ENGINE_API_KEY) {
    headers.Authorization = `Bearer ${ECOBE_ENGINE_API_KEY}`
  }

  const response = await fetch(`${ECOBE_ENGINE_URL}/api/v1${path}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`CO2 Router engine error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days') || '30'
    const data = await fetchFromEngine(`/dashboard/carbon-ledger-summary?days=${encodeURIComponent(days)}`)
    return NextResponse.json(data)
  } catch (error) {
    console.error('KPIs API error:', error)
    const response = NextResponse.json(
      {
        totalJobsRouted: 0,
        carbonAvoidedPeriodKg: 0,
        carbonReductionMultiplier: null,
        highConfidenceDecisionPct: 0,
        providerDisagreementRatePct: 0,
        degraded: true,
        error: 'Canonical engine unavailable.',
      },
      { status: 200 }
    )
    response.headers.set('x-co2router-degraded', 'engine-unavailable')
    return response
  }
}
