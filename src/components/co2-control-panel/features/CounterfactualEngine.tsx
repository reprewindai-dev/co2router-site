'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CounterfactualResult } from '../types'

function ImpactBar({ 
  label, 
  actual, 
  counterfactual, 
  unit,
  color,
}: { 
  label: string
  actual: number
  counterfactual: number
  unit: string
  color: string
}) {
  const max = Math.max(actual, counterfactual)
  const actualPct = (actual / max) * 100
  const counterPct = (counterfactual / max) * 100
  const delta = counterfactual - actual
  const deltaPct = max > 0 ? ((delta / max) * 100).toFixed(0) : '0'
  
  return (
    <div className="impact-bar">
      <div className="bar-header">
        <span className="bar-label">{label}</span>
        <span className="bar-delta" style={{ color }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit} ({deltaPct}%)
        </span>
      </div>
      
      <div className="bar-visualization">
        {/* Counterfactual (without router) */}
        <div className="bar-track">
          <motion.div 
            className="bar-segment counterfactual"
            initial={{ width: 0 }}
            animate={{ width: `${counterPct}%` }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <span className="bar-value">{counterfactual.toFixed(1)}</span>
          </motion.div>
          <span className="bar-legend">Without CO2 Router</span>
        </div>
        
        {/* Actual (with router) */}
        <div className="bar-track">
          <motion.div 
            className="bar-segment actual"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${actualPct}%` }}
            transition={{ duration: 1 }}
          >
            <span className="bar-value">{actual.toFixed(1)}</span>
          </motion.div>
          <span className="bar-legend">Actual (with CO2 Router)</span>
        </div>
      </div>
    </div>
  )
}

function ContributorsList({ contributors }: { contributors: string[] }) {
  return (
    <div className="contributors-list">
      <h5>Top Contributors to Savings</h5>
      <div className="contributors-grid">
        {contributors.map((contributor, index) => (
          <motion.div
            key={contributor}
            className="contributor-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <span className="contributor-rank">#{index + 1}</span>
            <span className="contributor-name">{contributor}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function CounterfactualEngine({
  onRunSimulation,
}: {
  onRunSimulation: (params: { months: number }) => Promise<CounterfactualResult>
}) {
  const [months, setMonths] = useState(1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<CounterfactualResult | null>(null)
  const [history, setHistory] = useState<CounterfactualResult[]>([])
  
  const runSimulation = useCallback(async () => {
    setRunning(true)
    
    try {
      const result = await onRunSimulation({ months })
      setResult(result)
      setHistory(prev => [result, ...prev].slice(0, 5))
    } finally {
      setRunning(false)
    }
  }, [months, onRunSimulation])
  
  return (
    <div className="counterfactual-engine">
      <div className="engine-header">
        <h3>Counterfactual Engine</h3>
        <div className="engine-subtitle">
          &ldquo;What would your emissions be without CO2 Router?&rdquo;
        </div>
      </div>
      
      {/* Controls */}
      <div className="engine-controls">
        <div className="period-selector">
          <label>Analyze period:</label>
          <div className="period-buttons">
            {[1, 3, 6, 12].map(m => (
              <button
                key={m}
                className={months === m ? 'active' : ''}
                onClick={() => setMonths(m)}
              >
                {m} month{m > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>
        
        <button 
          className="btn-run-simulation"
          onClick={runSimulation}
          disabled={running}
        >
          {running ? 'Calculating counterfactual...' : '▶ Run Analysis'}
        </button>
      </div>
      
      {/* Results */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            className="simulation-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Headline stat */}
            <div className="headline-stat">
              <motion.div 
                className="stat-circle"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <span className="circle-value">{result.percentage.toFixed(0)}%</span>
                <span className="circle-label">emissions reduced</span>
              </motion.div>
              
              <div className="headline-details">
                <div className="detail-row">
                  <span className="detail-label">Without CO2 Router:</span>
                  <span className="detail-value counterfactual">
                    {result.withoutRouter.toFixed(2)} tonnes
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Actual emissions:</span>
                  <span className="detail-value actual">
                    {result.actualEmissions.toFixed(2)} tonnes
                  </span>
                </div>
                <div className="detail-row highlight">
                  <span className="detail-label">You saved:</span>
                  <span className="detail-value saved">
                    {result.delta.toFixed(2)} tonnes CO₂
                  </span>
                </div>
              </div>
            </div>
            
            {/* Impact breakdown */}
            <div className="impact-breakdown">
              <h4>Impact Breakdown</h4>
              
              <ImpactBar
                label="Carbon Emissions"
                actual={result.actualEmissions}
                counterfactual={result.withoutRouter}
                unit="tonnes"
                color="#00ff88"
              />
              
              <ImpactBar
                label="Workloads Routed"
                actual={result.workloadCount}
                counterfactual={Math.floor(result.workloadCount * 1.5)}
                unit="jobs"
                color="#00aaff"
              />
            </div>
            
            {/* Contributors */}
            {result.topContributors.length > 0 && (
              <ContributorsList contributors={result.topContributors} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* History */}
      {history.length > 1 && (
        <div className="history-section">
          <h4>Previous Analyses</h4>
          <div className="history-list">
            {history.slice(1).map((h, i) => (
              <div key={i} className="history-item">
                <span className="history-period">{h.period}</span>
                <span className="history-savings">{h.delta.toFixed(2)} tonnes saved</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!result && !running && (
        <div className="empty-state">
          <div className="empty-icon">🔮</div>
          <p>Run your first counterfactual analysis to see what CO2 Router has saved you</p>
        </div>
      )}
    </div>
  )
}
