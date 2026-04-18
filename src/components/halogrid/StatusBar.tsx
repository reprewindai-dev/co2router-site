'use client'

import type { BackendHealth, SystemMetrics, Tier } from '@/lib/halogrid/types'

export function StatusBar({
  metrics,
  tier,
  paused,
  backendHealth,
}: {
  metrics: SystemMetrics
  tier: Tier
  paused: boolean
  backendHealth: BackendHealth | null
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-between px-4 py-1.5"
      style={{
        borderTop: '1px solid rgba(56,189,248,0.06)',
        background: 'rgba(6,13,24,0.92)',
        fontSize: 9,
      }}
    >
      <div className="flex items-center gap-4 font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: paused ? '#fbbf24' : '#4ade80',
              boxShadow: paused ? '0 0 5px #fbbf24' : '0 0 5px #4ade80',
            }}
          />
          {paused ? 'POLLING PAUSED' : 'LIVE'}
        </span>
        <span className="tracking-widest">TIER: {tier.toUpperCase()}</span>
        <span className="tracking-widest">REGIONS: {metrics.activeRegions}/10</span>
        <span className="tracking-widest">BACKEND: {backendHealth ? 'ONLINE' : 'DEGRADED'}</span>
      </div>

      <div className="flex items-center gap-4 font-mono text-slate-500">
        {backendHealth ? (
          <span>
            DB {backendHealth.dependencies.database ? 'UP' : 'DOWN'} / REDIS {backendHealth.dependencies.redis ? 'UP' : 'DOWN'}
          </span>
        ) : null}
        <span>CO2ROUTER.COM /CONSOLE</span>
        <span className="tracking-widest" style={{ color: 'rgba(56,189,248,0.35)' }}>
          HALOGRID
        </span>
      </div>
    </div>
  )
}
