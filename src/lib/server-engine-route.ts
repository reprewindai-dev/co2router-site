import 'server-only'

import { NextResponse } from 'next/server'
import { getServerMcpBaseUrl } from '@/lib/server-mcp-url'

type CanonicalEngineRequestInit = RequestInit & {
  internal?: boolean
}

function getInternalApiKey() {
  return process.env.MCP_INTERNAL_API_KEY || process.env.ECOBE_INTERNAL_API_KEY || process.env.CO2ROUTER_INTERNAL_API_KEY || null
}

function getTrustedBrokerId() {
  return process.env.ECOBE_TRUSTED_BROKER_ID || 'ecobe-mvp'
}

function normalizePath(path: string) {
  if (!path.startsWith('/')) return `/${path}`
  return path
}

async function fetchCanonicalEngineJson(path: string, init: CanonicalEngineRequestInit = {}) {
  const { internal = false, headers: initHeaders, ...requestInit } = init
  const headers = new Headers(initHeaders)
  headers.set('accept', 'application/json')

  if (internal) {
    const token = getInternalApiKey()
    if (!token) {
      throw new Error('ECOBE_INTERNAL_API_KEY must be set for internal canonical engine routes.')
    }
    headers.set('authorization', `Bearer ${token}`)
    headers.set('x-ecobe-internal-key', token)
    headers.set('x-api-key', token)
    headers.set('x-ecobe-broker-id', getTrustedBrokerId())
  }

  const response = await fetch(`${getServerMcpBaseUrl()}${normalizePath(path)}`, {
    ...requestInit,
    headers,
    cache: 'no-store',
  })

  const raw = await response.text()
  const payload = raw.length > 0 ? safeParseJson(raw) : {}

  return {
    status: response.status,
    payload,
  }
}

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return {
      error: raw,
    }
  }
}

export async function proxyCanonicalEngineJson(
  path: string,
  init?: CanonicalEngineRequestInit
) {
  try {
    const upstream = await fetchCanonicalEngineJson(path, init)
    return NextResponse.json(upstream.payload, {
      status: upstream.status,
      headers: {
        'x-co2router-engine-origin': getServerMcpBaseUrl(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Canonical engine request failed.',
      },
      { status: 500 }
    )
  }
}

export function createCanonicalRoute(path: string, init?: CanonicalEngineRequestInit) {
  return async function GET() {
    return proxyCanonicalEngineJson(path, init)
  }
}
