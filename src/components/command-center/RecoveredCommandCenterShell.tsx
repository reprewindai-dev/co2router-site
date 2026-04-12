'use client';

import React, { useState, useEffect } from 'react';
import './halogrid-command-center.css';
import { useCommandCenterSnapshot } from '@/lib/hooks/control-surface';
import type { CommandCenterSnapshot, WorldRegionState, WorldRoutingFlow } from '@/types/control-surface';
import { FALLBACK_COMMAND_CENTER_SNAPSHOT } from '@/lib/control-surface/fallbacks';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean; error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RecoveredCommandCenterShell error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="halogrid-app" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:'20px'}}>
          <div style={{color:'#fb7185'}}>Error loading Command Center</div>
          <div style={{color:'#64748b',fontSize:'12px'}}>{this.state.error?.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

const REGION_ANCHORS: Record<string, { label: string; x: number; y: number }> = {
  'us-west-2': { label: 'US West 2', x: 14, y: 25 },
  'us-west-1': { label: 'US West 1', x: 17, y: 28 },
  'us-east-2': { label: 'US East 2', x: 28, y: 23 },
  'us-east-1': { label: 'US East 1', x: 31, y: 26 },
  'eu-west-1': { label: 'EU West 1', x: 50, y: 22 },
  'eu-central-1': { label: 'EU Central 1', x: 56, y: 23 },
  'eu-north-1': { label: 'EU North 1', x: 57, y: 16 },
  'ap-southeast-1': { label: 'AP SouthEast 1', x: 79, y: 34 },
  'ap-northeast-1': { label: 'AP NorthEast 1', x: 83, y: 18 },
  'ca-central-1': { label: 'CA Central', x: 23, y: 20 },
}

function humanizeReason(code: string | null) {
  if (!code) return 'Unknown';
  return code.toLowerCase().split('_').map(w => w[0].toUpperCase()+w.slice(1)).join(' ');
}

function shortHash(h: string | null, len=12) {
  if (!h) return 'attaching';
  return h.length <= len ? h : h.slice(0,len)+'…';
}

function formatAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}) + ' EDT');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <div id="clock" className="label" style={{color:'#475569',fontSize:'11px',letterSpacing:'0.1em'}}>{time}</div>;
}

