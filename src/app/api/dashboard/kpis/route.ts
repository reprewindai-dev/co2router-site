import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MCP_BROKER_URL = process.env.MCP_API_URL || process.env.ECOBE_MVP_URL || ''

const MCP_BROKER_API_KEY =
  process.env.DEKES_API_KEY ||
  process.env.ECOBE_API_KEY ||
  process.env.CO2ROUTER_API_KEY

async function fetchFromMcpBroker(path: string) {
  if (!MCP_BROKER_URL) {
    throw new Error('MCP broker is not configured')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (MCP_BROKER_API_KEY) {
    headers.Authorization = `Bearer ${MCP_BROKER_API_KEY}`
  }

  const response = await fetch(`${MCP_BROKER_URL}/api/v1${path}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`MCP broker upstream error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days') || '30'
    const data = await fetchFromMcpBroker(`/dashboard/carbon-ledger-summary?days=${encodeURIComponent(days)}`)
    return NextResponse.json(data)
  } catch (error) {
    console.error('KPIs API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch KPI data' },
      { status: 500 }
    )
  }
}
