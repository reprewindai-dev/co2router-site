'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Region, Tier } from '@/lib/halogrid/types'

import { GlobeCanvas } from './GlobeCanvas'
import { LeftPanel } from './LeftPanel'
import { RegionDetail } from './RegionDetail'
import { RightPanel } from './RightPanel'
import { StatusBar } from './StatusBar'
import { TopBar } from './TopBar'
import { useHalogridConsole } from './useHalogridConsole'

const EMPTY_METRICS = {
  totalSavingsKg: 0,
  decisionsToday: 0,
  avgCarbon: 0,
  uptimePct: 0,
  activeRegions: 0,
  alertCount: 0,
}

export function HaloGridConsole() {
  const router = useRouter()
  const [tier, setTier] = useState<Tier>('core')
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [time, setTime] = useState(Date.now())
  const { snapshot, error, loading, refresh } = useHalogridConsole(paused)

  useEffect(() => {
    const timer = window.setInterval(() => setTime(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const regions = useMemo(() => snapshot?.regions ?? [], [snapshot])
  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  )

  const metrics = snapshot?.metrics ?? EMPTY_METRICS

  const handleRegionClick = (region: Region) => {
    setSelectedRegionId((current) => (current === region.id ? null : region.id))
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#060d18] text-slate-100">
      <TopBar
        metrics={metrics}
        tier={tier}
        paused={paused}
        onToggle={() => setPaused((current) => !current)}
        onRefresh={() => {
          void refresh()
        }}
        onTierChange={setTier}
        onBlogNavigate={() => router.push('/blog')}
        time={time}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <LeftPanel
          regions={regions}
          tier={tier}
          onRegionClick={handleRegionClick}
          collapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed((current) => !current)}
          backendHealth={snapshot?.backendHealth ?? null}
          backendError={error}
          signalProviders={snapshot?.signalProviders ?? []}
        />

        <div className="relative flex-1 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(56,189,248,0.035) 0%, transparent 70%)',
            }}
          />

          <GlobeCanvas regions={regions} onRegionClick={handleRegionClick} />
          <RegionDetail region={selectedRegion} onClose={() => setSelectedRegionId(null)} />

          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2">
            <div className="text-center text-[9px] font-mono tracking-[0.25em]" style={{ color: 'rgba(56,189,248,0.2)' }}>
              FLAT PROJECTION / EQUIRECTANGULAR
            </div>
          </div>

          {loading && !snapshot ? (
            <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
              <div
                className="rounded-full px-3 py-1 text-[10px] font-mono tracking-[0.2em] text-sky-300"
                style={{ background: 'rgba(8,15,28,0.8)', border: '1px solid rgba(56,189,248,0.14)' }}
              >
                LOADING LIVE CONTROL DATA
              </div>
            </div>
          ) : null}

          {error && !snapshot ? (
            <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-4">
              <div
                className="max-w-xl rounded-2xl px-4 py-3 text-center text-[10px] font-mono tracking-[0.14em] text-rose-200"
                style={{ background: 'rgba(127,29,29,0.35)', border: '1px solid rgba(248,113,113,0.18)' }}
              >
                {error}
              </div>
            </div>
          ) : null}
        </div>

        <RightPanel
          regions={regions}
          selectedRegion={selectedRegion}
          decisions={snapshot?.decisions ?? []}
          traces={snapshot?.traces ?? []}
          metrics={metrics}
          tier={tier}
          backendHealth={snapshot?.backendHealth ?? null}
          backendError={error}
        />
      </div>

      <StatusBar metrics={metrics} tier={tier} paused={paused} backendHealth={snapshot?.backendHealth ?? null} />
    </div>
  )
}
