'use client'

import { useState, useEffect, useRef } from 'react'
import './styles.css'

// Data
const REGIONS = [
  { name:'EU-NORTH-1', x:0.52, y:0.22, intensity:41, water:'LOW', label:'eu-n1' },
  { name:'EU-WEST-2',  x:0.46, y:0.28, intensity:89, water:'LOW', label:'eu-w2' },
  { name:'EU-CENTRAL', x:0.54, y:0.27, intensity:142, water:'MED', label:'eu-c1' },
  { name:'US-EAST-1',  x:0.24, y:0.32, intensity:342, water:'HIGH', label:'us-e1' },
  { name:'US-WEST-2',  x:0.1,  y:0.3,  intensity:180, water:'MED', label:'us-w2' },
  { name:'AP-EAST-1',  x:0.84, y:0.38, intensity:520, water:'HIGH', label:'ap-e1' },
  { name:'AP-SE-1',    x:0.82, y:0.5,  intensity:380, water:'MED', label:'ap-se1' },
  { name:'SA-EAST-1',  x:0.32, y:0.62, intensity:210, water:'MED', label:'sa-e1' },
  { name:'AF-SOUTH',   x:0.58, y:0.62, intensity:450, water:'HIGH', label:'af-s1' },
  { name:'ME-SOUTH',   x:0.66, y:0.37, intensity:390, water:'HIGH', label:'me-s1' },
]

const ACTIONS = ['REROUTE','REROUTE','REROUTE','DELAY','DELAY','DENY','RUN','RUN','THROTTLE'];
const JOBS = [
  'ml-training-batch','inference-worker','etl-pipeline','data-export',
  'video-encode','model-finetune','batch-analytics','k8s-job','ci-build',
  'cron-aggregator','stream-processor','dataflow-task'
];
const SOURCE_REGIONS = ['us-east-1','us-west-2','ap-east-1','eu-central-1','sa-east-1'];
const DEST_REGIONS = ['eu-north-1','eu-west-2','us-west-2','ap-southeast-1'];

function rand(min: number, max: number) { return Math.random()*(max-min)+min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max)); }
function pick<T>(arr: T[]): T { return arr[randInt(0, arr.length)]; }
function hex() { return '0x'+Array.from({length:8},()=>'0123456789abcdef'[randInt(0,16)]).join('')+'...'+Array.from({length:4},()=>'0123456789abcdef'[randInt(0,16)]).join(''); }

// Globe SVG Component
function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3 Q18 8 12 12 Q6 16 12 21"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  )
}

// Sparkline Component
function Sparkline({ color, id }: { color: string; id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<number[]>(Array.from({length:20},()=>rand(30,100)))
  const chartRef = useRef<any>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Load Chart.js dynamically
    const loadChart = async () => {
      if (typeof window === 'undefined' || !(window as any).Chart) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
        script.async = true
        document.head.appendChild(script)
        
        await new Promise(resolve => {
          script.onload = resolve
        })
      }
      
      const Chart = (window as any).Chart
      if (!Chart || chartRef.current) return
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      chartRef.current = new Chart(ctx, {
        type:'line',
        data:{ labels:dataRef.current.map((_,i)=>i), datasets:[{
          data: dataRef.current, 
          borderColor:color, 
          borderWidth:1.5,
          tension:0.4, 
          pointRadius:0, 
          fill:true,
          backgroundColor: () => {
            const g = ctx.createLinearGradient(0,0,0,28);
            g.addColorStop(0, color+'44');
            g.addColorStop(1, color+'00');
            return g;
          }
        }]},
        options:{
          responsive:true, 
          maintainAspectRatio:false, 
          animation:false,
          plugins:{legend:{display:false},tooltip:{enabled:false}},
          scales:{x:{display:false},y:{display:false}}
        }
      })
      
      // Update interval
      const interval = setInterval(() => {
        if (chartRef.current) {
          dataRef.current.push(rand(30,100)); 
          dataRef.current.shift();
          chartRef.current.data.datasets[0].data = [...dataRef.current];
          chartRef.current.update('none');
        }
      }, 2000)
      
      return () => clearInterval(interval)
    }
    
    loadChart()
  }, [color, id])
  
  return <canvas ref={canvasRef} id={id} width={80} height={28} style={{ width: '100%', height: '28px' }} />
}