export default function RecoveredCommandCenterShell() {
  const { data: fetchedSnapshot, isLoading } = useCommandCenterSnapshot();
  const snapshot = fetchedSnapshot ?? FALLBACK_COMMAND_CENTER_SNAPSHOT;
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="halogrid-app" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        Booting Command Center...
      </div>
    );
  }

  // Derived state
  const selectedDecision = snapshot.decisionCore.recentDecisions.find(d => d.decisionFrameId === selectedFrameId) 
    || snapshot.decisionCore.selectedDecision 
    || snapshot.decisionCore.recentDecisions[0];

  const header = snapshot.header;
  const nodes = snapshot.world.nodes;
  const flows = snapshot.world.flows;
  const activeNodesCount = nodes.filter(n => n.state === 'active' || n.state === 'marginal').length;
  
  // Meta
  const metaLabel = selectedDecision?.action === 'run_now' ? 'run now' : selectedDecision?.action || 'unknown';
  const mainCardColor = selectedDecision?.action === 'deny' ? 'rgba(251,113,133,0.3)' : 'rgba(52,211,153,0.3)';

  return (
    <div className="halogrid-app">
      {/* TOPBAR */}
      <div className="topbar">
        <div className="topbar-logo">
          <svg viewBox="0 0 32 32" fill="none" width="32" height="32" aria-label="EcoBe logo">
            <circle cx="16" cy="16" r="14" stroke="#22d3ee" strokeWidth="1.5"/>
            <path d="M10 16 Q13 9 16 16 Q19 23 22 16" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            <circle cx="16" cy="16" r="2.5" fill="#22d3ee"/>
          </svg>
          <div>
            <div className="logo-text">EcoBe Engine</div>
            <div className="logo-sub">Command Center</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="live-badge"><span className="live-dot"></span> Live</div>
          <LiveClock />
        </div>
      </div>

      {/* COMMAND HEADER */}
      <section className="card-header" id="cmd-header">
        <div className="header-body">
          <div>
            <div className="label label-cyan" style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'12px'}}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
              Command Center
            </div>
            <h1 className="hero">Active global execution authority.</h1>
            <p style={{marginTop:'12px',maxWidth:'640px',fontSize:'14px',color:'#94a3b8',lineHeight:1.6}}>
              Decisions are issued before execution, water can block workloads, every frame is traceable,
              and replay stays pinned to the original decision inputs.
            </p>
            <div className="latency-strip">
              <span className="latency-chip lc-green">current warm path <strong>{snapshot.health.latency.samples ?? '--'}</strong>ms</span>
              <span className="latency-chip lc-amber">rolling p95 <strong>{snapshot.health.latency.p95TotalMs ?? '--'}</strong>ms</span>
            </div>
          </div>
          <div className="header-posture">
            <div className="label">Live posture</div>
            <div className={`status-text ${header.systemActive ? 'status-healthy' : 'status-degraded'}`}>{header.systemStatus}</div>
            <div style={{marginTop:'8px',maxWidth:'220px',fontSize:'12px',color:'#64748b',textAlign:'left'}}>
              {header.detail}
            </div>
          </div>
        </div>
        <div className="chip-row">
          <span className={`chip ${header.systemActive ? 'chip-emerald' : 'chip-neutral'}`}>System Active</span>
          <span className={`chip ${header.saiqEnforced ? 'chip-cyan' : 'chip-neutral'}`}>SAIQ Enforced</span>
          <span className={`chip ${header.traceLocked ? 'chip-emerald' : 'chip-neutral'}`}>Trace Locked</span>
          <span className={`chip ${header.replayVerified ? 'chip-emerald' : 'chip-neutral'}`}>Replay Verified</span>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="grid-main">
        <div className="col-left">

          {/* WORLD MAP */}
          <div className="world-map-wrap">
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',marginBottom:'16px'}}>
              <div>
                <div className="label" style={{marginBottom:'6px'}}>World execution grid</div>
                <div className="section" style={{fontSize:'16px'}}>Live routing posture by region.</div>
              </div>
              <div className="live-badge">{activeNodesCount} live regions</div>
            </div>
            <div className="world-svg-container">
              <svg className="world-svg" viewBox="0 0 100 60">
                <defs>
                  <linearGradient id="flow-route" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="rgba(34,211,238,0.2)"/>
                    <stop offset="50%" stopColor="rgba(45,212,191,0.95)"/>
                    <stop offset="100%" stopColor="rgba(132,204,22,0.3)"/>
                  </linearGradient>
                  <linearGradient id="flow-blocked" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="rgba(251,113,133,0.15)"/>
                    <stop offset="50%" stopColor="rgba(244,63,94,0.95)"/>
                    <stop offset="100%" stopColor="rgba(251,191,36,0.15)"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="0" y1="40" x2="100" y2="40" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="10" y1="0" x2="10" y2="60" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="25" y1="0" x2="25" y2="60" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="40" y1="0" x2="40" y2="60" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="55" y1="0" x2="55" y2="60" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="70" y1="0" x2="70" y2="60" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <line x1="85" y1="0" x2="85" y2="60" stroke="rgba(148,163,184,0.06)" strokeWidth="0.22"/>
                <path d="M8 18C13 14 24 13 31 17C34 19 34 24 28 26C20 29 10 28 7 24C5 22 5 20 8 18Z" fill="rgba(15,23,42,0.92)" stroke="rgba(56,189,248,0.09)" strokeWidth="0.4"/>
                <path d="M42 14C48 10 59 11 63 16C67 21 65 26 58 28C49 31 41 28 39 22C38 19 39 16 42 14Z" fill="rgba(15,23,42,0.92)" stroke="rgba(56,189,248,0.09)" strokeWidth="0.4"/>
                <path d="M69 18C74 15 84 16 88 20C91 23 89 28 84 30C78 33 70 32 67 27C65 24 66 20 69 18Z" fill="rgba(15,23,42,0.92)" stroke="rgba(56,189,248,0.09)" strokeWidth="0.4"/>
                <path d="M77 37C81 34 87 34 90 38C92 41 90 45 86 47C81 49 76 48 74 44C73 41 74 39 77 37Z" fill="rgba(15,23,42,0.92)" stroke="rgba(56,189,248,0.09)" strokeWidth="0.4"/>
                
                <g id="world-flows">
                  {selectedDecision && flows.slice(0, 1).map(f => {
                    // draw single flow to selected region (mock baseline for now if not fully populated)
                    const toAnchor = REGION_ANCHORS[selectedDecision.selectedRegion];
                    const fromAnchor = REGION_ANCHORS['us-east-1']; // arbitrary baseline source
                    if (toAnchor && fromAnchor) {
                      const cx = (fromAnchor.x + toAnchor.x)/2;
                      const cy = Math.min(fromAnchor.y, toAnchor.y) - 8;
                      const d = `M ${fromAnchor.x} ${fromAnchor.y} Q ${cx} ${cy} ${toAnchor.x} ${toAnchor.y}`;
                      return <path key="flow" d={d} fill="none" stroke={selectedDecision.action === 'deny' ? 'url(#flow-blocked)' : 'url(#flow-route)'} strokeWidth="1.25" strokeDasharray="3 2" style={{animation:'flow-dash 1.8s linear infinite'}} />;
                    }
                    return null;
                  })}
                </g>
                <g id="world-nodes">
                  {nodes.map(n => {
                    const a = REGION_ANCHORS[n.region];
                    if (!a) return null;
                    const isSelected = selectedDecision?.selectedRegion === n.region;
                    const color = n.state === 'active' ? 'rgba(34,197,94,0.95)' : n.state === 'blocked' ? 'rgba(244,63,94,0.95)' : 'rgba(250,204,21,0.95)';
                    return (
                      <g key={n.region} style={{cursor:'pointer'}} onClick={() => setSelectedFrameId(n.decisionFrameId)}>
                        <circle cx={a.x} cy={a.y} r={isSelected ? 4.2 : 3.2} fill="none" stroke={color} strokeWidth="0.25" opacity={isSelected ? 0.75 : 0.34} style={{animation:'ring-pulse 2.2s ease-in-out infinite'}} />
                        <circle cx={a.x} cy={a.y} r={isSelected ? 2.6 : 1.9} fill={color} stroke="rgba(255,255,255,0.85)" strokeWidth="0.35" style={{animation:'node-pulse 2.2s ease-in-out infinite'}} />
                        <text x={a.x+1.6} y={a.y-1.8} className="region-label">{a.label}</text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          {/* DECISION CORE */}
          <div className="card">
            <div className="label label-cyan" style={{marginBottom:'10px'}}>Decision core</div>
            <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:'16px'}}>
              <div>
                <h2 className="section">Authority frame ready</h2>
                <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginTop:'10px'}}>
                  <span className="chip chip-neutral">{selectedDecision?.selectedRegion || '--'}</span>
                  <span className="chip chip-neutral">{humanizeReason(selectedDecision?.reasonCode || null)}</span>
                </div>
              </div>
              <div style={{textAlign:'right',fontSize:'12px',color:'#64748b',lineHeight:1.8}}>
                <div>Proof <span className="mono">{shortHash(selectedDecision?.proofHash || null, 10)}</span></div>
                <div>Trace <span>{selectedDecision?.traceAvailable ? 'locked' : 'on inspect'}</span></div>
              </div>
            </div>
            <div className="decision-grid">
              <div className="decision-detail" style={{borderColor: mainCardColor}}>
                <div className="detail-grid">
                  <div className="detail-item"><span className="label">Decision frame</span><span className="value mono">{selectedDecision?.decisionFrameId || '--'}</span></div>
                  <div className="detail-item"><span className="label">Latency</span><span className="value">{selectedDecision?.latencyTotalMs}ms</span></div>
                  <div className="detail-item"><span className="label">Water authority</span><span className="value">{selectedDecision?.waterAuthorityMode || '--'}</span></div>
                  <div className="detail-item"><span className="label">SAIQ source</span><span className="value">{selectedDecision?.governanceSource || '--'}</span></div>
                </div>
              </div>
              <div className="decision-detail" style={{borderColor: 'var(--border-dim)'}}>
                <div className="label" style={{marginBottom:'8px'}}>Authority path</div>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--text-white)'}}>{humanizeReason(selectedDecision?.reasonCode || null)}</div>
                <div style={{marginTop:'16px',display:'flex',flexDirection:'column',gap:'8px',fontSize:'13px',color:'#94a3b8'}}>
                  <div>Action: <span style={{color:'#6ee7b7'}}>{metaLabel}</span></div>
                  <div>Signal posture: <span>{selectedDecision?.signalMode || 'live frame'}</span></div>
                </div>
              </div>
            </div>
            {/* PIPELINE RAIL */}
            <div className="pipeline-rail">
              <div className="pipeline-stage">
                <div className="pipeline-scan" style={{animationDelay:'0s'}}></div>
                <div className="label" style={{marginBottom:'8px'}}>SAIQ</div>
                <div style={{fontSize:'13px',fontWeight:600}}>{selectedDecision?.governanceSource || '---'}</div>
              </div>
              <div className="pipeline-stage">
                <div className="pipeline-scan" style={{animationDelay:'0.12s'}}></div>
                <div className="label" style={{marginBottom:'8px'}}>Decision</div>
                <div style={{fontSize:'13px',fontWeight:600}}>{metaLabel}</div>
              </div>
              <div className="pipeline-stage">
                <div className="pipeline-scan" style={{animationDelay:'0.24s'}}></div>
                <div className="label" style={{marginBottom:'8px'}}>Proof</div>
                <div style={{fontSize:'13px',fontWeight:600}}>{shortHash(selectedDecision?.proofHash || null, 10)}</div>
              </div>
            </div>
          </div>

          {/* SAIQ GOVERNANCE */}
          <section className="card">
            <div className="panel-icon-row">
              <svg className="icon-lg" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <div>
                <div className="label" style={{marginBottom:'4px'}}>SAIQ governance layer</div>
                <div style={{fontSize:'15px',fontWeight:700}}>Weighted execution authority.</div>
              </div>
            </div>
            <div className="gov-grid">
              <div className="gov-card">
                <div className="label" style={{marginBottom:'8px'}}>State</div>
                <div style={{fontSize:'13px',color:'#cbd5e1',lineHeight:2}}>
                  Source: <span>{snapshot.governance.source}</span><br/>
                  Strict: <span>{snapshot.governance.strict ? 'Yes' : 'No'}</span>
                </div>
                <div className="gov-score">{snapshot.governance.selectedScore?.toFixed(3) || '---'}</div>
              </div>
              <div className="gov-card">
                <div className="label" style={{marginBottom:'8px'}}>SAIQ Weights</div>
                {snapshot.governance.weights ? (
                  <div>
                    <div className="weight-row">Carbon <span>{snapshot.governance.weights.carbon?.toFixed(2)}</span></div>
                    <div className="weight-bar" style={{width:`${(snapshot.governance.weights.carbon||0)*100}%`}}></div>
                    <div className="weight-row">Water <span>{snapshot.governance.weights.water?.toFixed(2)}</span></div>
                    <div className="weight-bar" style={{width:`${(snapshot.governance.weights.water||0)*100}%`,background:'rgba(34,211,238,0.5)'}}></div>
                    <div className="weight-row">Latency <span>{snapshot.governance.weights.latency?.toFixed(2)}</span></div>
                    <div className="weight-bar" style={{width:`${(snapshot.governance.weights.latency||0)*100}%`,background:'rgba(167,139,250,0.6)'}}></div>
                  </div>
                ) : (
                  <div style={{fontSize:'13px',color:'#475569'}}>Weights attach when selected.</div>
                )}
              </div>
              <div className="gov-card">
                <div className="label" style={{marginBottom:'8px'}}>Impact</div>
                <div style={{display:'flex',flexDirection:'column',gap:'6px',fontSize:'13px',color:'#cbd5e1'}}>
                  <div>Carbon delta <strong>{snapshot.governance.impact.carbonReductionPct?.toFixed(1) || '--'}</strong>%</div>
                  <div>Water delta <strong>{snapshot.governance.impact.waterImpactDeltaLiters?.toFixed(1) || '--'}</strong> L</div>
                  <div>Signal conf <strong>{snapshot.governance.impact.signalConfidence?.toFixed(2) || '--'}</strong></div>
                </div>
              </div>
            </div>
          </section>

          {/* SYSTEM HEALTH */}
          <section className="card">
            <div className="panel-icon-row">
              <svg className="icon-lg" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <div>
                <div className="label" style={{marginBottom:'4px'}}>System health</div>
                <div style={{fontSize:'15px',fontWeight:700}}>Provider & signal posture.</div>
              </div>
            </div>
            <div className="provider-list">
              {snapshot.health.providers.map(p => {
                const dotClass = p.status === 'healthy' ? 'ps-healthy' : p.status === 'degraded' ? 'ps-degraded' : 'ps-offline';
                return (
                  <div key={p.id} className="provider-row">
                    <div className="provider-left">
                      <div className={`provider-status ${dotClass}`}></div>
                      <div>
                        <div className="provider-name">{p.label}</div>
                        <div className="provider-meta">{p.mode} · {p.freshnessSec || '--'}s fresh</div>
                      </div>
                    </div>
                    <div className="provider-right">
                      <div className="provider-conf">conf {((p.confidence||0)*100).toFixed(0)}%</div>
                      <div className="provider-type">{p.providerType || 'unknown'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN */}
        <div className="col-right">
          <div className="card" style={{flex:1}}>
            <div className="panel-icon-row">
              <svg className="icon-lg" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              <div>
                <div className="label label-cyan" style={{marginBottom:'4px'}}>Trace stream</div>
                <div style={{fontSize:'15px',fontWeight:700}}>Decision frame history.</div>
              </div>
            </div>
            <div className="trace-stream-list">
              {snapshot.traceStream.items.map(t => {
                const isSel = selectedFrameId === t.decisionFrameId;
                return (
                  <div key={t.decisionFrameId} className={`trace-item ${isSel ? 'selected' : ''}`} onClick={() => setSelectedFrameId(t.decisionFrameId)}>
                    <div className="trace-top">
                      <span className="trace-region">{t.region}</span>
                      <span className={`chip ${t.action==='deny'?'chip-rose':'chip-neutral'}`} style={{fontSize:'9px',padding:'2px 6px'}}>{t.action}</span>
                    </div>
                    <div className="trace-meta">
                      <div className={`proof-dot ${t.proofAvailable ? '' : 'proof-dot-off'}`}></div>
                      <span className="trace-frame">{shortHash(t.decisionFrameId, 10)}</span>
                      <span className="trace-ago">{formatAgo(t.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WrappedRecoveredCommandCenterShell() {
  return (
    <ErrorBoundary>
      <div style={{padding: '20px', color: 'white'}}>
        <div>DEBUG: Command Center loading...</div>
        <RecoveredCommandCenterShell />
      </div>
    </ErrorBoundary>
  );
}
