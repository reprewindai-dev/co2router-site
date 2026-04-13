import fs from 'node:fs'
import path from 'node:path'

const ORIGIN = process.env.ORIGIN ?? 'https://co2router.com'
const PAGE_SIZE = Number(process.env.PAGE_SIZE ?? '2000')
const MAX_RECORDS = Number(process.env.MAX_RECORDS ?? '25000')

function formatDateStamp(date = new Date()) {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mi = String(date.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}${mm}${dd}-${hh}${mi}Z`
}

function safeNumber(value) {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function pickDecisionId(decision) {
  return decision?.decisionFrameId ?? decision?.decisionFrame?.id ?? null
}

function pickAction(decision) {
  const raw = (decision?.action ?? decision?.decisionAction ?? 'run').toString()
  return raw.toLowerCase()
}

function pickTimestampMs(decision) {
  const raw =
    decision?.createdAt ??
    decision?.timestamp ??
    decision?.decisionFrame?.request?.timestamp ??
    null
  if (!raw) return null
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : null
}

function pickEnergyKwh(decision) {
  return (
    safeNumber(decision?.estimatedEnergyKwh) ??
    safeNumber(decision?.decisionEnvelope?.estimatedEnergyKwh) ??
    safeNumber(decision?.decisionFrame?.metadata?.request?.estimatedEnergyKwh) ??
    safeNumber(decision?.decisionFrame?.request?.estimatedEnergyKwh) ??
    null
  )
}

function pickBaselineCarbonIntensity(decision) {
  return (
    safeNumber(decision?.baselineCarbonIntensity) ??
    safeNumber(decision?.baseline) ??
    safeNumber(decision?.proofEnvelope?.baseline?.carbonIntensity) ??
    safeNumber(decision?.decisionFrame?.baseline?.carbonIntensity) ??
    null
  )
}

function pickSelectedCarbonIntensity(decision) {
  return (
    safeNumber(decision?.carbonIntensity) ??
    safeNumber(decision?.selectedCarbonIntensity) ??
    safeNumber(decision?.proofEnvelope?.selected?.carbonIntensity) ??
    safeNumber(decision?.decisionFrame?.selected?.carbonIntensity) ??
    null
  )
}

function pickBaselineWaterLiters(decision) {
  return (
    safeNumber(decision?.waterBaselineLiters) ??
    safeNumber(decision?.proofEnvelope?.baseline?.waterImpactLiters) ??
    safeNumber(decision?.decisionFrame?.baseline?.waterImpactLiters) ??
    null
  )
}

function pickSelectedWaterLiters(decision) {
  return (
    safeNumber(decision?.waterImpactLiters) ??
    safeNumber(decision?.proofEnvelope?.selected?.waterImpactLiters) ??
    safeNumber(decision?.decisionFrame?.selected?.waterImpactLiters) ??
    null
  )
}

function pickBaselineWaterScarcity(decision) {
  return (
    safeNumber(decision?.decisionFrame?.waterBaselineScarcityImpact) ??
    safeNumber(decision?.proofEnvelope?.baseline?.waterScarcityImpact) ??
    safeNumber(decision?.decisionFrame?.baseline?.waterScarcityImpact) ??
    null
  )
}

function pickSelectedWaterScarcity(decision) {
  return (
    safeNumber(decision?.decisionFrame?.waterScarcityImpact) ??
    safeNumber(decision?.proofEnvelope?.selected?.waterScarcityImpact) ??
    safeNumber(decision?.decisionFrame?.selected?.waterScarcityImpact) ??
    null
  )
}

function pickRegions(decision) {
  const src =
    decision?.decisionFrame?.baselineTarget?.region ??
    decision?.decisionEnvelope?.baselineTarget?.region ??
    decision?.baselineRegion ??
    null
  const dst =
    decision?.decisionFrame?.selectedTarget?.region ??
    decision?.decisionEnvelope?.selectedTarget?.region ??
    decision?.selectedRegion ??
    null
  return { src, dst }
}

function sumNullable(acc, value) {
  if (value == null) return acc
  return acc + value
}

async function fetchWithTimeout(url, { timeoutMs = 15000, ...init } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchDecisions() {
  const decisions = []
  let cursor = null

  async function fetchLegacyPage(limit, offset) {
    const legacy = new URL('/api/ecobe/ci/decisions', ORIGIN)
    legacy.searchParams.set('limit', String(limit))
    legacy.searchParams.set('offset', String(offset))
    const legacyRes = await fetchWithTimeout(legacy, { headers: { accept: 'application/json' } })
    if (!legacyRes.ok) {
      const text = await legacyRes.text().catch(() => '')
      throw new Error(`Legacy fetch failed (${legacyRes.status}): ${text.slice(0, 200)}`)
    }
    const legacyJson = await legacyRes.json()
    const legacyDecisions = Array.isArray(legacyJson?.decisions) ? legacyJson.decisions : []
    return { decisions: legacyDecisions, raw: legacyJson }
  }

  async function fetchLegacyDecisionsPaged() {
    const tryLimits = [Math.min(MAX_RECORDS, 200), 200, 100, 50, 25, 10, 1]
    let limit = null
    let firstError = null

    for (const tryLimit of tryLimits) {
      try {
        const first = await fetchLegacyPage(tryLimit, 0)
        if (first.decisions.length === 0) {
          limit = tryLimit
          decisions.push(...first.decisions)
          return { decisions, raw: first.raw }
        }
        limit = tryLimit
        decisions.push(...first.decisions)
        break
      } catch (err) {
        firstError = err
      }
    }

    if (!limit) {
      throw firstError ?? new Error('Legacy decisions endpoint failed.')
    }

    for (let offset = decisions.length; offset < MAX_RECORDS; offset += limit) {
      const page = await fetchLegacyPage(limit, offset)
      decisions.push(...page.decisions)
      if (decisions.length >= MAX_RECORDS) {
        return { decisions: decisions.slice(0, MAX_RECORDS), raw: page.raw }
      }
      if (page.decisions.length === 0 || page.decisions.length < limit) {
        return { decisions, raw: page.raw }
      }
    }

    return { decisions, raw: { truncated: true } }
  }

  for (let pageIndex = 0; pageIndex < 1000; pageIndex += 1) {
    const url = new URL('/api/ecobe/ci/decisions/export', ORIGIN)
    url.searchParams.set('limit', String(PAGE_SIZE))
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } })
    if (!res.ok) {
      if (pageIndex === 0) {
        // Fallback when engine export isn't deployed yet.
        return await fetchLegacyDecisionsPaged()
      }

      const text = await res.text().catch(() => '')
      throw new Error(`Fetch failed (${res.status}): ${text.slice(0, 200)}`)
    }

    const json = await res.json()
    const page = Array.isArray(json?.decisions) ? json.decisions : []
    decisions.push(...page)

    if (decisions.length >= MAX_RECORDS) {
      return { decisions: decisions.slice(0, MAX_RECORDS), raw: json }
    }

    cursor = typeof json?.nextCursor === 'string' ? json.nextCursor : null
    if (!json?.hasMore || !cursor || page.length === 0) {
      return { decisions, raw: json }
    }
  }

  return { decisions, raw: { truncated: true } }
}

function computeReport(decisions) {
  const actions = new Map()

  let baselineCarbonSum = 0
  let selectedCarbonSum = 0
  let carbonCount = 0

  let baselineWaterL = 0
  let selectedWaterL = 0
  let waterCount = 0

  let baselineScarcity = 0
  let selectedScarcity = 0
  let scarcityCount = 0

  let baselineCarbonGWeighted = 0
  let selectedCarbonGWeighted = 0
  let weightedCarbonCount = 0

  const byRegion = new Map()

  let minTs = null
  let maxTs = null

  for (const decision of decisions) {
    const action = pickAction(decision)
    actions.set(action, (actions.get(action) ?? 0) + 1)

    const ts = pickTimestampMs(decision)
    if (ts != null) {
      minTs = minTs == null ? ts : Math.min(minTs, ts)
      maxTs = maxTs == null ? ts : Math.max(maxTs, ts)
    }

    const baselineCarbon = pickBaselineCarbonIntensity(decision)
    const selectedCarbon = pickSelectedCarbonIntensity(decision)
    if (baselineCarbon != null && selectedCarbon != null) {
      baselineCarbonSum += baselineCarbon
      selectedCarbonSum += selectedCarbon
      carbonCount += 1
    }

    const energyKwh = pickEnergyKwh(decision)
    if (baselineCarbon != null && selectedCarbon != null && energyKwh != null) {
      // Treat intensity as gCO2e/kWh when energy is provided.
      baselineCarbonGWeighted += baselineCarbon * energyKwh
      selectedCarbonGWeighted += selectedCarbon * energyKwh
      weightedCarbonCount += 1
    }

    const baselineWater = pickBaselineWaterLiters(decision)
    const selectedWater = pickSelectedWaterLiters(decision)
    if (baselineWater != null && selectedWater != null) {
      baselineWaterL += baselineWater
      selectedWaterL += selectedWater
      waterCount += 1
    }

    const baselineWsi = pickBaselineWaterScarcity(decision)
    const selectedWsi = pickSelectedWaterScarcity(decision)
    if (baselineWsi != null && selectedWsi != null) {
      baselineScarcity += baselineWsi
      selectedScarcity += selectedWsi
      scarcityCount += 1
    }

    const { src, dst } = pickRegions(decision)
    if (dst) {
      const row = byRegion.get(dst) ?? {
        decisions: 0,
        baselineCarbonSum: 0,
        selectedCarbonSum: 0,
        carbonCount: 0,
        baselineWaterL: 0,
        selectedWaterL: 0,
        waterCount: 0,
      }
      row.decisions += 1
      if (baselineCarbon != null && selectedCarbon != null) {
        row.baselineCarbonSum += baselineCarbon
        row.selectedCarbonSum += selectedCarbon
        row.carbonCount += 1
      }
      if (baselineWater != null && selectedWater != null) {
        row.baselineWaterL += baselineWater
        row.selectedWaterL += selectedWater
        row.waterCount += 1
      }
      byRegion.set(dst, row)
    }

    // also track src if no dst
    if (!dst && src) {
      const row = byRegion.get(src) ?? {
        decisions: 0,
        baselineCarbonSum: 0,
        selectedCarbonSum: 0,
        carbonCount: 0,
        baselineWaterL: 0,
        selectedWaterL: 0,
        waterCount: 0,
      }
      row.decisions += 1
      byRegion.set(src, row)
    }
  }

  const carbonAvoided = baselineCarbonSum - selectedCarbonSum
  const carbonAvoidedPct = baselineCarbonSum > 0 ? (carbonAvoided / baselineCarbonSum) * 100 : 0

  const waterAvoided = baselineWaterL - selectedWaterL
  const waterAvoidedPct = baselineWaterL > 0 ? (waterAvoided / baselineWaterL) * 100 : 0

  const scarcityAvoided = baselineScarcity - selectedScarcity
  const scarcityAvoidedPct = baselineScarcity > 0 ? (scarcityAvoided / baselineScarcity) * 100 : 0

  const weightedAvoidedG = baselineCarbonGWeighted - selectedCarbonGWeighted
  const weightedAvoidedPct =
    baselineCarbonGWeighted > 0 ? (weightedAvoidedG / baselineCarbonGWeighted) * 100 : 0

  const byRegionOut = Array.from(byRegion.entries())
    .map(([region, row]) => ({
      region,
      decisions: row.decisions,
      avgCarbonBaseline: row.carbonCount ? row.baselineCarbonSum / row.carbonCount : null,
      avgCarbonSelected: row.carbonCount ? row.selectedCarbonSum / row.carbonCount : null,
      avgWaterBaselineL: row.waterCount ? row.baselineWaterL / row.waterCount : null,
      avgWaterSelectedL: row.waterCount ? row.selectedWaterL / row.waterCount : null,
    }))
    .sort((a, b) => b.decisions - a.decisions)

  return {
    sampleSize: decisions.length,
    window: {
      minTimestamp: minTs ? new Date(minTs).toISOString() : null,
      maxTimestamp: maxTs ? new Date(maxTs).toISOString() : null,
    },
    actions: Object.fromEntries(Array.from(actions.entries()).sort((a, b) => b[1] - a[1])),
    carbonIntensity: {
      count: carbonCount,
      baselineSum: baselineCarbonSum,
      selectedSum: selectedCarbonSum,
      avoided: carbonAvoided,
      avoidedPct: carbonAvoidedPct,
      baselineAvg: carbonCount ? baselineCarbonSum / carbonCount : null,
      selectedAvg: carbonCount ? selectedCarbonSum / carbonCount : null,
    },
    carbonWeightedByEnergy: {
      count: weightedCarbonCount,
      baselineG: baselineCarbonGWeighted,
      selectedG: selectedCarbonGWeighted,
      avoidedG: weightedAvoidedG,
      avoidedPct: weightedAvoidedPct,
    },
    waterLiters: {
      count: waterCount,
      baselineL: baselineWaterL,
      selectedL: selectedWaterL,
      avoidedL: waterAvoided,
      avoidedPct: waterAvoidedPct,
    },
    waterScarcity: {
      count: scarcityCount,
      baseline: baselineScarcity,
      selected: selectedScarcity,
      avoided: scarcityAvoided,
      avoidedPct: scarcityAvoidedPct,
    },
    byRegion: byRegionOut,
  }
}

function toCsvRows(decisions) {
  const rows = []
  for (const decision of decisions) {
    const id = pickDecisionId(decision)
    const action = pickAction(decision)
    const ts = pickTimestampMs(decision)
    const { src, dst } = pickRegions(decision)
    const energyKwh = pickEnergyKwh(decision)
    const baselineCarbon = pickBaselineCarbonIntensity(decision)
    const selectedCarbon = pickSelectedCarbonIntensity(decision)
    const baselineWater = pickBaselineWaterLiters(decision)
    const selectedWater = pickSelectedWaterLiters(decision)
    const baselineScarcity = pickBaselineWaterScarcity(decision)
    const selectedScarcity = pickSelectedWaterScarcity(decision)

    rows.push({
      decisionFrameId: id,
      createdAt: ts ? new Date(ts).toISOString() : '',
      action,
      baselineRegion: src ?? '',
      selectedRegion: dst ?? '',
      estimatedEnergyKwh: energyKwh ?? '',
      baselineCarbonIntensity: baselineCarbon ?? '',
      selectedCarbonIntensity: selectedCarbon ?? '',
      baselineWaterLiters: baselineWater ?? '',
      selectedWaterLiters: selectedWater ?? '',
      baselineWaterScarcity: baselineScarcity ?? '',
      selectedWaterScarcity: selectedScarcity ?? '',
    })
  }
  return rows
}

function writeCsv(filePath, rows) {
  const headers = Object.keys(rows[0] ?? {})
  const lines = [headers.join(',')]
  for (const row of rows) {
    const line = headers
      .map((header) => {
        const value = row[header]
        const str = value == null ? '' : String(value)
        const escaped = str.includes('"') ? str.replaceAll('"', '""') : str
        return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped
      })
      .join(',')
    lines.push(line)
  }
  fs.writeFileSync(filePath, lines.join('\n'))
}

const stamp = formatDateStamp()
const exportsDir = path.resolve(process.cwd(), 'exports')
fs.mkdirSync(exportsDir, { recursive: true })

const { decisions, raw } = await fetchDecisions()
const report = computeReport(decisions)

const outJson = path.join(exportsDir, `engine-baseline-${stamp}.json`)
fs.writeFileSync(
  outJson,
  JSON.stringify(
    { origin: ORIGIN, pagination: { pageSize: PAGE_SIZE, maxRecords: MAX_RECORDS }, report },
    null,
    2
  )
)

const outCsv = path.join(exportsDir, `engine-decisions-sample-${stamp}.csv`)
const csvRows = toCsvRows(decisions)
if (csvRows.length) writeCsv(outCsv, csvRows)

console.log(JSON.stringify({ outJson, outCsv, sampleSize: decisions.length, report }, null, 2))
