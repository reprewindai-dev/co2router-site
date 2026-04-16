import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getOperatorKey() {
  return process.env.CO2ROUTER_OPERATOR_KEY || process.env.ECOBE_OPERATOR_KEY || null
}

function hasOperatorAccess(request: NextRequest, expected: string) {
  const headerKey =
    request.headers.get('x-co2router-operator-key') ||
    request.headers.get('x-operator-key') ||
    null
  if (headerKey && headerKey === expected) return true

  const auth = request.headers.get('authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim()
    if (token === expected) return true
  }

  const cookieKey = request.cookies.get('co2router_operator_key')?.value
  return cookieKey === expected
}

function shouldProtectEcobePath(pathname: string) {
  if (!pathname.startsWith('/api/ecobe/')) return false
  const joined = pathname.slice('/api/ecobe/'.length)

  return (
    joined === 'methodology' ||
    joined.startsWith('methodology/') ||
    joined.startsWith('disclosure/') ||
    joined.startsWith('system/') ||
    joined === 'ci/decisions/export' ||
    joined.startsWith('ci/decisions/export/') ||
    /^ci\/decisions\/[^/]+\/(trace|replay)$/.test(joined)
  )
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const protectControlSurface = pathname.startsWith('/api/control-surface/')
  const protectEcobe = shouldProtectEcobePath(pathname)
  if (!protectControlSurface && !protectEcobe) return NextResponse.next()

  const operatorKey = getOperatorKey()
  if (!operatorKey) {
    return NextResponse.json(
      {
        error: 'Operator access key is not configured.',
      },
      {
        status: 503,
        headers: {
          'cache-control': 'no-store',
        },
      },
    )
  }

  if (!hasOperatorAccess(request, operatorKey)) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/control-surface/:path*', '/api/ecobe/:path*'],
}
