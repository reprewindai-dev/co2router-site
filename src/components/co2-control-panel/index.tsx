'use client'

import { useState, useCallback, useEffect } from 'react'
import './styles.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

// Zones
import { GlobeZone } from './zones/GlobeZone'
import { DecisionFeed } from './zones/DecisionFeed'
import { DoctrinePanel } from './zones/DoctrinePanel'
import { SmartVisor } from './zones/SmartVisor'
import { ProofWorkspace } from './zones/ProofWorkspace'

// Features
import { CounterfactualEngine } from './features/CounterfactualEngine'
import { AICoPilot } from './features/AICoPilot'

// Hooks
import { useLiveDecisions } from './hooks/useLiveDecisions'
import { useRoutingDecisions } from './hooks/useRoutingDecisions'
import { useDoctrine } from './hooks/useDoctrine'

// Types
import type { 
  RegionNode, 
  RoutingArc, 
  RoutingDecision,
  DoctrinePolicy,
  SimulationResult,
  CounterfactualResult,
  CoPilotSuggestion,
  CSRDExport,
  VisorStatus,
} from './types'

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
})

// Mock data generators for development
function generateMockRegions(): RegionNode[] {
  return [
    { id: 'us-east', name: 'US East', lat: 39.0, lng: -77.0, carbonIntensity: 450, renewablePercentage: 35, activeDecisions: 12, totalSaved: 1450, status: 'optimal' },
    { id: 'us-west', name: 'US West', lat: 37.0, lng: -122.0, carbonIntensity: 280, renewablePercentage: 65, activeDecisions: 18, totalSaved: 3200, status: 'optimal' },
    { id: 'eu-west', name: 'EU West', lat: 53.0, lng: -8.0, carbonIntensity: 320, renewablePercentage: 55, activeDecisions: 15, totalSaved: 2100, status: 'optimal' },
    { id: 'eu-north', name: 'EU North', lat: 60.0, lng: 15.0, carbonIntensity: 180, renewablePercentage: 85, activeDecisions: 8, totalSaved: 1800, status: 'optimal' },
    { id: 'asia-east', name: 'Asia East', lat: 35.0, lng: 140.0, carbonIntensity: 520, renewablePercentage: 25, activeDecisions: 22, totalSaved: 890, status: 'stressed' },
    { id: 'asia-south', name: 'Asia South', lat: 19.0, lng: 73.0, carbonIntensity: 580, renewablePercentage: 20, activeDecisions: 14, totalSaved: 650, status: 'stressed' },
    { id: 'sa-east', name: 'South America', lat: -23.0, lng: -46.0, carbonIntensity: 240, renewablePercentage: 75, activeDecisions: 6, totalSaved: 1200, status: 'acceptable' },
    { id: 'af-south', name: 'Africa South', lat: -26.0, lng: 28.0, carbonIntensity: 850, renewablePercentage: 15, activeDecisions: 3, totalSaved: 180, status: 'critical' },
  ]
}

function generateMockArcs(regions: RegionNode[]): RoutingArc[] {
  const arcs: RoutingArc[] = []
  const connections = [
    ['us-east', 'eu-west'],
    ['us-west', 'asia-east'],
    ['eu-west', 'asia-south'],
    ['eu-north', 'asia-east'],
    ['us-east', 'us-west'],
    ['eu-west', 'eu-north'],
    ['asia-east', 'asia-south'],
    ['sa-east', 'us-east'],
    ['af-south', 'eu-west'],
  ]
  
  connections.forEach(([from, to], i) => {
    const fromRegion = regions.find(r => r.id === from)
    const toRegion = regions.find(r => r.id === to)
    
    if (fromRegion && toRegion) {
      arcs.push({
        id: `arc-${i}`,
        from: fromRegion,
        to: toRegion,
        decisions: [],
        totalVolume: Math.floor(Math.random() * 1000) + 100,
        carbonSaved: Math.floor(Math.random() * 500),
        animated: Math.random() > 0.5,
      })
    }
  })
  
  return arcs
}

function generateMockDecision(): RoutingDecision {
  const regions = ['us-east', 'us-west', 'eu-west', 'eu-north', 'asia-east', 'asia-south']
  const from = regions[Math.floor(Math.random() * regions.length)]
  let to = regions[Math.floor(Math.random() * regions.length)]
  while (to === from) {
    to = regions[Math.floor(Math.random() * regions.length)]
  }
  
  const baselineCarbon = Math.random() * 2 + 0.5
  const delta = (Math.random() * 0.8 - 0.2) * baselineCarbon
  
  return {
    id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    fromRegion: from,
    toRegion: to,
    workloadType: ['AI Training', 'Web Serving', 'Batch Job', 'Data Analytics'][Math.floor(Math.random() * 4)],
    baselineCarbon,
    selectedCarbon: baselineCarbon - delta,
    delta,
    proofHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    status: delta > 0 ? 'active' : Math.random() > 0.7 ? 'marginal' : 'active',
    latency: Math.floor(Math.random() * 200) + 20,
    cost: 0.8 + Math.random() * 0.4,
    waterUsage: Math.random() * 50 + 10,
  }
}

