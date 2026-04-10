/* =======================================================
   HALOGRID INTELLIGENCE ENGINE - Offline AI
   Runs 100% in the browser. No API. No external calls.
   Analyzes fleet data and surfaces operator insights.
   ======================================================= */

export interface FleetInsight {
  id: string
  type: 'carbon_trend' | 'anomaly' | 'region_reliability' | 'water_stress' | 'fleet_health' | 'self_heal'
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  confidence: number
  ts: string
}

export interface IntelligenceReport {
  healthScore: number
  carbonTrend: 'improving' | 'degrading' | 'stable'
  denyRate: number
  insights: FleetInsight[]
  analyzedAt: string
}

// --- Math primitives ---
function linReg(vals: number[]): { slope: number; r2: number } {
  const n = vals.length
  if (n < 2) return { slope: 0, r2: 0 }
  const xm = (n - 1) / 2, ym = vals.reduce((s, v) => s + v, 0) / n
  let num = 0, den = 0, ssTot = 0, ssRes = 0
  for (let i = 0; i < n; i++) { num += (i - xm) * (vals[i] - ym); den += (i - xm) ** 2 }
  const slope = den === 0 ? 0 : num / den, intercept = ym - slope * xm
  for (let i = 0; i < n; i++) { ssTot += (vals[i] - ym) ** 2; ssRes += (vals[i] - (intercept + slope * i)) ** 2 }
  return { slope, r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot }
}

function zScore(v: number, vals: number[]): number {
  if (vals.length < 2) return 0
  const m = vals.reduce((s, x) => s + x, 0) / vals.length
  const sd = Math.sqrt(vals.reduce((s, x) => s + (x - m) ** 2, 0) / vals.length)
  return sd === 0 ? 0 : (v - m) / sd
}

// --- Main analysis ---
export function analyzeFleet(data: {
  regions: { state: string; action: string | null }[]
  decisions: { action: string; latencyTotalMs: number | null; selectedRegion: string }[]
  carbonPressure: number
  providers: { status: string; freshnessSec: number | null }[]
  pressureHistory: number[]
}): IntelligenceReport {
  const insights: FleetInsight[] = []
  const now = new Date().toISOString()
  const { regions, decisions, carbonPressure, providers, pressureHistory } = data

  // Fleet health score (0-100)
  const activePct = regions.filter((r) => r.state === 'active').length / Math.max(regions.length, 1)
  const healthyPct = providers.filter((p) => p.status === 'healthy').length / Math.max(providers.length, 1)
  const pressureBonus = carbonPressure < 50 ? 10 : carbonPressure < 75 ? 5 : 0
  const healthScore = Math.round(activePct * 60 + healthyPct * 30 + pressureBonus)

  // Carbon trend (linear regression)
  const trend = linReg(pressureHistory.length >= 2 ? pressureHistory : [carbonPressure])
  const carbonTrend: IntelligenceReport['carbonTrend'] = trend.slope < -0.5 ? 'improving' : trend.slope > 0.5 ? 'degrading' : 'stable'

  if (carbonTrend === 'degrading') {
    insights.push({ id: 'carbon-trend', type: 'carbon_trend', severity: 'warning', title: 'Carbon pressure rising', detail: `Slope ${trend.slope.toFixed(2)} over ${pressureHistory.length} samples (R2=${trend.r2.toFixed(2)}).`, confidence: Math.min(0.95, trend.r2), ts: now })
  } else if (carbonTrend === 'improving' && pressureHistory.length >= 3) {
    insights.push({ id: 'carbon-improving', type: 'carbon_trend', severity: 'info', title: 'Carbon pressure improving', detail: `Downward trend slope ${trend.slope.toFixed(2)}.`, confidence: Math.min(0.9, trend.r2), ts: now })
  }

  // Deny rate
  const denies = decisions.filter((d) => d.action === 'deny').length
  const denyRate = decisions.length > 0 ? denies / decisions.length : 0
  if (denyRate > 0.25) {
    insights.push({ id: 'deny-rate', type: 'anomaly', severity: denyRate > 0.5 ? 'critical' : 'warning', title: `Deny rate ${(denyRate * 100).toFixed(0)}%`, detail: `${denies}/${decisions.length} recent decisions denied.`, confidence: 0.9, ts: now })
  }

  // Latency anomaly (Z-score)
  const lats = decisions.map((d) => d.latencyTotalMs).filter((v): v is number => v != null)
  if (lats.length >= 3) {
    const z = zScore(lats[lats.length - 1], lats)
    if (Math.abs(z) > 2) {
      insights.push({ id: 'latency-z', type: 'anomaly', severity: Math.abs(z) > 3 ? 'critical' : 'warning', title: `Latency anomaly Z=${z.toFixed(1)}`, detail: `Latest ${lats[lats.length - 1]}ms vs fleet avg ${(lats.reduce((s, v) => s + v, 0) / lats.length).toFixed(0)}ms.`, confidence: Math.min(0.95, 0.5 + Math.abs(z) * 0.15), ts: now })
    }
  }

  // Region reliability
  const regionMap = new Map<string, { ok: number; total: number }>()
  decisions.forEach((d) => {
    const e = regionMap.get(d.selectedRegion) ?? { ok: 0, total: 0 }
    e.total++
    if (d.action !== 'deny') e.ok++
    regionMap.set(d.selectedRegion, e)
  })
  regionMap.forEach((v, k) => {
    const rel = v.ok / Math.max(v.total, 1)
    if (rel < 0.5 && v.total >= 2) {
      insights.push({ id: `reg-${k}`, type: 'region_reliability', severity: 'info', title: `${k} underperforming`, detail: `${(rel * 100).toFixed(0)}% execution rate (${v.ok}/${v.total}).`, confidence: 0.7, ts: now })
    }
  })

  // Stale providers
  providers.forEach((p, i) => {
    if (p.freshnessSec != null && p.freshnessSec > 300) {
      insights.push({ id: `stale-${i}`, type: 'anomaly', severity: 'warning', title: 'Stale signal provider', detail: `Provider data ${Math.round(p.freshnessSec / 60)}m old.`, confidence: 0.85, ts: now })
    }
  })

  // Water stress clustering
  const blockedRegions = regions.filter((r) => r.state === 'blocked')
  if (blockedRegions.length >= 3) {
    insights.push({ id: 'cluster-block', type: 'water_stress', severity: 'critical', title: `${blockedRegions.length} regions blocked`, detail: 'Multi-region block cluster detected. Possible systemic constraint.', confidence: 0.85, ts: now })
  }

  return {
    healthScore: Math.max(0, Math.min(100, healthScore)),
    carbonTrend,
    denyRate,
    insights: insights.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] ?? 2) - ({ critical: 0, warning: 1, info: 2 }[b.severity] ?? 2)),
    analyzedAt: now,
  }
}

// --- Self-healing watchdog ---
export class SelfHealingWatchdog {
  private lastFreshTs = Date.now()
  private staleThresholdMs: number
  private onHeal: () => void
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(opts: { staleThresholdMs?: number; onHeal: () => void }) {
    this.staleThresholdMs = opts.staleThresholdMs ?? 20_000
    this.onHeal = opts.onHeal
  }

  start() {
    this.timer = setInterval(() => {
      if (Date.now() - this.lastFreshTs > this.staleThresholdMs) {
        console.log('[HalOGrid Watchdog] Stale feed - self-healed.')
        this.onHeal()
        this.lastFreshTs = Date.now()
      }
    }, 5_000)
  }

  feed() { this.lastFreshTs = Date.now() }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null } }
}


