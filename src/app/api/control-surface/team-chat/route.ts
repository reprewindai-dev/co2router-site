import { NextRequest, NextResponse } from 'next/server'

import { recordDashboardMetric } from '@/lib/observability/telemetry'
import { appendTeamMessage, listTeamMessages } from '@/lib/team-chat-store'

export const dynamic = 'force-dynamic'

const routeMetricNames = {
  durationMs: 'co2router.dashboard.team-chat.route.duration.ms',
  errorCount: 'co2router.dashboard.team-chat.route.error.count',
  postCount: 'co2router.dashboard.team-chat.post.count',
} as const

const CHAT_WINDOW_MS = 5 * 60 * 1000
const CHAT_MAX_POSTS = 40
const chatBuckets = new Map<string, { count: number; resetAt: number }>()

function sanitizeLooseText(value: unknown, max = 48) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, max)
}

function takeChatRateLimitToken(key: string) {
  const now = Date.now()
  const current = chatBuckets.get(key)

  if (!current || current.resetAt <= now) {
    chatBuckets.set(key, {
      count: 1,
      resetAt: now + CHAT_WINDOW_MS,
    })
    return {
      allowed: true,
      retryAfterSec: Math.ceil(CHAT_WINDOW_MS / 1000),
    }
  }

  if (current.count >= CHAT_MAX_POSTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  chatBuckets.set(key, current)
  return {
    allowed: true,
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}

export async function GET(request: NextRequest) {
  const startedAt = performance.now()
  try {
    const teamId = sanitizeLooseText(request.nextUrl.searchParams.get('teamId') ?? 'co2-router-ops')
    const limitValue = Number(request.nextUrl.searchParams.get('limit') ?? '80')
    const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(100, Math.round(limitValue))) : 80
    const snapshot = await listTeamMessages(teamId, limit)
    const totalMs = performance.now() - startedAt

    recordDashboardMetric(routeMetricNames.durationMs, 'histogram', totalMs, {
      method: 'GET',
      teamId: snapshot.teamId,
    })

    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    recordDashboardMetric(routeMetricNames.errorCount, 'counter', 1, {
      method: 'GET',
    })
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load team chat',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now()
  try {
    const body = (await request.json()) as Record<string, unknown>
    const teamId = sanitizeLooseText(body.teamId)
    const operatorId = sanitizeLooseText(body.operatorId)
    const operatorName = sanitizeLooseText(body.operatorName)
    const messageBody = sanitizeLooseText(body.body, 600)

    if (!teamId || !operatorId || !operatorName || !messageBody) {
      return NextResponse.json(
        { error: 'teamId, operatorId, operatorName, and body are required' },
        { status: 400 },
      )
    }

    const rateLimit = takeChatRateLimitToken(`team-chat:${teamId}:${operatorId}`)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterSec: rateLimit.retryAfterSec },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSec),
          },
        },
      )
    }

    const message = await appendTeamMessage({
      teamId,
      operatorId,
      operatorName,
      body: messageBody,
    })
    const totalMs = performance.now() - startedAt

    recordDashboardMetric(routeMetricNames.durationMs, 'histogram', totalMs, {
      method: 'POST',
      teamId: message.teamId,
    })
    recordDashboardMetric(routeMetricNames.postCount, 'counter', 1, {
      teamId: message.teamId,
    })

    return NextResponse.json(
      {
        message,
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    recordDashboardMetric(routeMetricNames.errorCount, 'counter', 1, {
      method: 'POST',
    })
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to post team chat message',
      },
      { status: 500 },
    )
  }
}
