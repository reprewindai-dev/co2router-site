'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import GlobeZone to avoid SSR issues with Three.js
const GlobeZone = dynamic(
  () => import('@/components/co2-control-panel/zones/GlobeZone').then(m => m.GlobeZone),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"/></div> }
)

// ─── Types ──────────────────────────────────────────────────────────────────

type RegionState = 'green' | 'yellow' | 'red'
type RouterAction = 'SHIFT_REGION' | 'DEFER_JOB' | 'THROTTLE' | 'HOLD' | 'PASS'
type Tier = 'freeview' | 'pro' | 'elite'

interface Region {
  id: string; name: string; code: string; lat: number; lng: number
  carbon: number; renewable: number; load: number; waterStress: number
  state: RegionState; lastDecision: RouterAction; trend: 'up' | 'down' | 'flat'; provider: string
}

interface Decision {
  id: string; regionId: string; regionName: string; action: RouterAction
  reason: string; carbon: number; savings: number; timestamp: number
  confidence: number; proofHash: string
}

interface SystemMetrics {
  totalSavings: number; decisionsToday: number; avgCarbon: number
  uptimePct: number; activeRegions: number; alertCount: number
}

// ─── Static data ─────────────────────────────────────────────────────────────

const INITIAL_REGIONS: Region[] = [
  { id:'us-west-2',      name:'US West 2',        code:'PDX', lat:45.5,  lng:-122.6, carbon:82,  renewable:91, load:62, waterStress:0.2, state:'green',  lastDecision:'SHIFT_REGION', trend:'down', provider:'AWS' },
  { id:'us-west-1',      name:'US West 1',        code:'SFO', lat:37.7,  lng:-122.4, carbon:148, renewable:68, load:44, waterStress:0.3, state:'yellow', lastDecision:'PASS',         trend:'up',   provider:'AWS' },
  { id:'us-east-1',      name:'US East 1',        code:'IAD', lat:38.9,  lng:-77.0,  carbon:110, renewable:54, load:79, waterStress:0.3, state:'green',  lastDecision:'PASS',         trend:'flat', provider:'AWS' },
  { id:'us-east-2',      name:'US East 2',        code:'CMH', lat:39.9,  lng:-82.9,  carbon:128, renewable:48, load:55, waterStress:0.3, state:'green',  lastDecision:'DEFER_JOB',   trend:'down', provider:'AWS' },
  { id:'ca-central-1',   name:'CA Central',       code:'YUL', lat:45.5,  lng:-73.6,  carbon:14,  renewable:97, load:88, waterStress:0.1, state:'green',  lastDecision:'SHIFT_REGION', trend:'down', provider:'AWS' },
  { id:'eu-west-1',      name:'EU West 1',        code:'DUB', lat:53.3,  lng:-6.3,   carbon:205, renewable:72, load:55, waterStress:0.1, state:'yellow', lastDecision:'DEFER_JOB',   trend:'up',   provider:'AWS' },
  { id:'ap-southeast-1', name:'AP Southeast',     code:'SIN', lat:1.35,  lng:103.8,  carbon:480, renewable:12, load:82, waterStress:0.7, state:'red',    lastDecision:'HOLD',         trend:'up',   provider:'AWS' },
  { id:'ap-northeast-1', name:'AP Northeast',     code:'NRT', lat:35.7,  lng:139.7,  carbon:390, renewable:28, load:75, waterStress:0.5, state:'red',    lastDecision:'THROTTLE',     trend:'up',   provider:'AWS' },
]

const REASONS = [
  'Carbon intensity above threshold — routing to low-carbon region',
  'Renewable availability >90% — opportunistic shift executed',
  'Marginal emissions elevated — deferring non-urgent batch job',
  'Water stress critical — throttling GPU cluster',
  'Green window opened — scheduling deferred jobs now',
  'Budget ceiling approaching — reducing parallelism to 40%',
  'All policy signals clear — execution approved immediately',
  'Cross-region latency acceptable — shifting to ca-central',
]

const ACTIONS: RouterAction[] = ['SHIFT_REGION','DEFER_JOB','THROTTLE','HOLD','PASS','PASS','PASS']