function CO2ControlPanelInner() {
  // State
  const [activeZone, setActiveZone] = useState<'globe' | 'doctrine' | 'visor' | 'proof'>('globe')
  const [showCounterfactual, setShowCounterfactual] = useState(false)
  const [showCoPilot, setShowCoPilot] = useState(false)
  
  // Data
  const [regions] = useState<RegionNode[]>(generateMockRegions())
  const [arcs] = useState<RoutingArc[]>(() => generateMockArcs(generateMockRegions()))
  const [liveDecisions, setLiveDecisions] = useState<RoutingDecision[]>([])
  const [visorStatus, setVisorStatus] = useState<VisorStatus>({
    posture: 'green',
    activeDecisions: 98,
    carbonSavedToday: 456.7,
    waterSavedToday: 2340,
    currentLatency: 45,
    costIndex: 0.95,
    earthApprovalRate: 94.2,
  })
  
  // Hooks
  const doctrine = useDoctrine()
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  
  // Simulate live decision stream
  useEffect(() => {
    const interval = setInterval(() => {
      const newDecision = generateMockDecision()
      setLiveDecisions(prev => [newDecision, ...prev].slice(0, 50))
      
      // Update visor stats
      setVisorStatus(prev => ({
        ...prev,
        activeDecisions: prev.activeDecisions + 1,
        carbonSavedToday: prev.carbonSavedToday + Math.max(0, newDecision.delta),
        waterSavedToday: prev.waterSavedToday + (newDecision.delta > 0 ? newDecision.waterUsage * 0.1 : 0),
      }))
    }, 3000)
    
    // Seed initial data
    setLiveDecisions(Array(10).fill(null).map(generateMockDecision))
    
    return () => clearInterval(interval)
  }, [])
  
  // Handlers
  const handleSimulate = useCallback(async (policy: DoctrinePolicy) => {
    setIsSimulating(true)
    
    // Mock simulation
    await new Promise(r => setTimeout(r, 2000))
    
    const result: SimulationResult = {
      policy,
      backtestDays: 30,
      workloadsSimulated: 15420,
      carbonDelta: policy.weights.carbon > 50 ? 12.5 : -3.2,
      latencyDelta: policy.weights.latency > 50 ? -8.5 : 15.2,
      costDelta: policy.weights.cost > 50 ? -12.0 : 8.5,
      recommendation: policy.weights.carbon > 40 ? 'deploy' : 'review',
      confidence: 87,
    }
    
    setSimulationResult(result)
    setIsSimulating(false)
  }, [])
  
  const handleCounterfactual = useCallback(async ({ months }: { months: number }): Promise<CounterfactualResult> => {
    await new Promise(r => setTimeout(r, 1500))
    
    const actual = 0.7 + Math.random() * 0.5
    const withoutRouter = actual * (3 + Math.random() * 2)
    
    return {
      period: `${months} month${months > 1 ? 's' : ''}`,
      actualEmissions: actual,
      withoutRouter,
      delta: withoutRouter - actual,
      percentage: ((withoutRouter - actual) / withoutRouter) * 100,
      workloadCount: Math.floor(months * 30000 * (0.8 + Math.random() * 0.4)),
      topContributors: [
        'EU North renewable surge',
        'US West solar peak',
        'Asia East time-shifting',
        'Batch workload deferral',
      ],
    }
  }, [])
  
  const handleCoPilotSuggestions = useCallback(async (): Promise<CoPilotSuggestion[]> => {
    await new Promise(r => setTimeout(r, 1000))
    
    return [
      {
        id: `sugg-${Date.now()}-1`,
        type: 'weight_adjustment',
        title: 'Increase carbon weight by 10%',
        description: 'Analysis shows increasing carbon optimization weight would save an additional 45 tonnes/year with minimal latency impact.',
        evidence: 'EU North region shows 94% renewable availability during peak hours. Current weight (40%) is leaving savings uncaptured.',
        estimatedImpact: 45.2,
        confidence: 89,
        approved: false,
      },
      {
        id: `sugg-${Date.now()}-2`,
        type: 'time_shifting',
        title: 'Enable aggressive batch deferral',
        description: '23% of batch workloads can be deferred by 2-4 hours with significant carbon savings.',
        evidence: 'Historical pattern: batch jobs submitted 10am-2pm have 3x carbon intensity vs 2am-6am.',
        estimatedImpact: 128.5,
        confidence: 94,
        approved: false,
      },
    ]
  }, [])
  
  const handleGenerateExport = useCallback(async ({ startDate, endDate }: { startDate: string; endDate: string }): Promise<CSRDExport> => {
    await new Promise(r => setTimeout(r, 1000))
    
    return {
      reportingPeriod: `${startDate} to ${endDate}`,
      scope3Category: 'C8 - Upstream leased assets (cloud compute)',
      totalEmissions: liveDecisions.reduce((sum, d) => sum + d.selectedCarbon, 0),
      avoidanceClaims: liveDecisions.reduce((sum, d) => sum + Math.max(0, d.delta), 0),
      proofHashes: liveDecisions.slice(0, 10).map(d => d.proofHash),
      thirdPartyVerified: true,
    }
  }, [liveDecisions])
  
  return (
    <div className="co2-control-panel">
      {/* Header */}
      <header className="control-header">
        <div className="header-brand">
          <div className="brand-icon">🌍</div>
          <div className="brand-text">
            <h1>CO2 Router</h1>
            <span className="brand-tagline">Compute does not run until Earth approves it</span>
          </div>
        </div>
        
        <div className="header-status">
          <div className={`status-indicator ${visorStatus.posture}`}>
            <span className="status-dot" />
            <span className="status-text">
              {visorStatus.posture === 'green' ? 'EARTH APPROVES' : 
               visorStatus.posture === 'amber' ? 'EARTH CAUTIONS' : 'EARTH REJECTS'}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className={`header-btn ${showCounterfactual ? 'active' : ''}`}
            onClick={() => setShowCounterfactual(!showCounterfactual)}
          >
            🔮 Counterfactual
          </button>
          <button 
            className={`header-btn ${showCoPilot ? 'active' : ''}`}
            onClick={() => setShowCoPilot(!showCoPilot)}
          >
            🤖 AI Co-Pilot
          </button>
        </div>
      </header>
      
      {/* Main layout */}
      <div className="control-layout">
        {/* Left sidebar - Decision feed */}
        <aside className="sidebar-left">
          <DecisionFeed decisions={liveDecisions} maxItems={8} />
        </aside>
        
        {/* Center - Main visualization */}
        <main className="main-content">
          {/* Zone tabs */}
          <div className="zone-tabs">
            <button 
              className={activeZone === 'globe' ? 'active' : ''}
              onClick={() => setActiveZone('globe')}
            >
              🌍 Globe
            </button>
            <button 
              className={activeZone === 'doctrine' ? 'active' : ''}
              onClick={() => setActiveZone('doctrine')}
            >
              ⚖️ Doctrine
            </button>
            <button 
              className={activeZone === 'visor' ? 'active' : ''}
              onClick={() => setActiveZone('visor')}
            >
              👁️ Visor
            </button>
            <button 
              className={activeZone === 'proof' ? 'active' : ''}
              onClick={() => setActiveZone('proof')}
            >
              📊 Proof
            </button>
          </div>
          
          {/* Zone content */}
          <div className="zone-content">
            <AnimatePresence mode="wait">
              {activeZone === 'globe' && (
                <motion.div
                  key="globe"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="zone-globe"
                >
                  <GlobeZone regions={regions} arcs={arcs} />
                </motion.div>
              )}
              
              {activeZone === 'doctrine' && (
                <motion.div
                  key="doctrine"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="zone-doctrine"
                >
                  <DoctrinePanel
                    activePolicy={doctrine.activePolicy.data || null}
                    policies={doctrine.policies.data || []}
                    onPolicyChange={(p) => console.log('Policy changed:', p)}
                    onSimulate={handleSimulate}
                    onDeploy={(id) => doctrine.deploy.mutate(id)}
                    simulationResult={simulationResult}
                    isSimulating={isSimulating}
                  />
                </motion.div>
              )}
              
              {activeZone === 'visor' && (
                <motion.div
                  key="visor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="zone-visor"
                >
                  <SmartVisor 
                    status={visorStatus}
                    recentDecisions={liveDecisions}
                  />
                </motion.div>
              )}
              
              {activeZone === 'proof' && (
                <motion.div
                  key="proof"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="zone-proof"
                >
                  <ProofWorkspace
                    decisions={liveDecisions}
                    onGenerateExport={handleGenerateExport}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
        
        {/* Right sidebar - Features */}
        <aside className="sidebar-right">
          <AnimatePresence>
            {showCounterfactual && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
              >
                <CounterfactualEngine onRunSimulation={handleCounterfactual} />
              </motion.div>
            )}
            
            {showCoPilot && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
              >
                <AICoPilot
                  activePolicy={doctrine.activePolicy.data || null}
                  onPolicyUpdate={(p) => console.log('Policy update:', p)}
                  onRequestSuggestions={handleCoPilotSuggestions}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {!showCounterfactual && !showCoPilot && (
            <div className="sidebar-empty">
              <div className="empty-icon">🚀</div>
              <p>Enable shock features from the header</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

// Main export with provider
export function CO2ControlPanel() {
  return (
    <QueryClientProvider client={queryClient}>
      <CO2ControlPanelInner />
    </QueryClientProvider>
  )
}

export default CO2ControlPanel