// Globe Canvas Component
function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arcsRef = useRef<any[]>([])
  const animFrameRef = useRef<number>()
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let globeW = 0
    let globeH = 0
    let animFrame = 0
    
    const resizeGlobe = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        canvas.width = rect.width
        canvas.height = rect.height - 40
        globeW = canvas.width
        globeH = canvas.height
      }
    }
    
    const geoToXY = (xFrac: number, yFrac: number) => {
      return { x: xFrac * globeW, y: yFrac * globeH };
    }
    
    const spawnArc = () => {
      const src = REGIONS[randInt(3,10)];
      const dst = REGIONS[randInt(0,4)];
      const p1 = geoToXY(src.x, src.y);
      const p2 = geoToXY(dst.x, dst.y);
      const mx = (p1.x+p2.x)/2;
      const my = (p1.y+p2.y)/2 - rand(30,80);
      const colors = ['#00e5a0','#00e5a0','#ffb347','#3dd9ff'];
      arcsRef.current.push({
        x1:p1.x, y1:p1.y, x2:p2.x, y2:p2.y,
        cx:mx, cy:my,
        color:pick(colors), progress:0, speed:rand(0.006,0.012)
      });
    }
    
    const drawGlobe = () => {
      ctx.clearRect(0,0,globeW,globeH);
      
      // Deep space background gradient
      const bg = ctx.createRadialGradient(globeW*0.5,globeH*0.5,0,globeW*0.5,globeH*0.5,Math.max(globeW,globeH)*0.7);
      bg.addColorStop(0,'#0a0f1a');
      bg.addColorStop(1,'#050709');
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,globeW,globeH);
      
      // Grid lines (lat/lon)
      ctx.strokeStyle = 'rgba(100,200,255,0.04)';
      ctx.lineWidth = 0.5;
      for(let x=0;x<=globeW;x+=globeW/12){
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,globeH); ctx.stroke();
      }
      for(let y=0;y<=globeH;y+=globeH/8){
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(globeW,y); ctx.stroke();
      }
      
      // Continent blobs (simplified impressions)
      const contBlobs = [
        {x:0.20,y:0.28,w:0.18,h:0.22}, // NA
        {x:0.48,y:0.24,w:0.14,h:0.18}, // Europe
        {x:0.60,y:0.30,w:0.12,h:0.20}, // Asia
        {x:0.78,y:0.42,w:0.10,h:0.16}, // SE Asia
        {x:0.28,y:0.55,w:0.08,h:0.16}, // SA
        {x:0.55,y:0.52,w:0.10,h:0.18}, // Africa
      ];
      contBlobs.forEach(b=>{
        ctx.fillStyle='rgba(100,200,255,0.03)';
        ctx.beginPath();
        ctx.ellipse(b.x*globeW, b.y*globeH, b.w*globeW/2, b.h*globeH/2, 0, 0, Math.PI*2);
        ctx.fill();
      });
      
      // Routing arcs
      arcsRef.current = arcsRef.current.filter(arc=>{
        arc.progress += arc.speed;
        if(arc.progress > 1.4) return false;
        const t = Math.min(arc.progress, 1);
        const tail = Math.max(0, arc.progress - 0.4);
        ctx.save();
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = Math.sin(arc.progress * Math.PI) * 0.8;
        ctx.beginPath();
        const steps = 30;
        for(let i=Math.floor(tail*steps); i<=Math.floor(t*steps); i++){
          const u = i/steps;
          const px = (1-u)*(1-u)*arc.x1+(2*(1-u)*u)*arc.cx+(u*u)*arc.x2;
          const py = (1-u)*(1-u)*arc.y1+(2*(1-u)*u)*arc.cy+(u*u)*arc.y2;
          if(i===Math.floor(tail*steps)) ctx.moveTo(px,py);
          else ctx.lineTo(px,py);
        }
        ctx.stroke();
        // head dot
        const hu = t;
        const hx = (1-hu)*(1-hu)*arc.x1+(2*(1-hu)*hu)*arc.cx+(hu*hu)*arc.x2;
        const hy = (1-hu)*(1-hu)*arc.y1+(2*(1-hu)*hu)*arc.cy+(hu*hu)*arc.y2;
        ctx.fillStyle = arc.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(hx, hy, 3, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        return true;
      });
      
      // Nodes
      const time = Date.now()/1000;
      REGIONS.forEach((r,i)=>{
        const p = geoToXY(r.x, r.y);
        const pulse = (Math.sin(time*1.5 + i*0.8)+1)/2;
        let color;
        if(r.intensity < 100) color = '#00e5a0';
        else if(r.intensity < 300) color = '#ffb347';
        else color = '#ff4f6b';
        
        // Pulse ring
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = (1-pulse)*0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 + pulse*14, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
        
        // Core dot
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        
        // Label
        ctx.save();
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(150,200,220,0.6)';
        ctx.fillText(r.label, p.x+7, p.y+4);
        ctx.restore();
      });
      
      animFrame++;
      animFrameRef.current = requestAnimationFrame(drawGlobe);
    }
    
    resizeGlobe();
    drawGlobe();
    
    const arcInterval = setInterval(spawnArc, 800);
    const resizeHandler = () => { resizeGlobe(); };
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      clearInterval(arcInterval);
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);
  
  return <canvas ref={canvasRef} id="globe-canvas" />
}

