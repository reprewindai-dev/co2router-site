import { NextResponse } from 'next/server'
import { getBrokerHost } from '@/lib/broker-url'

function pickBuildCommit() {
  const raw =
    process.env.RENDER_GIT_COMMIT ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.SOURCE_VERSION ??
    process.env.GIT_COMMIT_SHA ??
    null

  if (!raw) return null
  const value = String(raw).trim()
  return value.length > 12 ? value.slice(0, 12) : value
}

function pickBuildVersion() {
  return (
    process.env.RENDER_GIT_BRANCH ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    process.env.NODE_ENV ??
    'unknown'
  )
}

function pickMcpBrokerHost() {
  return getBrokerHost()
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ecobe-dashboard',
    timestamp: new Date().toISOString(),
    build: {
      commit: pickBuildCommit(),
      version: pickBuildVersion(),
    },
    routing: {
      ecobeProxyBase: '/api/ecobe',
      analyticsRoute: '/api/analytics/baseline',
      mcpHost: pickMcpBrokerHost(),
    },
  })
}