function uuid() { return Math.random().toString(36).slice(2,10) + Date.now().toString(36) }
function hashLike() { return Array.from({length:16},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('') }
function clamp(v:number,min:number,max:number){ return Math.min(max,Math.max(min,v)) }
function rand(a:number,b:number){ return Math.random()*(b-a)+a }

function stateColor(s:RegionState){ return s==='green'?'#4ade80':s==='yellow'?'#fbbf24':'#f87171' }
function actionColor(a:RouterAction){
  return {SHIFT_REGION:'#38bdf8',DEFER_JOB:'#a78bfa',THROTTLE:'#fbbf24',HOLD:'#f87171',PASS:'#4ade80'}[a]
}
function actionLabel(a:RouterAction){
  return {SHIFT_REGION:'REROUTE',DEFER_JOB:'DELAY',THROTTLE:'THROT',HOLD:'DENY',PASS:'RUN'}[a]
}
function fmtTime(ts:number){ return new Date(ts).toLocaleTimeString('en-CA',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}) }

// Map internal Region to GlobeZone RegionNode format
function mapToRegionNode(r: Region, status: 'optimal' | 'acceptable' | 'stressed' | 'critical'): import('@/components/co2-control-panel/types').RegionNode {
  return {
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    carbonIntensity: r.carbon,
    renewablePercentage: r.renewable,
    activeDecisions: r.load > 50 ? 3 : 1,
    totalSaved: Math.round(r.carbon * 0.1),
    status,
  }
}

// Generate animated routing arcs from recent decisions
function generateArcs(regions: Region[], recentDecisions: Decision[]): import('@/components/co2-control-panel/types').RoutingArc[] {
  const arcs: import('@/components/co2-control-panel/types').RoutingArc[] = []
  const statusMap: Record<RegionState, 'optimal' | 'acceptable' | 'stressed' | 'critical'> = {
    green: 'optimal',
    yellow: 'acceptable',
    red: 'critical',
  }
  
  // Create arcs from decisions that involve region shifts
  recentDecisions.forEach((decision, idx) => {
    if (decision.action === 'SHIFT_REGION' && idx < 5) {
      const fromRegion = regions.find(r => r.id === decision.regionId)
      const toRegion = regions.find(r => r.state === 'green' && r.id !== decision.regionId)
      
      if (fromRegion && toRegion) {
        arcs.push({
          id: `arc-${decision.id}`,
          from: mapToRegionNode(fromRegion, statusMap[fromRegion.state]),
          to: mapToRegionNode(toRegion, statusMap[toRegion.state]),
          decisions: [{
            id: decision.id,
            timestamp: decision.timestamp,
            fromRegion: fromRegion.id,
            toRegion: toRegion.id,
            workloadType: 'compute',
            baselineCarbon: decision.carbon,
            selectedCarbon: Math.round(decision.carbon * 0.6),
            delta: decision.savings,
            proofHash: decision.proofHash,
            status: 'active',
            latency: 45,
            cost: 0.8,
            waterUsage: 12,
          }],
          totalVolume: 1,
          carbonSaved: decision.savings,
          animated: true,
        })
      }
    }
  })
  
  // Add some inter-region arcs for visual effect
  const greenRegions = regions.filter(r => r.state === 'green')
  for (let i = 0; i < greenRegions.length - 1 && i < 3; i++) {
    const from = greenRegions[i]
    const to = greenRegions[i + 1]
    arcs.push({
      id: `inter-${from.id}-${to.id}`,
      from: mapToRegionNode(from, 'optimal'),
      to: mapToRegionNode(to, 'optimal'),
      decisions: [],
      totalVolume: 2,
      carbonSaved: 5.2,
      animated: true,
    })
  }
  
  return arcs
}

function tickRegions(regions:Region[]): Region[] {
  return regions.map(r => {
    const dC = rand(-18,18)
    const carbon = Math.round(clamp(r.carbon+dC,14,520))
    const load   = Math.round(clamp(r.load+rand(-4,4),10,98))
    const state: RegionState = carbon<200?'green':carbon<380?'yellow':'red'
    const action: RouterAction = state==='green'?(Math.random()>0.7?'SHIFT_REGION':'PASS')
                               : state==='yellow'?(Math.random()>0.5?'DEFER_JOB':'THROTTLE')
                               : (Math.random()>0.5?'HOLD':'THROTTLE')
    return {...r, carbon, load, state, lastDecision:action, trend:dC>2?'up':dC<-2?'down':'flat'}
  })
}

