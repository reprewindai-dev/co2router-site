import crypto from 'crypto'
import { NextResponse } from 'next/server'

import { getOperatorKey } from '@/lib/internal-api-key'

function getExpectedOperatorKey() {
  return getOperatorKey()
}

function getPresentedOperatorKey(request: Request) {
  const explicitHeader =
    request.headers.get('x-co2router-operator-key') || request.headers.get('x-operator-key')
  if (explicitHeader && explicitHeader.trim().length > 0) return explicitHeader.trim()

  const auth = request.headers.get('authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim()
    if (token.length > 0) return token
  }

  const cookie = request.headers.get('cookie')
  if (!cookie) return null

  for (const segment of cookie.split(';')) {
    const [rawName, ...rest] = segment.trim().split('=')
    if (rawName !== 'co2router_operator_key') continue
    const value = rest.join('=').trim()
    if (value.length > 0) return decodeURIComponent(value)
  }

  return null
}

function matches(expected: string, presented: string) {
  const expectedBuffer = Buffer.from(expected)
  const presentedBuffer = Buffer.from(presented)
  if (expectedBuffer.length !== presentedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, presentedBuffer)
}

export function requireControlSurfaceOperator(request: Request) {
  const expected = getExpectedOperatorKey()
  if (!expected) {
    return NextResponse.json(
      {
        error: 'Control-surface operator access is not configured.',
      },
      {
        status: 503,
        headers: {
          'cache-control': 'no-store',
        },
      },
    )
  }

  const presented = getPresentedOperatorKey(request)
  if (!presented || !matches(expected, presented)) {
    return NextResponse.json(
      {
        error: 'Operator authorization required.',
      },
      {
        status: 401,
        headers: {
          'cache-control': 'no-store',
          'www-authenticate': 'Bearer realm=\"co2router-control-surface\"',
        },
      },
    )
  }

  return null
}
