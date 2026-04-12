'use client'

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCommandCenterSnapshot, useDecisionTrace } from '@/lib/hooks/control-surface';
import type {
  WorldRegionState,
  WorldRoutingFlow,
  CommandCenterSnapshot,
  CommandCenterDecisionItem,
} from '@/types/control-surface';

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HOLOGRID CONTROL PLANE v13 — HYBRID MAP EDITION                         ║
 * ║  Pan/Zoom Mechanics | Always-On Labels | Interactive Topology            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const C = {
  allow: "#00d65f",
  deny: "#e60023",
  reroute: "#f5a623",
  gold: "#FFD700",
  bg0: "#020305",
  bg1: "#07090f",
  glass: "rgba(10, 12, 18, 0.4)",
  glassActive: "rgba(18, 22, 32, 0.65)",
  border: "rgba(255,255,255,0.06)",
  t0: "#ffffff",
  t1: "#c4c9d4",
  t2: "#757c91",
  t3: "#41485c",
  accent: "#0ea5e9",
  g: (c: string, o = 0.3) => {
    if (!c) return `rgba(255,255,255,${o})`;
    const r = parseInt(c.slice(1, 3), 16) || 255;
    const g = parseInt(c.slice(3, 5), 16) || 255;
    const b = parseInt(c.slice(5, 7), 16) || 255;
    return `rgba(${r},${g},${b},${o})`;
  },
};

const actionColor = (a: string) => {
  const safeA = (a || '').toLowerCase();
  if (safeA === 'run_now') return C.allow;
  if (safeA === 'deny' || safeA === 'throttle') return C.deny;
  if (safeA === 'reroute' || safeA === 'delay') return C.reroute;
  return C.accent;
};

const stateColor = (s: string) => {
  const safeS = (s || '').toLowerCase();
  return safeS === 'active' ? C.allow : safeS === 'blocked' ? C.deny : C.reroute;
};

// ─── ERROR BOUNDARY ───
class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean; error?: Error }> {
  state = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[HoloGrid Render Fault]:', error, info); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ─── ISOLATED CLOCK ───
const LiveClock = React.memo(function LiveClock() {
  const [time, setTime] = useState(() => new Date().toISOString().slice(11, 19));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ fontFamily: "var(--m)", fontSize: 12, color: C.t0, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
      {time}<span style={{ fontSize: 8, color: C.t3, marginLeft: 4 }}>UTC</span>
    </div>
  );
});

// ─── MEMOIZED INTERACTIVE MAP NODE ───
const MapNode = React.memo(({ 
  node, p, isPro, reducedMotion, isSelected, isHovered, onHover, onClick 
}: { 
  node: WorldRegionState, p: {x: number, y: number}, isPro: boolean, reducedMotion: boolean, 
  isSelected: boolean, isHovered: boolean, onHover: (id: string | null) => void, onClick: (id: string) => void 
}) => {
  const isFatal = node.state === "blocked";
  const col = isFatal ? C.deny : node.state === "active" ? C.allow : C.reroute;
  const pulseClass = isFatal ? "svgFlicker" : node.state === "active" ? "svgPulseFast" : "svgPulseSlow";

  return (
    <g 
      onMouseEnter={() => onHover(node.region)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onClick(node.region); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(node.region); } }}
      tabIndex={0}
      role="button"
      aria-label={`Region ${node.region}, Status ${node.state}`}
      style={{ cursor: "pointer", transition: "all 0.3s ease", outline: "none" }}
    >
      <circle cx={p.x} cy={p.y} r={28} fill="transparent" />
      
      {(isSelected || isHovered) && (
        <circle
          cx={p.x} cy={p.y} r={isHovered ? 14 : 18}
          fill="none" stroke={col} strokeWidth={1.5}
          style={{ opacity: 0.8, animation: isSelected && !reducedMotion ? "dashSpin 8s linear infinite" : "none", strokeDasharray: isSelected ? "4 4" : "none" }}
        />
      )}

      {isPro && node.state === "marginal" && !reducedMotion && (
        <circle cx={p.x} cy={p.y} r={22} fill="none" stroke={C.accent} strokeWidth={1} strokeDasharray="2 6" style={{ transformOrigin: `${p.x}px ${p.y}px`, animation: "dashSpin 6s linear infinite" }} />
      )}

      {/* Always-on Perplexity Style Labels */}
      <text x={p.x + 14} y={p.y + 3} fill={C.t0} fontSize={10} fontFamily="var(--m)" fontWeight="700" letterSpacing="0.05em" style={{ pointerEvents: "none", textShadow: `0 2px 4px rgba(0,0,0,0.8)` }}>
        {node.region.toUpperCase()}
      </text>
      <text x={p.x + 14} y={p.y + 14} fill={col} fontSize={7} fontFamily="var(--m)" letterSpacing="0.1em" style={{ pointerEvents: "none", textTransform: "uppercase" }}>
        {node.state}
      </text>

      <circle cx={p.x} cy={p.y} r={8} fill={col} style={{ animation: reducedMotion || !isPro ? "none" : `${pulseClass} 2s infinite` }} opacity={isPro ? 1 : 0.8} />
      <circle cx={p.x} cy={p.y} r={5} fill={col} stroke={C.bg0} strokeWidth={2} />
    </g>
  );
});
MapNode.displayName = "MapNode";