// Decision Card Component
function DecisionCard({ card, onClick }: { card: any; onClick: () => void }) {
  const actionClass: Record<string, string> = {
    REROUTE:'reroute', DELAY:'delay', DENY:'deny', RUN:'run', THROTTLE:'throttle'
  };
  
  const cls = actionClass[card.action] || 'run';
  
  return (
    <div className={`decision-card ${cls} new-card`} onClick={onClick}>
      <div className="dc-top">
        <span className={`dc-action ${cls}`}>{card.action}</span>
        <span className="dc-job">{card.job}</span>
        <span className="dc-time">{card.timeAgo}</span>
      </div>
      <div className="dc-metrics">
        <div className="dc-metric">{card.action==='RUN'?'REGION:':'FROM:'} <span>{card.src}</span></div>
        {card.action!=='RUN' && <div className="dc-metric">TO: <span className="positive">{card.dst}</span></div>}
        <div className="dc-metric">CO₂Δ: <span className="positive">-{card.dCO2}%</span></div>
        <div className="dc-metric">H₂OΔ: <span className="positive">-{card.dH2O}%</span></div>
        {card.action==='REROUTE' && <div className="dc-metric warn">+{card.dLatency}ms</div>}
      </div>
      <div className="dc-proof"><div className="proof-dot"></div>{card.proofHash}</div>
    </div>
  )
}

