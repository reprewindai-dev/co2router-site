#!/usr/bin/env node

const DEFAULT_HOST = 'https://co2router.com'
const TIMEOUT_MS = 15000

function normalizeHost(raw) {
  const value = String(raw || DEFAULT_HOST).trim()
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function short(value, max = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length <= max ? text : `${text.slice(0, max)}...`
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: 'application/json, text/html;q=0.9, */*;q=0.8',
        ...(init.headers || {}),
      },
      cache: 'no-store',
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url)
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { response, text, json }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function printPass(scope, message) {
  console.log(`PASS [${scope}] ${message}`)
}

function printFail(scope, message) {
  console.error(`FAIL [${scope}] ${message}`)
}

async function auditEndpoint(scope, url, verify) {
  try {
    const result = await fetchJson(url)
    await verify(result)
    printPass(scope, `${url}`)
    return { ok: true, result }
  } catch (error) {
    printFail(scope, `${url} :: ${short(error.message || error)}`)
    return { ok: false, error }
  }
}

async function main() {
  const host = normalizeHost(process.argv[2] || process.env.HALOGRID_AUDIT_HOST || DEFAULT_HOST)
  console.log(`HaloGrid release audit target: ${host}`)

  const checks = []

  checks.push(
    await auditEndpoint('dashboard-health', `${host}/api/health`, async ({ response, json }) => {
      assert(response.ok, `expected 200, got ${response.status}`)
      assert(json?.status === 'ok', 'dashboard health status must be ok')
      assert(json?.routing?.ecobeProxyBase === '/api/ecobe', 'dashboard proxy base missing')
      assert(
        Object.prototype.hasOwnProperty.call(json?.build || {}, 'commit'),
        'dashboard build metadata missing'
      )
    })
  )

  checks.push(
    await auditEndpoint('console-route', `${host}/console`, async ({ response, text }) => {
      assert(response.ok, `expected 200, got ${response.status}`)
      assert(/keeper-console/i.test(text), 'console route does not reference keeper console')
    })
  )

  checks.push(
    await auditEndpoint('console-html', `${host}/keeper-console.html`, async ({ response, text }) => {
      assert(response.ok, `expected 200, got ${response.status}`)
      assert(/Carbon Delta \(Sample\)/i.test(text), 'updated sampled carbon copy missing')
      assert(/sampled production window/i.test(text), 'sample-window labeling missing')
      assert(!/CO2 SAVED/i.test(text), 'legacy CO2 SAVED headline still present')
      assert(!/H2O SAVED/i.test(text), 'legacy H2O SAVED headline still present')
      assert(!/ecobe-engineclaude-co2router\.onrender\.com/i.test(text), 'direct engine URL leaked into browser HTML')
      assert(/build-marker/i.test(text), 'build marker surface missing from keeper console')
    })
  )

  checks.push(
    await auditEndpoint('proxy-health', `${host}/api/ecobe/health`, async ({ response, json }) => {
      assert(response.ok, `expected 200, got ${response.status}`)
      assert(json && typeof json === 'object', 'proxy health must return JSON')
    })
  )

  checks.push(
    await auditEndpoint(
      'proxy-decisions',
      `${host}/api/ecobe/ci/decisions?limit=25&offset=0`,
      async ({ response, json }) => {
        assert(response.ok, `expected 200, got ${response.status}`)
        assert(Array.isArray(json?.decisions), 'decisions array missing')
        assert(json.decisions.length > 0, 'decision feed is empty while audit expects live activity')
        const first = json.decisions[0] || {}
        assert(
          first.action || first.decisionAction,
          'decision payload missing action/decisionAction'
        )
        assert(
          first.selectedRegion || first.decisionEnvelope?.selectedRegion || first.decisionFrame?.selected?.region,
          'decision payload missing selected region'
        )
        assert(first.createdAt || first.timestamp, 'decision payload missing timestamp')
      }
    )
  )

  checks.push(
    await auditEndpoint('baseline', `${host}/api/analytics/baseline`, async ({ response, json }) => {
      assert(response.ok, `expected 200, got ${response.status}`)
      assert(json?.ok === true, 'baseline route must return ok=true')
      assert(json?.baseline?.window?.minTimestamp, 'baseline window start missing')
      assert(json?.baseline?.window?.maxTimestamp, 'baseline window end missing')
      assert(
        typeof json?.source?.sampleSize === 'number' && json.source.sampleSize > 0,
        'source.sampleSize missing'
      )
      assert(typeof json?.source?.note === 'string' && json.source.note.length > 0, 'source.note missing')
      assert(typeof json?.source?.type === 'string' && json.source.type.length > 0, 'source.type missing')
      assert(typeof json?.generatedAt === 'string' && json.generatedAt.length > 0, 'generatedAt missing')
    })
  )

  const failures = checks.filter((check) => !check.ok)
  if (failures.length > 0) {
    console.error(`Release audit failed: ${failures.length} gate(s) did not pass.`)
    process.exit(1)
  }

  console.log('Release audit passed: all HaloGrid production gates are green.')
}

main().catch((error) => {
  console.error(`FAIL [fatal] ${short(error.message || error)}`)
  process.exit(1)
})