function makeDecision(r:Region): Decision {
  return {
    id: uuid(), regionId:r.id, regionName:r.name, action:r.lastDecision,
    reason: REASONS[Math.floor(Math.random()*REASONS.length)],
    carbon:r.carbon, savings:Math.round(rand(0.4,18.2)*10)/10,
    timestamp:Date.now(), confidence:Math.round(rand(72,99)), proofHash:hashLike(),
  }
}

function calcMetrics(regions:Region[], decisions:Decision[]): SystemMetrics {
  return {
    totalSavings:   Math.round(decisions.reduce((s,d)=>s+d.savings,0)*10)/10,
    decisionsToday: decisions.length,
    avgCarbon:      Math.round(regions.reduce((s,r)=>s+r.carbon,0)/regions.length),
    uptimePct:      99.94,
    activeRegions:  regions.filter(r=>r.state!=='red').length,
    alertCount:     regions.filter(r=>r.state==='red').length,
  }
}

// ─── Tier lock overlay ────────────────────────────────────────────────────────

function TierLock({ tier, onClose }: { tier: 'pro'|'elite'; onClose: ()=>void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(3,7,18,0.88)',backdropFilter:'blur(16px)'}}>
      <div className="w-full max-w-md rounded-[32px] border border-white/12 p-8" style={{background:'linear-gradient(180deg,rgba(13,17,28,0.99),rgba(5,8,16,0.99))'}}>
        <div className="text-[10px] uppercase tracking-[0.28em] mb-4" style={{color:'#38bdf8'}}>
          {tier === 'pro' ? 'PRO TIER' : 'ELITE TIER'}
        </div>
        <h2 className="text-3xl font-black tracking-[-0.04em] text-white mb-4">
          {tier === 'pro' ? 'Unlock Pro access' : 'Unlock Elite access'}
        </h2>
        <p className="text-sm leading-7 text-slate-300 mb-6">
          {tier === 'pro'
            ? 'Pro includes signal provider feeds, full decision history, policy editor, and multi-region replay.'
            : 'Elite adds trace rail, audit exports, compliance reports, SAIQ weight editor, and Ghost Mode.'}
        </p>
        <div className="flex gap-3">
          <Link href="/access"
            className="flex-1 rounded-2xl py-3 text-center text-sm font-bold uppercase tracking-[0.18em] text-slate-950"
            style={{background:'linear-gradient(135deg,#6ee7b7,#38bdf8)'}}>
            Request pilot access
          </Link>
          <button onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-slate-400 transition hover:text-white">
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LivePage() {
  const [tier, setTier]         = useState<Tier>('freeview')
  const [lockTarget, setLock]   = useState<'pro'|'elite'|null>(null)
  const [regions, setRegions]   = useState<Region[]>(INITIAL_REGIONS)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [metrics, setMetrics]   = useState<SystemMetrics>({totalSavings:0,decisionsToday:0,avgCarbon:247,uptimePct:99.94,activeRegions:6,alertCount:2})
  const [selected, setSelected] = useState<Region|null>(null)
  const [paused, setPaused]     = useState(false)
  const [time, setTime]         = useState(Date.now())
  const tickRef                 = useRef<ReturnType<typeof setInterval>>()

  // Clock
  useEffect(() => {
    const t = setInterval(()=>setTime(Date.now()),1000)
    return ()=>clearInterval(t)
  },[])

  // Simulation tick
  const tick = useCallback(()=>{
    setRegions(prev=>{
      const next = tickRegions(prev)
      const newDec: Decision[] = []
      next.forEach(r=>{ if(Math.random()>0.55){ newDec.push(makeDecision(r)) } })
      setDecisions(p=>[...newDec,...p].slice(0,120))
      setMetrics(calcMetrics(next, newDec))
      return next
    })
  },[])

  useEffect(()=>{
    if(paused){ clearInterval(tickRef.current); return }
    tickRef.current = setInterval(tick, 2400)
    return ()=>clearInterval(tickRef.current)
  },[tick,paused])

  const handleTierClick = (t: Tier) => {
    if(t==='pro'||t==='elite'){ setLock(t); return }
    setTier(t)
  }

  const pendingCount = decisions.filter(d=>d.action==='HOLD'||d.action==='DEFER_JOB').length
  const activeCount  = regions.filter(r=>r.state==='green').length
  const marginalCount= regions.filter(r=>r.state==='yellow').length
  const blockedCount = regions.filter(r=>r.state==='red').length

  // Map regions to GlobeZone format with proper status
  const statusMap: Record<RegionState, 'optimal' | 'acceptable' | 'stressed' | 'critical'> = {
    green: 'optimal',
    yellow: 'acceptable',
    red: 'critical',
  }
  
  const regionNodes = useMemo(() => 
    regions.map(r => mapToRegionNode(r, statusMap[r.state])),
    [regions]
  )
  
  const routingArcs = useMemo(() => 
    generateArcs(regions, decisions.slice(0, 10)),
    [regions, decisions]
  )

  return (
    <div className="flex flex-col min-h-screen" style={{background:'#060d18',color:'#e2e8f0',fontFamily:'monospace'}}>
      {lockTarget && <TierLock tier={lockTarget} onClose={()=>setLock(null)}/>}

      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 gap-4"
        style={{borderBottom:'1px solid rgba(56,189,248,0.07)',background:'rgba(6,13,24,0.95)',backdropFilter:'blur(24px)'}}>

        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35"/>
            <circle cx="16" cy="16" r="9"  stroke="#2dd4bf" strokeWidth="1.5" opacity="0.55"/>
            <circle cx="16" cy="16" r="4"  fill="#38bdf8"/>
            <line x1="16" y1="2"  x2="16" y2="7"  stroke="#38bdf8" strokeWidth="1.5" opacity="0.6"/>
            <line x1="16" y1="25" x2="16" y2="30" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6"/>
            <line x1="2"  y1="16" x2="7"  y2="16" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6"/>
            <line x1="25" y1="16" x2="30" y2="16" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6"/>
          </svg>
          <div>
            <div className="text-sm font-bold tracking-wide" style={{color:'#e2e8f0',letterSpacing:'0.06em'}}>HaloGrid</div>
            <div className="text-[9px] tracking-widest" style={{color:'rgba(56,189,248,0.5)'}}>CO₂ ROUTER · COMMAND CENTER</div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="hidden md:flex items-center gap-5">
          {[
            {label:'PENDING',  value:pendingCount,  color:'#fbbf24'},
            {label:'ACTIVE',   value:activeCount,   color:'#4ade80'},
            {label:'MARGINAL', value:marginalCount, color:'#fbbf24'},
            {label:'BLOCKED',  value:blockedCount,  color:'#f87171'},
          ].map(k=>(
            <div key={k.label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{background:k.color,boxShadow:`0 0 8px ${k.color}`}}/>
              <span className="text-[10px] tracking-widest font-bold" style={{color:k.color}}>{k.value} {k.label}</span>
            </div>
          ))}
          <div className="hidden lg:block w-px h-4 bg-white/10"/>
          <span className="hidden lg:block text-[10px] tracking-widest" style={{color:'rgba(56,189,248,0.5)'}}>
            CARBON PRESSURE <span className="text-white">{metrics.avgCarbon} gCO₂/kWh</span>
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Tier selector */}
          <div className="flex gap-0.5 rounded-xl p-0.5" style={{background:'rgba(255,255,255,0.03)'}}>
            {(['freeview','pro','elite'] as const).map(t=>(
              <button key={t} onClick={()=>handleTierClick(t)}
                className="px-3 py-1 rounded-[10px] text-[9px] tracking-widest uppercase transition-all flex items-center gap-1"
                style={{
                  background: tier===t?'rgba(56,189,248,0.15)':'transparent',
                  color: tier===t?'#38bdf8':'#64748b',
                  boxShadow: tier===t?'0 0 8px rgba(56,189,248,0.2)':undefined,
                }}>
                {t==='pro'&&<span style={{color:'#fbbf24',fontSize:8}}>🔒</span>}
                {t==='elite'&&<span style={{color:'#a78bfa',fontSize:8}}>🔒</span>}
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Pause */}
          <button onClick={()=>setPaused(p=>!p)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all text-xs"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:paused?'#38bdf8':'#64748b'}}>
            {paused?'▶':'⏸'}
          </button>
          {/* Clock */}
          <span className="text-[10px] tabular-nums ml-1" style={{color:'rgba(56,189,248,0.4)'}}>
            {new Date(time).toLocaleTimeString('en-CA',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})} EDT
          </span>
          {/* Back to site */}
          <Link href="/" className="ml-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] tracking-widest text-slate-400 transition hover:text-white uppercase">
            ← Site
          </Link>
        </div>
      </header>

      {/* Carbon pressure bar */}
      <div className="flex-shrink-0 px-5 py-2 flex items-center gap-4" style={{borderBottom:'1px solid rgba(255,255,255,0.04)',background:'rgba(6,13,24,0.7)'}}>
        <span className="text-[9px] tracking-widest text-slate-500">CARBON PRESSURE</span>
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.05)'}}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width:`${Math.min(100,(metrics.avgCarbon/620)*100)}%`,
              background: metrics.avgCarbon<200?'#4ade80':metrics.avgCarbon<380?'#fbbf24':'#f87171',
            }}/>
        </div>
        <span className="text-[9px] tabular-nums text-slate-300">{metrics.avgCarbon} gCO₂/kWh</span>
        <span className="text-[9px] tracking-widest" style={{color:'rgba(56,189,248,0.5)'}}>DECISION VELOCITY</span>
        <span className="text-[10px] font-bold tabular-nums" style={{color:'#38bdf8'}}>{(decisions.length/4).toFixed(1)}/min</span>
      </div>

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden" style={{minHeight:0}}>

        {/* Left panel — Live Regions */}
        <aside className="flex-shrink-0 overflow-y-auto scrollbar-thin py-3 px-3"
          style={{width:220,borderRight:'1px solid rgba(56,189,248,0.08)',background:'rgba(6,13,24,0.6)'}}>
          <div className="text-[9px] tracking-widest mb-3 px-1" style={{color:'#64748b'}}>LIVE REGIONS</div>
          <div className="space-y-1">
            {regions.map(r=>(
              <button key={r.id} onClick={()=>setSelected(s=>s?.id===r.id?null:r)}
                className="w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200"
                style={{
                  background: selected?.id===r.id?'rgba(56,189,248,0.08)':'rgba(255,255,255,0.02)',
                  border:`1px solid ${selected?.id===r.id?'rgba(56,189,248,0.2)':'rgba(255,255,255,0.04)'}`,
                }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{background:stateColor(r.state),boxShadow:`0 0 5px ${stateColor(r.state)}`}}/>
                    <span className="text-xs font-medium truncate" style={{maxWidth:110,color:'#e2e8f0'}}>{r.name}</span>
                  </div>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{background:`${actionColor(r.lastDecision)}18`,color:actionColor(r.lastDecision)}}>
                    {actionLabel(r.lastDecision)}
                  </span>
                </div>
                <div className="w-full h-px rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full"
                    style={{width:`${Math.min(100,(r.carbon/620)*100)}%`,background:stateColor(r.state),transition:'width 1s'}}/>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px]" style={{color:'#64748b'}}>{r.carbon}g</span>
                  <span className="text-[9px]" style={{color:'#64748b'}}>load {r.load}%</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Globe / center */}
        <main className="flex-1 flex flex-col relative overflow-hidden" style={{ minHeight: 0 }}>
          {/* 3D Globe Visualization */}
          <div className="flex-1 relative">
            <GlobeZone 
              regions={regionNodes}
              arcs={routingArcs}
              onRegionClick={(region) => {
                const r = regions.find(reg => reg.id === region.id)
                if (r) setSelected(r)
              }}
            />
            
            {/* Globe overlay - Latest decision */}
            {decisions[0] && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-[24px] border border-white/8 bg-slate-950/80 backdrop-blur-sm p-4 text-left max-w-md">
                <div className="text-[9px] tracking-widest mb-2" style={{color:'#64748b'}}>LATEST DECISION</div>
                <div className="text-xs font-mono" style={{color:'#38bdf8'}}>frm-{decisions[0].proofHash.slice(0,12)}…</div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold" style={{color:actionColor(decisions[0].action)}}>
                    {actionLabel(decisions[0].action)}
                  </span>
                  <span className="text-xs text-slate-400 truncate">{decisions[0].regionName}</span>
                  <span className="ml-auto text-[9px] tabular-nums" style={{color:'#64748b'}}>{fmtTime(decisions[0].timestamp)}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400 truncate">{decisions[0].reason}</p>
              </div>
            )}

          {/* Selected region detail */}
          {selected && (
            <div className="absolute bottom-6 left-6 right-6 rounded-[28px] border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl"
              style={{boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[9px] tracking-widest mb-1" style={{color:'#64748b'}}>REGION DETAIL</div>
                  <div className="text-xl font-bold text-white">{selected.name}</div>
                  <div className="text-xs mt-1" style={{color:'#64748b'}}>Provider: {selected.provider} · {selected.code}</div>
                </div>
                <button onClick={()=>setSelected(null)} className="text-slate-500 hover:text-white text-lg">✕</button>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  {l:'Carbon',  v:`${selected.carbon} gCO₂/kWh`, c:stateColor(selected.state)},
                  {l:'Renewable',v:`${selected.renewable}%`,      c:'#4ade80'},
                  {l:'Load',    v:`${selected.load}%`,            c:'#fbbf24'},
                  {l:'Decision',v:actionLabel(selected.lastDecision), c:actionColor(selected.lastDecision)},
                ].map(k=>(
                  <div key={k.l} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="text-[9px] tracking-widest mb-1 text-slate-500">{k.l}</div>
                    <div className="text-sm font-bold" style={{color:k.c}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right panel — Decision stream */}
      <aside className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{width:300,borderLeft:'1px solid rgba(56,189,248,0.08)',background:'rgba(6,13,24,0.6)'}}>
          <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0"
            style={{borderBottom:'1px solid rgba(56,189,248,0.06)'}}>
            <span className="text-[9px] tracking-widest" style={{color:'#64748b'}}>DECISION STREAM</span>
            <span className="text-[9px]" style={{color:'rgba(56,189,248,0.5)'}}>{decisions.length} frames</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-1.5">
            {decisions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <div className="w-5 h-5 rounded-full animate-spin"
                  style={{border:'2px solid rgba(56,189,248,0.2)',borderTopColor:'rgba(56,189,248,0.8)'}}/>
                <span className="text-[10px]" style={{color:'rgba(100,116,139,0.5)'}}>Waiting for decisions…</span>
              </div>
            )}
            {decisions.slice(0,30).map((d,i)=>(
              <div key={d.id}
                className="rounded-xl px-3 py-2.5 transition-all"
                style={{
                  background:'rgba(255,255,255,0.02)',
                  border:`1px solid ${i===0?actionColor(d.action)+'22':'rgba(255,255,255,0.04)'}`,
                  opacity: Math.max(0.3, 1 - i*0.028),
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{background:actionColor(d.action),boxShadow:i===0?`0 0 6px ${actionColor(d.action)}`:'none'}}/>
                  <span className="text-[10px] font-bold flex-shrink-0" style={{color:actionColor(d.action)}}>
                    {actionLabel(d.action)}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate flex-1">{d.regionName}</span>
                  <span className="text-[9px] tabular-nums flex-shrink-0" style={{color:'#475569'}}>{fmtTime(d.timestamp)}</span>
                </div>
                <p className="text-[10px] leading-4 text-slate-500 truncate">{d.reason}</p>
                {i===0&&(
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] font-mono" style={{color:'rgba(56,189,248,0.4)'}}>frm-{d.proofHash.slice(0,10)}…</span>
                    <span className="text-[9px]" style={{color:'rgba(100,116,139,0.4)'}}>conf {d.confidence}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pro/Elite lock tease */}
          <div className="flex-shrink-0 p-3" style={{borderTop:'1px solid rgba(56,189,248,0.06)'}}>
            <button onClick={()=>setLock('pro')}
              className="w-full rounded-2xl border border-amber-400/20 bg-amber-400/5 py-3 text-[10px] tracking-widest text-amber-300 transition hover:bg-amber-400/10">
              🔒 UNLOCK PRO — Signal feeds · Policy editor · Replay
            </button>
          </div>
        </aside>

      </div>

      {/* System healthy bar */}
      <footer className="flex-shrink-0 flex items-center justify-between px-5 py-2 text-[9px] tracking-widest"
        style={{borderTop:'1px solid rgba(56,189,248,0.06)',background:'rgba(6,13,24,0.8)',color:'#475569'}}>
        <div className="flex items-center gap-4">
          <span>DECISIONS TODAY: <span className="text-slate-300">{metrics.decisionsToday}</span></span>
          <span>UPTIME: <span style={{color:'#4ade80'}}>99.94%</span></span>
          <span>SAVINGS: <span style={{color:'#4ade80'}}>{metrics.totalSavings} kg</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          <span style={{color:'#4ade80'}}>SYSTEM HEALTHY</span>
        </div>
      </footer>
    </div>
  )
}
