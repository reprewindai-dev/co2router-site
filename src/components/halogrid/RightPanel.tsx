'use client'

import type { BackendHealth, Decision, Region, SystemMetrics, Tier, TraceFrame } from '@/lib/halogrid/types'
import { actionColor, actionLabel, formatHash, formatTime, shortRevision } from '@/lib/halogrid/utils'

import { DecisionCard } from './DecisionCard'
import { SmartAdvisor } from './SmartAdvisor'
import { useAdvisor } from './useAdvisor'

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <div className="text-[10px] font-mono tracking-[0.24em]" style={{ color: 'rgba(56,189,248,0.75)' }}>
          {title}
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-100">{subtitle}</div>
      </div>
    </div>
  )
}

export function RightPanel({
  regions,
  selectedRegion,
  decisions,
  traces,
  metrics,
  tier,
  backendHealth,
  backendError,
}: {
  regions: Region[]
  selectedRegion: Region | null
  decisions: Decision[]
  traces: TraceFrame[]
  metrics: SystemMetrics
  tier: Tier
  backendHealth: BackendHealth | null
  backendError: string | null
}) {
  const visibleDecisions = decisions.slice(0, tier === 'freeview' ? 10 : 18)
  const visibleTraces = traces.slice(0, 10)
  const onlineProviders = backendHealth ? Object.values(backendHealth.providers).filter(Boolean).length : 0
  const totalProviders = backendHealth ? Object.keys(backendHealth.providers).length : 0
  const advisor = useAdvisor({ regions, selectedRegion, decisions, metrics, backendHealth })

  return (
    <aside
      className="z-20 flex h-full w-[360px] flex-shrink-0 flex-col border-l"
      style={{
        borderColor: 'rgba(56,189,248,0.08)',
        background: 'linear-gradient(180deg, rgba(6,13,24,0.95) 0%, rgba(6,13,24,0.88) 100%)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex-1 overflow-hidden px-3 py-3">
        <PanelHeader
          title="DECISION STREAM"
          subtitle={tier === 'freeview' ? 'Live regional actions' : 'Weighted routing actions with policy confidence'}
        />

        <div className="h-[58%] overflow-y-auto pr-1 [scrollbar-width:thin]">
          {visibleDecisions.length > 0 ? (
            visibleDecisions.map((decision, index) => (
              <DecisionCard key={decision.id} decision={decision} tier={tier} index={index} />
            ))
          ) : (
            <div
              className="rounded-2xl px-4 py-6 text-center text-[10px] font-mono tracking-[0.18em] text-slate-500"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              Awaiting live routing decisions
            </div>
          )}
        </div>

        <div className="mt-4">
          {(backendHealth || backendError) && (
            <div
              className="mb-4 rounded-2xl px-3 py-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(56,189,248,0.08)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono tracking-[0.22em]" style={{ color: 'rgba(56,189,248,0.75)' }}>
                    ENGINE BINDING
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-100">
                    {backendHealth
                      ? `${backendHealth.build.serviceName} / ${backendHealth.build.branch}`
                      : 'Health endpoint unavailable'}
                  </div>
                </div>
                <div
                  className="rounded-full px-2 py-1 text-[8px] font-mono tracking-[0.18em]"
                  style={{
                    color: backendHealth ? '#4ade80' : '#f87171',
                    background: backendHealth ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                  }}
                >
                  {backendHealth ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[8px] font-mono tracking-[0.16em] text-slate-500">PROVIDERS</div>
                  <div className="mt-1 text-[11px] font-medium text-sky-400">
                    {backendHealth ? `${onlineProviders}/${totalProviders}` : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono tracking-[0.16em] text-slate-500">DB / REDIS</div>
                  <div className="mt-1 text-[11px] font-medium text-emerald-400">
                    {backendHealth
                      ? `${backendHealth.dependencies.database ? 'up' : 'down'} / ${
                          backendHealth.dependencies.redis ? 'up' : 'down'
                        }`
                      : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono tracking-[0.16em] text-slate-500">REV</div>
                  <div className="mt-1 text-[11px] font-medium text-amber-300">
                    {backendHealth ? shortRevision(backendHealth.build.revision) : '--'}
                  </div>
                </div>
              </div>

              {backendError && !backendHealth ? (
                <div
                  className="mt-3 rounded-xl px-2 py-2 text-[9px] font-mono text-rose-300"
                  style={{ background: 'rgba(248,113,113,0.08)' }}
                >
                  {backendError}
                </div>
              ) : null}
            </div>
          )}

          <PanelHeader
            title={tier === 'elite' ? 'TRACE RAIL' : 'CONTROL PLANE'}
            subtitle={
              tier === 'elite'
                ? 'Proof-carrying action ledger'
                : tier === 'core'
                  ? 'Confidence and signal posture'
                  : 'Upgrade to Core for deeper routing telemetry'
            }
          />

          {tier === 'elite' ? (
            <div className="h-[30%] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {visibleTraces.map((trace) => (
                <div
                  key={trace.id}
                  className="rounded-2xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${actionColor(trace.action)}18` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-200">{trace.regionName}</span>
                    <span className="text-[8px] font-mono text-slate-500">{formatTime(trace.timestamp)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className="rounded-full px-2 py-1 text-[8px] font-mono tracking-[0.18em]"
                      style={{ color: actionColor(trace.action), background: `${actionColor(trace.action)}18` }}
                    >
                      {actionLabel(trace.action)}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500">{formatHash(trace.proofHash, 14)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {[
                {
                  label: 'Mode',
                  value: backendHealth
                    ? `${backendHealth.engine} / router ${backendHealth.router ? 'enabled' : 'disabled'}`
                    : 'Live adapter waiting on upstream engine health',
                  color: '#38bdf8',
                },
                {
                  label: 'Confidence',
                  value: backendHealth ? `${onlineProviders}/${totalProviders} provider feeds online` : 'Awaiting provider health snapshot',
                  color: '#a78bfa',
                },
                {
                  label: 'Audit',
                  value: backendHealth
                    ? `${backendHealth.checks.waterArtifacts?.regionCount ?? 0} water regions loaded`
                    : 'Proof rail unavailable while health is offline',
                  color: '#fbbf24',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="text-[8px] font-mono tracking-[0.18em] text-slate-500">{item.label}</div>
                  <div className="mt-1 text-[11px] font-medium" style={{ color: item.color }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <SmartAdvisor advisor={advisor} />
          </div>
        </div>
      </div>
    </aside>
  )
}