// ─── FULLSCREEN INTERACTIVE MAP ───
const InteractiveMap = React.memo(function InteractiveMap({
  nodes, flows, isPro, reducedMotion, hoveredRegion, setHoveredRegion, selectedRegion, setSelectedRegion,
  zoom, pan, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel
}: {
  nodes: WorldRegionState[]; flows: WorldRoutingFlow[]; isPro: boolean; reducedMotion: boolean;
  hoveredRegion: string | null; setHoveredRegion: (r: string | null) => void;
  selectedRegion: string | null; setSelectedRegion: (r: string | null) => void;
  zoom: number; pan: {x: number, y: number};
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}) {
  const GLOBE_R = 350; const GLOBE_CX = 500; const GLOBE_CY = 500;

  const projected = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of nodes) {
      const lon = (n.x / 100) * 360 - 180; const lat = 90 - (n.y / 100) * 180;
      const phi = (lat * Math.PI) / 180; const lambda = (lon * Math.PI) / 180;
      map.set(n.region, { x: GLOBE_CX + GLOBE_R * Math.cos(phi) * Math.sin(lambda), y: GLOBE_CY - GLOBE_R * Math.sin(phi) });
    }
    return map;
  }, [nodes]);

  const safeFlows = useMemo(() => flows.slice(0, 50), [flows]);
  let activeCometCount = 0; const cometBudget = reducedMotion ? 0 : 8; 

  return (
    <div 
      style={{ position: "absolute", inset: 0, overflow: "hidden", cursor: "grab", zIndex: 0 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Map Container that receives Pan and Zoom Transforms */}
      <motion.div 
        style={{ 
          width: "100%", height: "100%", 
          transformOrigin: "center center",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}
        animate={{ scale: zoom, x: pan.x, y: pan.y }}
        transition={{ type: "spring", stiffness: 400, damping: 40, mass: 0.5 }}
      >
        <div style={{ width: 1000, height: 1000, position: "relative" }}>
          
          {/* Subtle spinning globe background for Holo effect */}
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", animation: reducedMotion ? "none" : "slowSpin 240s linear infinite", pointerEvents: "none" }}>
            <svg viewBox="0 0 1000 1000" style={{ width: "100%", height: "100%", filter: isPro && !reducedMotion ? `drop-shadow(0 0 80px ${C.g(C.accent, 0.15)})` : 'none' }}>
              <defs>
                <radialGradient id="globeGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor={C.g(C.accent, isPro ? 0.05 : 0.02)} />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} fill="url(#globeGrad)" stroke={C.g(C.accent, 0.15)} strokeWidth="1" strokeDasharray="4 12" />
            </svg>
          </div>

          {/* Static Layer for Interactive Nodes and Flows */}
          <svg viewBox="0 0 1000 1000" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            {/* Flows */}
            {safeFlows.map((flow) => {
              const pa = projected.get(flow.fromRegion); const pb = projected.get(flow.toRegion);
              if (!pa || !pb) return null;
              const mx = (pa.x + pb.x) / 2; const my = (pa.y + pb.y) / 2 - 60;
              const pathD = `M${pa.x},${pa.y} Q${mx},${my} ${pb.x},${pb.y}`;

              if (flow.mode === "blocked") {
                return <path key={flow.id} d={pathD} fill="none" stroke={C.deny} strokeWidth="1.5" strokeDasharray={isPro ? "4 6" : "2 2"} opacity={0.4} />;
              }
              const renderComet = isPro && activeCometCount < cometBudget;
              if (renderComet) activeCometCount++;
              return (
                <g key={flow.id}>
                  <path d={pathD} fill="none" stroke={C.g(C.accent, 0.1)} strokeWidth="2" />
                  {renderComet && <path d={pathD} fill="none" stroke={C.accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="15 400" style={{ animation: "flowComet 3s cubic-bezier(0.4, 0, 0.2, 1) infinite" }} />}
                </g>
              );
            })}

            {/* Nodes - Enable pointer events only on nodes so drag works everywhere else */}
            <g style={{ pointerEvents: "auto" }}>
              {nodes.map(node => {
                const p = projected.get(node.region);
                if (!p) return null;
                return (
                  <MapNode 
                    key={node.region} node={node} p={p} isPro={isPro} reducedMotion={reducedMotion}
                    isSelected={selectedRegion === node.region} isHovered={hoveredRegion === node.region}
                    onHover={setHoveredRegion} onClick={(id) => setSelectedRegion(selectedRegion === id ? null : id)}
                  />
                );
              })}
            </g>
          </svg>

        </div>
      </motion.div>
    </div>
  );
});

// ─── MAP ZOOM CONTROLS WIDGET ───
function ZoomControls({ zoomIn, zoomOut, isPanelOpen }: { zoomIn: () => void, zoomOut: () => void, isPanelOpen: boolean }) {
  return (
    <motion.div 
      initial={false}
      animate={{ right: isPanelOpen ? 540 : 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ position: "absolute", bottom: 40, zIndex: 100, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <button 
        onClick={zoomIn} 
        style={{ width: 44, height: 44, background: C.glassActive, backdropFilter: "blur(12px)", border: `1px solid ${C.border}`, borderRadius: "50%", color: C.t0, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 4px 12px rgba(0,0,0,0.5)` }}
      >
        +
      </button>
      <button 
        onClick={zoomOut} 
        style={{ width: 44, height: 44, background: C.glassActive, backdropFilter: "blur(12px)", border: `1px solid ${C.border}`, borderRadius: "50%", color: C.t0, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 4px 12px rgba(0,0,0,0.5)` }}
      >
        −
      </button>
    </motion.div>
  );
}

// ─── UTILITY COMPONENTS ───
function Plate({ title, children, delay, isPro, reducedMotion }: { title: string; children: ReactNode; delay: number; isPro: boolean; reducedMotion: boolean; }) {
  if (!isPro) {
    return (
      <div style={{ background: C.g(C.bg1, 0.9), border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px", marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--m)", fontSize: 10, color: C.t3, letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 10, borderRadius: 1, background: C.accent, opacity: 0.4 }} />{title}
        </div>
        {children}
      </div>
    );
  }
  
  const springConfig = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8, delay };
  
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 20, filter: "blur(10px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 10, filter: "blur(5px)" }}
      transition={reducedMotion ? { duration: 0 } : springConfig}
      style={{ background: `linear-gradient(135deg, ${C.glassActive} 0%, ${C.glass} 100%)`, backdropFilter: "blur(32px)", border: `1px solid ${C.border}`, borderTop: `1px solid rgba(255,255,255,0.18)`, borderRadius: 16, padding: "20px 24px", marginBottom: 16, boxShadow: `0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)` }}
    >
      <div style={{ fontFamily: "var(--m)", fontSize: 9, color: C.t2, letterSpacing: "0.15em", marginBottom: 14, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 10, borderRadius: 1, background: C.accent, opacity: 0.6 }} />{title}
      </div>
      {children}
    </motion.div>
  );
}

function Row({ label, value, color, highlight }: { label: string; value: ReactNode; color?: string; highlight?: boolean; }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.g("#fff", 0.03)}` }}>
      <span style={{ fontSize: 10, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--m)", flexShrink: 0, marginRight: 10 }}>{label}</span>
      <span style={{ fontSize: highlight ? 14 : 12, color: color || C.t1, fontFamily: "var(--m)", fontWeight: highlight ? 700 : 500, fontVariantNumeric: "tabular-nums", textShadow: highlight && color ? `0 0 16px ${C.g(color, 0.6)}` : "none", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function VitalCell({ label, value, color }: { label: string; value: string; color?: string; }) {
  return (
    <div style={{ textAlign: "center", minWidth: 56 }}>
      <div style={{ fontFamily: "var(--m)", fontSize: 13, fontWeight: 700, color: color || C.t0, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "var(--m)", fontSize: 7, color: C.t3, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ─── MASTER SHELL COMPONENT ───
export function CommandCenterShell() {
  const snapshotQuery = useCommandCenterSnapshot();
  const snapshot = snapshotQuery.data;

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [tier, setTier] = useState<'public' | 'pro'>('pro');
  
  // Interactive Map State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const reducedMotion = useReducedMotion();
  const [cachedFrame, setCachedFrame] = useState<CommandCenterDecisionItem | null>(null);

  // Pan & Zoom Handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    setZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 0.5), 3));
  }, []);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5));

  useEffect(() => {
    if (!snapshot || !selectedRegion) return;
    const frame = snapshot.decisionCore.recentDecisions.find(f => f.selectedRegion === selectedRegion);
    if (frame) setCachedFrame(frame);
  }, [snapshot, selectedRegion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedRegion(null); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (snapshotQuery.isLoading) {
    return <div style={{ padding: 40, color: C.t1, fontFamily: "var(--m)", background: C.bg0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Booting Live Theater...</div>;
  }

  if (!snapshot || !snapshot.decisionCore) {
    return (
      <div style={{ padding: 40, color: C.deny, fontFamily: "var(--m)", background: C.bg0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>SYSTEM OFFLINE</div>
        <div style={{ fontSize: 12, color: C.t2 }}>Command center snapshot unavailable. Check engine connectivity.</div>
      </div>
    );
  }

  const isPro = tier === 'pro';
  const activeNodes = snapshot.world.nodes.filter(n => n.state === 'active').length;
  const blockedNodes = snapshot.world.nodes.filter(n => n.state === 'blocked').length;
  const activeFlows = snapshot.world.flows.filter(f => f.mode === 'route').length;
  const activeFrame = selectedRegion ? cachedFrame : null;

  return (
    <ErrorBoundary
      fallback={
        <div style={{ background: C.bg0, color: C.deny, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 14 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>HOLOGRID FAULT ISOLATED</div>
            <div style={{ color: C.t2 }}>Execution plane encountered a critical render fault.</div>
          </div>
        </div>
      }
    >
      <div style={{ background: C.bg0, color: C.t1, height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
          :root{--m:'JetBrains Mono',monospace}
          @keyframes slowSpin { to { transform: rotateZ(-360deg); } }
          @keyframes svgPulseFast { 0%, 100% { r: 7px; opacity: 0.6; } 50% { r: 12px; opacity: 1; } }
          @keyframes svgPulseSlow { 0%, 100% { r: 6px; opacity: 0.3; } 50% { r: 9px; opacity: 0.7; } }
          @keyframes svgFlicker { 0%, 100% { opacity: 1; } 15%, 45%, 75% { opacity: 0.1; } 30%, 60% { opacity: 0.9; } }
          @keyframes flowComet { to { stroke-dashoffset: -415; } }
          @keyframes dashSpin { to { transform: rotate(360deg); } }
          @keyframes goldShimmer { 0%, 100% { opacity: 0.8; box-shadow: 0 0 16px rgba(255, 215, 0, 0.15); } 50% { opacity: 1; box-shadow: 0 0 24px rgba(255, 215, 0, 0.4); } }
          @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
          @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }
          ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${C.g("#fff", 0.1)}; border-radius: 4px; }
        `}</style>

        {/* Deep Space Background Grid */}
        {isPro && <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `linear-gradient(to right, ${C.g("#fff", 0.015)} 1px, transparent 1px), linear-gradient(to bottom, ${C.g("#fff", 0.015)} 1px, transparent 1px)`, backgroundSize: "60px 60px", maskImage: "radial-gradient(circle at center, black 20%, transparent 90%)" }} />}
        
        {/* Ambient Scanline */}
        {isPro && !reducedMotion && <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}><div style={{ position: "absolute", width: "100%", height: 1, background: `linear-gradient(90deg, transparent, ${C.g(C.accent, 0.08)}, transparent)`, animation: "scanline 8s linear infinite" }} /></div>}

        {/* INTERACTIVE MAP LAYER */}
        <InteractiveMap
          nodes={snapshot.world.nodes} flows={snapshot.world.flows} isPro={isPro} reducedMotion={reducedMotion}
          hoveredRegion={hoveredRegion} setHoveredRegion={setHoveredRegion} selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion}
          zoom={zoom} pan={pan} handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove} handlePointerUp={handlePointerUp} handleWheel={handleWheel}
        />

        {/* ZOOM CONTROLS */}
        <ZoomControls zoomIn={handleZoomIn} zoomOut={handleZoomOut} isPanelOpen={!!selectedRegion} />

        {/* HUD HEADER */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, background: isPro ? `linear-gradient(180deg, ${C.bg1}f0 0%, transparent 100%)` : C.bg1, backdropFilter: isPro ? "blur(10px)" : "none", pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: snapshot.header.systemActive ? C.allow : snapshot.header.systemActive === false ? C.deny : C.reroute, boxShadow: isPro ? `0 0 16px ${snapshot.header.systemActive ? C.allow : C.deny}` : "none" }} />
            <span style={{ fontFamily: "var(--m)", fontSize: 13, fontWeight: 700, color: C.t0, letterSpacing: "0.2em" }}>CO2 ROUTER</span>
            <span style={{ fontFamily: "var(--m)", fontSize: 8, color: C.t3, letterSpacing: "0.1em", padding: "2px 7px", background: C.g(C.accent, 0.08), border: `1px solid ${C.g(C.accent, 0.15)}`, borderRadius: 4 }}>v13 MAP HYBRID</span>
          </div>

          {isPro && (
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "3px 16px", background: C.g(C.bg0, 0.5), border: `1px solid ${C.g("#fff", 0.04)}`, borderRadius: 8 }}>
              <VitalCell label="REGIONS" value={`${activeNodes}/${snapshot.world.nodes.length}`} color={blockedNodes > 0 ? C.reroute : C.allow} />
              <div style={{ width: 1, height: 20, background: C.g("#fff", 0.06) }} />
              <VitalCell label="ROUTES" value={String(activeFlows)} />
              <div style={{ width: 1, height: 20, background: C.g("#fff", 0.06) }} />
              <VitalCell label="SAIQ" value={snapshot.header.saiqEnforced ? "ON" : "OFF"} color={snapshot.header.saiqEnforced ? C.allow : C.t3} />
              <div style={{ width: 1, height: 20, background: C.g("#fff", 0.06) }} />
              <VitalCell label="TRACE" value={snapshot.header.traceLocked ? "LOCKED" : "OPEN"} color={snapshot.header.traceLocked ? C.allow : C.reroute} />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LiveClock />
            <div style={{ display: "flex", background: C.g("#000", 0.5), borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden", fontFamily: "var(--m)", fontSize: 10 }}>
              <button type="button" onClick={() => setTier("public")} style={{ padding: "5px 14px", background: !isPro ? C.t3 : "transparent", color: !isPro ? C.t0 : C.t2, border: "none", cursor: "pointer" }}>PUBLIC</button>
              <button type="button" onClick={() => setTier("pro")} style={{ padding: "5px 14px", background: isPro ? C.accent : "transparent", color: isPro ? C.bg0 : C.t2, fontWeight: isPro ? 700 : 400, border: "none", cursor: "pointer" }}>PRO</button>
            </div>
          </div>
        </div>

        {/* ACTIVE FRAME INSPECTOR */}
        <AnimatePresence mode="wait">
          {selectedRegion && activeFrame && (
            <motion.div
              key={selectedRegion}
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ position: "absolute", right: 40, top: 80, bottom: 40, width: 480, zIndex: 50, overflowY: "auto", paddingRight: 10, pointerEvents: "auto" }}
            >
              <motion.div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ maxWidth: "80%" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: C.t0, letterSpacing: "-0.02em", textShadow: isPro ? `0 0 40px ${C.g(C.t0, 0.2)}` : "none", lineHeight: 1.2, wordBreak: "break-all" }}>
                      {(activeFrame.selectedRegion ?? "UNKNOWN").slice(0, 40).toUpperCase()} NODE
                    </div>
                    <div style={{ fontFamily: "var(--m)", fontSize: 11, color: actionColor(activeFrame.action), marginTop: 6, letterSpacing: "0.12em", wordBreak: "break-all" }}>
                      LATEST EVENT: {(activeFrame.action ?? "UNKNOWN").slice(0, 40).toUpperCase().replace('_', ' ')}
                    </div>
                  </div>
                  <button onClick={() => setSelectedRegion(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "50%", width: 32, height: 32, color: C.t2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              </motion.div>

              <Plate title="Decision Core" delay={0.05} isPro={isPro} reducedMotion={reducedMotion}>
                <Row label="Frame ID" value={(activeFrame.decisionFrameId ?? "UNKNOWN").slice(0, 14) + "..."} />
                <Row label="Reason Code" value={(activeFrame.reasonCode ?? "N/A").slice(0, 60)} />
                <Row label="Action Taken" value={(activeFrame.action ?? "UNKNOWN").slice(0, 30).toUpperCase().replace('_', ' ')} color={actionColor(activeFrame.action)} highlight={isPro} />
                <Row label="Latency (Total)" value={activeFrame.latencyTotalMs != null ? `${activeFrame.latencyTotalMs}ms` : "--"} />
                <Row label="System State" value={(activeFrame.systemState ?? "UNKNOWN").slice(0, 20).toUpperCase()} color={stateColor(activeFrame.systemState)} highlight={isPro} />
              </Plate>

              <Plate title="Signal Intelligence" delay={0.08} isPro={isPro} reducedMotion={reducedMotion}>
                <Row label="Signal Mode" value={(activeFrame.signalMode ?? "UNKNOWN").slice(0, 20).toUpperCase()} color={activeFrame.signalMode === 'marginal' ? C.allow : activeFrame.signalMode === 'fallback' ? C.deny : C.accent} highlight={isPro} />
                <Row label="Accounting Method" value={(activeFrame.accountingMethod ?? "UNKNOWN").slice(0, 30).toUpperCase()} />
                <Row label="Water Authority" value={(activeFrame.waterAuthorityMode ?? "UNKNOWN").slice(0, 30).toUpperCase()} color={activeFrame.waterAuthorityMode === 'basin' ? C.allow : activeFrame.waterAuthorityMode === 'fallback' ? C.reroute : C.accent} />
              </Plate>

              <Plate title="Cryptographic Provenance" delay={0.15} isPro={isPro} reducedMotion={reducedMotion}>
                <Row label="Proof Hash" value={activeFrame.proofHash ? `${activeFrame.proofHash.slice(0, 16)}...` : "UNAVAILABLE"} color={activeFrame.proofHash ? C.t2 : C.deny} />
                <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
                  <div style={{ flex: 1, padding: "12px", textAlign: "center", background: activeFrame.proofHash ? C.g(C.gold, isPro ? 0.08 : 0.02) : C.g(C.t3, 0.1), border: `1px solid ${activeFrame.proofHash ? C.g(C.gold, isPro ? 0.3 : 0.1) : C.border}`, borderRadius: 8, animation: isPro && activeFrame.proofHash && !reducedMotion ? "goldShimmer 3s ease-in-out infinite" : "none" }}>
                    <div style={{ fontFamily: "var(--m)", fontSize: 10, color: activeFrame.proofHash ? C.gold : C.t3, letterSpacing: "0.1em", fontWeight: isPro ? 700 : 500 }}>
                      {activeFrame.proofHash ? "◆ SEALED LEDGER" : "UNSEALED"}
                    </div>
                  </div>
                </div>
              </Plate>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}