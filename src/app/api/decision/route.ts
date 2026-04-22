import { NextResponse } from 'next/server'

const baseUrl = () =>
  process.env.MCP_API_URL?.replace(/\/$/, '') ?? process.env.ECOBE_MVP_URL?.replace(/\/$/, '') ?? null

export async function POST(request: Request) {
  const base = baseUrl()
  if (!base) {
    return NextResponse.json({ error: 'Decision service unavailable' }, { status: 503 })
  }

  const body = await request.text()
  const upstream = await fetch(`${base}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