// Main Component
function CO2ControlPanelExact() {
  const [clock, setClock] = useState('--:--:-- UTC')
  const [decisionCount, setDecisionCount] = useState(1247)
  const [co2Saved, setCo2Saved] = useState(847)
  const [feedCount, setFeedCount] = useState(0)
  const [activeTab, setActiveTab] = useState('doctrine')
  const [visorOpen, setVisorOpen] = useState(false)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [feedCards, setFeedCards] = useState<any[]>([])
  const [proofEntries, setProofEntries] = useState<any[]>([])
  const [carbonWeight, setCarbonWeight] = useState(72)
  const [waterWeight, setWaterWeight] = useState(58)
  const [latencyTolerance, setLatencyTolerance] = useState(40)
  const [costCeiling, setCostCeiling] = useState(48)
  
  const feedScrollRef = useRef<HTMLDivElement>(null)
  
  // Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(now.toUTCString().split(' ')[4] + ' UTC');
    }
    const interval = setInterval(updateClock, 1000);
    updateClock();
    return () => clearInterval(interval);
  }, [])
  
  // Make feed card
  const makeFeedCard = () => {
    const action = pick(ACTIONS);
    const job = pick(JOBS)+'-'+randInt(1000,9999);
    const src = pick(SOURCE_REGIONS);
    const dst = pick(DEST_REGIONS);
    const dCO2 = randInt(20,95);
    const dH2O = randInt(15,80);
    const dLatency = randInt(5,45);
    const proofHash = hex();
    const mins = randInt(0,59);
    const secs = randInt(0,59);
    const timeAgo = mins>0 ? mins+'m '+secs+'s ago' : secs+'s ago';
    
    return {
      action, job, src, dst, dCO2, dH2O, dLatency, proofHash, timeAgo
    };
  }
  
  // Initial cards
  useEffect(() => {
    const initial = Array.from({length:12}, makeFeedCard);
    setFeedCards(initial);
    setFeedCount(12);
    
    // Build proof list
    const proofs = Array.from({length:6}, ()=>{
      const proofHash = hex();
      const job = pick(JOBS)+'-'+randInt(1000,9999);
      const action = pick(['REROUTE','DELAY','RUN']);
      const co2Delta = randInt(40,90);
      const h2oDelta = randInt(30,80);
      
      return {
        hash: proofHash,
        job,
        action,
        co2Delta,
        h2oDelta,
        expanded: false
      };
    });
    setProofEntries(proofs);
  }, [])
  
  // Add cards periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const card = makeFeedCard();
      setFeedCards(prev => [card, ...prev].slice(0, 40));
      setFeedCount(prev => prev + 1);
      setDecisionCount(prev => prev + 1);
      if(Math.random()<0.15){
        setCo2Saved(prev => prev + randInt(1,5));
      }
    }, 1800);
    
    return () => clearInterval(interval);
  }, [])
  
  // Load Lucide icons
  useEffect(() => {
    const loadLucide = async () => {
      if (typeof window !== 'undefined' && !(window as any).lucide) {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
        script.async = true
        document.head.appendChild(script)
        
        await new Promise(resolve => {
          script.onload = resolve
        })
        
        if ((window as any).lucide) {
          (window as any).lucide.createIcons()
        }
      }
    }
    
    loadLucide()
  }, [])
  
  const openCardModal = (card: any) => {
    setSelectedCard(card);
    setCardModalOpen(true);
  }
  
  const closeModal = () => {
    setCardModalOpen(false);
    setSelectedCard(null);
  }
  
  const toggleProofEntry = (index: number) => {
    setProofEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, expanded: !entry.expanded } : entry
    ));
  }
  
  const toggleRule = (index: number) => {
    // Toggle rule implementation
  }
  
  return (
    <div className="app">
      {/* AUTHORITY STRIP */}
      <header className="authority-strip">
        <div className="logo-mark">
          <GlobeIcon />
          CO2 ROUTER
        </div>
        <div className="strip-divider"></div>
        <div className="posture-badge">
          <div className="posture-dot"></div>
          ENFORCING
        </div>
        <div className="strip-stats">
          <div className="strip-stat">
            <i data-lucide="zap" style={{width:'12px',height:'12px'}}></i>
            <span>DECISIONS</span>
            <strong>{decisionCount.toLocaleString()}</strong>
          </div>
          <div className="strip-stat">
            <i data-lucide="cpu" style={{width:'12px',height:'12px'}}></i>
            <span>P95</span>
            <strong>31ms</strong>
          </div>
          <div className="strip-stat">
            <i data-lucide="leaf" style={{width:'12px',height:'12px'}}></i>
            <span>CO₂ SAVED</span>
            <strong>{co2Saved}kg</strong>
          </div>
          <div className="strip-stat alert">
            <i data-lucide="droplets" style={{width:'12px',height:'12px'}}></i>
            <span>H₂O SAVED</span>
            <strong>18.4kL</strong>
          </div>
          <div className="strip-stat">
            <i data-lucide="shield-check" style={{width:'12px',height:'12px'}}></i>
            <span>DOCTRINE</span>
            <strong>v1.14</strong>
          </div>
        </div>
        <div className="strip-right">
          <div className="strip-clock">{clock}</div>
          <button className="strip-btn" onClick={() => setVisorOpen(true)}>
            <i data-lucide="scan-eye" style={{width:'12px',height:'12px'}}></i>
            VISOR
          </button>
        </div>
      </header>

      {/* MAIN BODY */}
      <div className="main-body">
        {/* SIDEBAR NAV */}
        <nav className="sidebar">
          <button className="nav-btn active">
            <i data-lucide="globe-2" style={{width:'18px',height:'18px'}}></i>
            <span className="nav-tooltip">Globe</span>
          </button>
          <button className="nav-btn">
            <i data-lucide="sliders-horizontal" style={{width:'18px',height:'18px'}}></i>
            <span className="nav-tooltip">Doctrine</span>
          </button>
          <button className="nav-btn">
            <i data-lucide="shield-check" style={{width:'18px',height:'18px'}}></i>
            <span className="nav-tooltip">Proof Chain</span>
          </button>
          <button className="nav-btn">
            <i data-lucide="sparkles" style={{width:'18px',height:'18px'}}></i>
            <span className="nav-tooltip">AI Co-Pilot</span>
          </button>
          <div className="sidebar-spacer"></div>
          <button className="nav-btn">
            <i data-lucide="settings" style={{width:'18px',height:'18px'}}></i>
            <span className="nav-tooltip">Settings</span>
          </button>
        </nav>

        {/* CONTENT */}
        <div className="content">
          <div className="top-section">
            {/* GLOBE PANEL */}
            <div className="globe-panel">
              <div className="panel-header">
                <i data-lucide="globe-2" style={{width:'14px',height:'14px',color:'var(--cyan)'}}></i>
                <span className="panel-title">Global Routing Map</span>
                <span className="panel-badge">● LIVE</span>
              </div>
              <GlobeCanvas />
              <div className="globe-overlay">
                <div className="globe-legend-item">
                  <div className="globe-legend-dot" style={{background:'var(--green)'}}></div>
                  Clean route active
                </div>
                <div className="globe-legend-item">
                  <div className="globe-legend-dot" style={{background:'var(--amber)'}}></div>
                  Delay / reroute pending
                </div>
                <div className="globe-legend-item">
                  <div className="globe-legend-dot" style={{background:'var(--red)'}}></div>
                  Denied / high stress
                </div>
              </div>
              <div className="globe-stats">
                <div className="globe-stat-card">
                  <div className="globe-stat-label">Active Regions</div>
                  <div className="globe-stat-value">14</div>
                </div>
                <div className="globe-stat-card">
                  <div className="globe-stat-label">Reroutes / hr</div>
                  <div className="globe-stat-value amber">342</div>
                </div>
                <div className="globe-stat-card">
                  <div className="globe-stat-label">Cleanest Now</div>
                  <div className="globe-stat-value cyan">EU-N1</div>
                </div>
              </div>
            </div>

            {/* DECISION FEED */}
            <div className="decision-feed">
              <div className="panel-header">
                <i data-lucide="activity" style={{width:'14px',height:'14px',color:'var(--green)'}}></i>
                <span className="panel-title">Decision Feed</span>
                <span className="panel-badge">{feedCount}</span>
              </div>
              <div className="feed-scroll" ref={feedScrollRef}>
                {feedCards.map((card, index) => (
                  <DecisionCard 
                    key={index} 
                    card={card} 
                    onClick={() => openCardModal(card)} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* KPI STRIP */}
          <div className="kpi-strip">
            <div className="kpi-cell">
              <div className="kpi-label">Decisions / min</div>
              <div className="kpi-value">248</div>
              <div className="kpi-delta up">▲ 12%</div>
              <div className="kpi-sparkline"><Sparkline color="#00e5a0" id="spark-0" /></div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-label">Carbon Saved</div>
              <div className="kpi-value">{co2Saved} kg</div>
              <div className="kpi-delta up">▲ 6.2%</div>
              <div className="kpi-sparkline"><Sparkline color="#00e5a0" id="spark-1" /></div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-label">Reroute Rate</div>
              <div className="kpi-value amber">41%</div>
              <div className="kpi-delta up">▲ 3%</div>
              <div className="kpi-sparkline"><Sparkline color="#ffb347" id="spark-2" /></div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-label">Delay Rate</div>
              <div className="kpi-value cyan">18%</div>
              <div className="kpi-delta down">▼ 1%</div>
              <div className="kpi-sparkline"><Sparkline color="#3dd9ff" id="spark-3" /></div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-label">Deny Rate</div>
              <div className="kpi-value red">3%</div>
              <div className="kpi-delta down">▼ 0.5%</div>
              <div className="kpi-sparkline"><Sparkline color="#ff4f6b" id="spark-4" /></div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-label">P95 Latency</div>
              <div className="kpi-value" style={{color:'var(--purple)'}}>31ms</div>
              <div className="kpi-delta down">▼ 4ms</div>
              <div className="kpi-sparkline"><Sparkline color="#a78bfa" id="spark-5" /></div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="panel-tabs">
            <button 
              className={`panel-tab ${activeTab === 'doctrine' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctrine')}
            >
              Doctrine
            </button>
            <button 
              className={`panel-tab ${activeTab === 'proof' ? 'active' : ''}`}
              onClick={() => setActiveTab('proof')}
            >
              Proof
            </button>
            <button 
              className={`panel-tab ${activeTab === 'copilot' ? 'active' : ''}`}
              onClick={() => setActiveTab('copilot')}
            >
              Copilot
            </button>
          </div>
          <div className="panel-content">
            {/* DOCTRINE TAB */}
            {activeTab === 'doctrine' && (
              <div className="tab-pane active">
                <div className="doctrine-version">
                  <div>
                    <div className="dv-label">Active Doctrine</div>
                    <div className="dv-hash">v1.14 · 0xa4f2c9e1</div>
                  </div>
                  <i data-lucide="check-circle" style={{width:'16px',height:'16px',color:'var(--green)'}}></i>
                </div>

                <div className="doctrine-section">
                  <div className="doctrine-section-title">Objective Weights</div>
                  <div className="slider-row">
                    <div className="slider-label">
                      <strong>Carbon Weight</strong>
                      <span className="slider-value">{carbonWeight}%</span>
                    </div>
                    <input 
                      type="range" 
                      className="green" 
                      min={0} 
                      max={100} 
                      value={carbonWeight} 
                      onChange={e => setCarbonWeight(Number(e.target.value))}
                    />
                  </div>
                  <div className="slider-row">
                    <div className="slider-label">
                      <strong>Water Stress</strong>
                      <span className="slider-value">{waterWeight}%</span>
                    </div>
                    <input 
                      type="range" 
                      className="green" 
                      min={0} 
                      max={100} 
                      value={waterWeight} 
                      onChange={e => setWaterWeight(Number(e.target.value))}
                    />
                  </div>
                  <div className="slider-row">
                    <div className="slider-label">
                      <strong>Latency Tolerance</strong>
                      <span className="slider-value">{latencyTolerance}ms</span>
                    </div>
                    <input 
                      type="range" 
                      className="amber" 
                      min={0} 
                      max={200} 
                      value={latencyTolerance} 
                      onChange={e => setLatencyTolerance(Number(e.target.value))}
                    />
                  </div>
                  <div className="slider-row">
                    <div className="slider-label">
                      <strong>Cost Ceiling</strong>
                      <span className="slider-value">${((costCeiling/100)*0.25).toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={100} 
                      value={costCeiling} 
                      onChange={e => setCostCeiling(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="doctrine-section">
                  <div className="doctrine-section-title">Hard Rules</div>
                  <div className="toggle-row" onClick={() => toggleRule(0)}>
                    <span className="toggle-label">Deny if water stress HIGH</span>
                    <div className="toggle on"></div>
                  </div>
                  <div className="toggle-row" onClick={() => toggleRule(1)}>
                    <span className="toggle-label">Allow delay up to 4 hours</span>
                    <div className="toggle on"></div>
                  </div>
                  <div className="toggle-row" onClick={() => toggleRule(2)}>
                    <span className="toggle-label">Block us-east-1 (water risk)</span>
                    <div className="toggle"></div>
                  </div>
                  <div className="toggle-row" onClick={() => toggleRule(3)}>
                    <span className="toggle-label">GreenOps CI/CD gate enabled</span>
                    <div className="toggle on"></div>
                  </div>
                  <div className="toggle-row" onClick={() => toggleRule(4)}>
                    <span className="toggle-label">Require 2-approver governance</span>
                    <div className="toggle"></div>
                  </div>
                </div>

                <button className="btn-apply">▶ Run Doctrine Simulator</button>
              </div>
            )}

            {/* PROOF TAB */}
            {activeTab === 'proof' && (
              <div className="tab-pane active">
                {proofEntries.map((entry, index) => (
                  <div key={index} className={`proof-entry ${entry.expanded ? 'open' : ''}`}>
                    <div className="proof-entry-head" onClick={() => toggleProofEntry(index)}>
                      <i data-lucide="shield-check" style={{width:'12px',height:'12px',color:'var(--green)'}}></i>
                      <span className="proof-hash">{entry.hash}</span>
                      <span className="proof-status">
                        <span style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--green)',display:'inline-block'}}></span>
                        VERIFIED
                      </span>
                    </div>
                    <div className="proof-entry-body">
                      <div className="proof-row">
                        <span className="proof-key">JOB</span>
                        <span className="proof-val">{entry.job}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-key">ACTION</span>
                        <span className="proof-val green">{entry.action}</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-key">CO₂Δ</span>
                        <span className="proof-val green">-{entry.co2Delta}%</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-key">H₂OΔ</span>
                        <span className="proof-val green">-{entry.h2oDelta}%</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-key">DOCTRINE</span>
                        <span className="proof-val">v1.14</span>
                      </div>
                      <div className="proof-row">
                        <span className="proof-key">TIMESTAMP</span>
                        <span className="proof-val">{new Date(Date.now()-randInt(0,3600000)).toISOString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* COPILOT TAB */}
            {activeTab === 'copilot' && (
              <div className="tab-pane active">
                <div className="counterfactual">
                  <div className="cf-title">This Month — Counterfactual Engine</div>
                  <div className="cf-row">
                    <div className="cf-col baseline">
                      <div className="cf-col-label">Without CO₂ Router</div>
                      <div className="cf-col-val">4.21</div>
                      <div className="cf-col-unit">tonnes CO₂</div>
                    </div>
                    <div className="cf-col actual">
                      <div className="cf-col-label">Actual Impact</div>
                      <div className="cf-col-val">0.72</div>
                      <div className="cf-col-unit">tonnes CO₂</div>
                    </div>
                  </div>
                  <div className="cf-savings">▼ 83% carbon reduction · 18,400L water avoided</div>
                </div>

                <div className="ai-suggestion">
                  <p>Your <strong>ml-training-batch</strong> jobs consistently run during peak grid hours in us-east-1. Shifting to a <strong>6-hour delay window</strong> would reduce carbon by 34% with no SLA impact.</p>
                  <div className="ai-actions">
                    <button className="ai-btn primary">Apply Rule</button>
                    <button className="ai-btn">Simulate First</button>
                    <button className="ai-btn">Dismiss</button>
                  </div>
                </div>

                <div className="ai-suggestion">
                  <p>Water stress in <strong>eu-central-1 is forecast HIGH</strong> for the next 72h (seasonal data). Pre-approve fallback to <strong>eu-north-1</strong> for this period?</p>
                  <div className="ai-actions">
                    <button className="ai-btn primary">Pre-Approve</button>
                    <button className="ai-btn">View Forecast</button>
                  </div>
                </div>

                <div className="ai-suggestion">
                  <p>Your <strong>latency tolerance on job class: inference</strong> is tighter than doctrine allows. Relaxing by <strong>20ms</strong> unlocks 3 additional clean regions — saving est. <strong>120kg CO₂/week</strong>.</p>
                  <div className="ai-actions">
                    <button className="ai-btn primary">Update Doctrine</button>
                    <button className="ai-btn">Dismiss</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="export-strip">
            <button className="export-btn">CSRD PDF</button>
            <button className="export-btn">Scope 3 CSV</button>
            <button className="export-btn">API Export</button>
          </div>
        </div>
      </div>

      {/* VISOR OVERLAY */}
      {visorOpen && (
        <div className="visor-overlay open">
          <button className="visor-close" onClick={() => setVisorOpen(false)}>✕ EXIT VISOR</button>
          <div className="visor-title">HALOGRID SMART VISOR — POSTURE STATUS</div>
          <div className="visor-posture">ENFORCING</div>
          <div className="visor-decisions">
            <span>{decisionCount.toLocaleString()}</span> decisions in the last 60 minutes
          </div>
          <div className="visor-grid">
            <div className="visor-card">
              <div className="visor-card-val green">{co2Saved}kg</div>
              <div className="visor-card-lbl">CO₂ Saved</div>
            </div>
            <div className="visor-card">
              <div className="visor-card-val amber">342</div>
              <div className="visor-card-lbl">Reroutes / hr</div>
            </div>
            <div className="visor-card">
              <div className="visor-card-val cyan">0</div>
              <div className="visor-card-lbl">Active Alerts</div>
            </div>
            <div className="visor-card">
              <div className="visor-card-val green">31ms</div>
              <div className="visor-card-lbl">P95 Latency</div>
            </div>
            <div className="visor-card">
              <div className="visor-card-val green">18.4kL</div>
              <div className="visor-card-lbl">H₂O Saved</div>
            </div>
            <div className="visor-card">
              <div className="visor-card-val cyan">v1.14</div>
              <div className="visor-card-lbl">Doctrine</div>
            </div>
          </div>
        </div>
      )}

      {/* DECISION CARD MODAL */}
      {cardModalOpen && selectedCard && (
        <div className="card-overlay open" onClick={closeModal}>
          <div className="card-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <i data-lucide="x" style={{width:'16px',height:'16px'}}></i>
            </button>
            <div className="modal-title">Decision Trace — Full Replay</div>
            <div className="modal-job">{selectedCard.job}</div>
            <div className="modal-grid">
              <div>
                <div className="modal-field-label">Action</div>
                <div className={`modal-field-val ${selectedCard.action === 'DENY' ? 'red' : selectedCard.action === 'DELAY' ? 'amber' : 'green'}`}>
                  {selectedCard.action}
                </div>
              </div>
              <div>
                <div className="modal-field-label">Source Region</div>
                <div className="modal-field-val">{selectedCard.src}</div>
              </div>
              <div>
                <div className="modal-field-label">Routed To</div>
                <div className="modal-field-val green">{selectedCard.dst || '—'}</div>
              </div>
              <div>
                <div className="modal-field-label">Carbon Delta</div>
                <div className="modal-field-val green">-{selectedCard.dCO2}%</div>
              </div>
              <div>
                <div className="modal-field-label">Water Delta</div>
                <div className="modal-field-val green">-{selectedCard.dH2O}%</div>
              </div>
              <div>
                <div className="modal-field-label">Latency Cost</div>
                <div className="modal-field-val amber">+{selectedCard.dLatency}ms</div>
              </div>
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',color:'var(--text-faint)',marginBottom:'var(--space-2)'}}>
              PROOF HASH
            </div>
            <div className="modal-proof-box">
              HASH: {selectedCard.proofHash}
              <br />SIGNAL_LINEAGE: WattTime·v3 → Ember·2026Q1 → WRI·Aqueduct-v5
              <br />POLICY_VERSION: v1.14 · doctrine:hash:0xa4f2c9e1
              <br />REPLAY_READY: TRUE
              <br />TIMESTAMP: {new Date().toISOString()}
            </div>
            <button className="modal-replay-btn">⟳ Replay Decision Against Current Signals</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CO2ControlPanelExact
