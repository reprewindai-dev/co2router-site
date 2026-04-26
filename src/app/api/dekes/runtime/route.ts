import { NextRequest, NextResponse } from 'next/server'

import { getCachedSnapshot } from '@/lib/control-surface/snapshot-cache'
import { buildDekesRuntimeReadModel, getDekesRuntimeHandoffById } from '@/lib/dekes-runtime'

export async function GET(request: NextRequest) {
  try {
    const view = request.nextUrl.searchParams.get('view') ?? 'all'
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '96')
    const handoffId = request.nextUrl.searchParams.get('handoffId')

    if (view === 'handoff') {
      if (!handoffId) {
        return NextResponse.json({ error: 'handoffId is required for handoff view' }, { status: 400 })
      }

      const handoff = await getDekesRuntimeHandoffById(handoffId)
      if (!handoff) {
        return NextResponse.json({ error: 'Handoff not found' }, { status: 404 })
      }

      return NextResponse.json(handoff)
    }

    const normalizedLimit = Number.isFinite(limit) ? limit : 96
    const snapshot = await getCachedSnapshot(
      `dekes-runtime:${normalizedLimit}`,
      15_000,
      async () => buildDekesRuntimeReadModel(normalizedLimit)
    )
    const readModel = snapshot.value

    const headers = new Headers({
      'x-snapshot-status': snapshot.cacheStatus,
    })
    if (snapshot.lastSuccessfulAt) {
      headers.set('x-snapshot-last-successful-at', snapshot.lastSuccessfulAt)
    }
    if (snapshot.errorMessage) {
      headers.set('x-snapshot-error', snapshot.errorMessage)
    }

    if (view === 'summary') {
      return NextResponse.json(readModel.summary, { headers })
    }
    if (view === 'metrics') {
      return NextResponse.json(readModel.metrics, { headers })
    }
    if (view === 'events') {
      return NextResponse.json(readModel.events, { headers })
    }

    return NextResponse.json(readModel, { headers })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to build DEKES runtime read model',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    )
  }
}
