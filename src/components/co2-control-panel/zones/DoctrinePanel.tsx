'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DoctrinePolicy, DoctrineWeights, SimulationResult } from '../types'

interface WeightSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  color: string
  icon: string
}

function WeightSlider({ label, value, onChange, color, icon }: WeightSliderProps) {
  return (
    <div className="weight-slider">
      <div className="slider-header">
        <span className="slider-icon">{icon}</span>
        <span className="slider-label">{label}</span>
        <span className="slider-value" style={{ color }}>{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="slider-input"
        style={{ 
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.1) ${value}%, rgba(255,255,255,0.1) 100%)` 
        }}
      />
    </div>
  )
}

function PolicyCard({ 
  policy, 
  isActive, 
  onActivate, 
  onSimulate 
}: { 
  policy: DoctrinePolicy
  isActive: boolean
  onActivate: () => void
  onSimulate: () => void
}) {
  return (
    <motion.div 
      className={`policy-card ${isActive ? 'active' : ''} ${policy.status}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="policy-header">
        <span className="policy-version">v{policy.version}</span>
        <span className={`policy-status-badge ${policy.status}`}>
          {policy.status}
        </span>
      </div>
      
      <h4 className="policy-name">{policy.name}</h4>
      
      <div className="policy-weights-preview">
        <div className="weight-bar">
          <div className="weight-segment carbon" style={{ width: `${policy.weights.carbon}%` }} />
          <div className="weight-segment water" style={{ width: `${policy.weights.water}%` }} />
          <div className="weight-segment latency" style={{ width: `${policy.weights.latency}%` }} />
          <div className="weight-segment cost" style={{ width: `${policy.weights.cost}%` }} />
        </div>
      </div>
      
      <div className="policy-constraints">
        <span className="constraint">
          ≤ {policy.maxLatency}ms latency
        </span>
        <span className="constraint">
          ≥ {policy.minRenewable}% renewable
        </span>
      </div>
      
      {policy.approvedBy && (
        <div className="policy-approval">
          Approved by {policy.approvedBy}
          {policy.approvedAt && (
            <span className="approval-date">
              {' '}{new Date(policy.approvedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
      
      <div className="policy-actions">
        {!isActive && policy.status === 'active' && (
          <button className="btn-activate" onClick={onActivate}>
            Activate
          </button>
        )}
        {policy.status === 'draft' && (
          <>
            <button className="btn-simulate" onClick={onSimulate}>
              Simulate
            </button>
            <button className="btn-submit">
              Submit for Approval
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

function SimulationResults({ result }: { result: SimulationResult }) {
  const recommendationColor = {
    deploy: '#00ff88',
    review: '#ffaa00',
    reject: '#ff4444',
  }[result.recommendation]
  
  return (
    <motion.div 
      className="simulation-results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4>Simulation Results (30-day backtest)</h4>
      
      <div className="simulation-metrics">
        <div className="sim-metric">
          <span className="sim-label">Workloads</span>
          <span className="sim-value">{result.workloadsSimulated.toLocaleString()}</span>
        </div>
        
        <div className={`sim-metric ${result.carbonDelta > 0 ? 'positive' : 'negative'}`}>
          <span className="sim-label">Carbon Impact</span>
          <span className="sim-value">
            {result.carbonDelta > 0 ? '+' : ''}{result.carbonDelta.toFixed(1)}%
          </span>
        </div>
        
        <div className={`sim-metric ${result.latencyDelta < 0 ? 'positive' : 'negative'}`}>
          <span className="sim-label">Latency Impact</span>
          <span className="sim-value">
            {result.latencyDelta > 0 ? '+' : ''}{result.latencyDelta.toFixed(1)}%
          </span>
        </div>
        
        <div className={`sim-metric ${result.costDelta < 0 ? 'positive' : 'negative'}`}>
          <span className="sim-label">Cost Impact</span>
          <span className="sim-value">
            {result.costDelta > 0 ? '+' : ''}{result.costDelta.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="recommendation" style={{ borderColor: recommendationColor }}>
        <div className="rec-header">
          <span className="rec-label">Recommendation</span>
          <span className="confidence">{result.confidence}% confidence</span>
        </div>
        <div className="rec-value" style={{ color: recommendationColor }}>
          {result.recommendation.toUpperCase()}
        </div>
      </div>
    </motion.div>
  )
}

export function DoctrinePanel({
  activePolicy,
  policies,
  onPolicyChange,
  onSimulate,
  onDeploy,
  simulationResult,
  isSimulating,
}: {
  activePolicy: DoctrinePolicy | null
  policies: DoctrinePolicy[]
  onPolicyChange: (policy: DoctrinePolicy) => void
  onSimulate: (policy: DoctrinePolicy) => void
  onDeploy: (policyId: string) => void
  simulationResult: SimulationResult | null
  isSimulating: boolean
}) {
  const [editingPolicy, setEditingPolicy] = useState<DoctrinePolicy | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  
  const handleWeightChange = useCallback((key: keyof DoctrineWeights, value: number) => {
    if (!editingPolicy) return
    
    // Normalize weights to sum to 100
    const current = editingPolicy.weights
    const oldValue = current[key]
    const diff = value - oldValue
    const otherKeys = (Object.keys(current) as Array<keyof DoctrineWeights>)
      .filter(k => k !== key)
    
    const totalOthers = otherKeys.reduce((sum, k) => sum + current[k], 0)
    
    const newWeights = { ...current, [key]: value }
    
    // Distribute the difference proportionally
    if (totalOthers > 0) {
      otherKeys.forEach(k => {
        const proportion = current[k] / totalOthers
        newWeights[k] = Math.max(0, Math.round(current[k] - diff * proportion))
      })
    }
    
    // Ensure sum is exactly 100
    const sum = Object.values(newWeights).reduce((a, b) => a + b, 0)
    if (sum !== 100) {
      const adjustment = 100 - sum
      newWeights.carbon = Math.max(0, newWeights.carbon + adjustment)
    }
    
    setEditingPolicy({
      ...editingPolicy,
      weights: newWeights,
    })
  }, [editingPolicy])
  
  const policyToEdit = editingPolicy || activePolicy
  
  return (
    <div className="doctrine-panel">
      <div className="panel-header">
        <h3>Doctrine Control</h3>
        <div className="header-actions">
          <button 
            className="btn-history"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        </div>
      </div>
      
      <div className="panel-content">
        {/* Active doctrine editor */}
        {policyToEdit && !showHistory && (
          <div className="doctrine-editor">
            <div className="editor-header">
              <input
                type="text"
                value={policyToEdit.name}
                onChange={(e) => setEditingPolicy({
                  ...policyToEdit,
                  name: e.target.value,
                })}
                className="policy-name-input"
                placeholder="Policy Name"
              />
              <span className="version-badge">
                {editingPolicy ? 'DRAFT' : `v${policyToEdit.version}`}
              </span>
            </div>
            
            {/* Weight sliders */}
            <div className="weights-section">
              <h4>Optimization Weights</h4>
              <WeightSlider
                label="Carbon Reduction"
                value={policyToEdit.weights.carbon}
                onChange={(v) => handleWeightChange('carbon', v)}
                color="#00ff88"
                icon="🌱"
              />
              <WeightSlider
                label="Water Conservation"
                value={policyToEdit.weights.water}
                onChange={(v) => handleWeightChange('water', v)}
                color="#00aaff"
                icon="💧"
              />
              <WeightSlider
                label="Latency Performance"
                value={policyToEdit.weights.latency}
                onChange={(v) => handleWeightChange('latency', v)}
                color="#ffaa00"
                icon="⚡"
              />
              <WeightSlider
                label="Cost Efficiency"
                value={policyToEdit.weights.cost}
                onChange={(v) => handleWeightChange('cost', v)}
                color="#ff66aa"
                icon="💰"
              />
            </div>
            
            {/* Constraints */}
            <div className="constraints-section">
              <h4>Hard Constraints</h4>
              <div className="constraint-inputs">
                <label>
                  Max Latency
                  <input
                    type="number"
                    value={policyToEdit.maxLatency}
                    onChange={(e) => setEditingPolicy({
                      ...policyToEdit,
                      maxLatency: parseInt(e.target.value),
                    })}
                  />
                  <span>ms</span>
                </label>
                <label>
                  Min Renewable
                  <input
                    type="number"
                    value={policyToEdit.minRenewable}
                    onChange={(e) => setEditingPolicy({
                      ...policyToEdit,
                      minRenewable: parseInt(e.target.value),
                    })}
                  />
                  <span>%</span>
                </label>
                <label>
                  Max Cost Multiplier
                  <input
                    type="number"
                    step="0.1"
                    value={policyToEdit.maxCost}
                    onChange={(e) => setEditingPolicy({
                      ...policyToEdit,
                      maxCost: parseFloat(e.target.value),
                    })}
                  />
                  <span>x</span>
                </label>
              </div>
            </div>
            
            {/* Simulation button */}
            {editingPolicy && (
              <div className="editor-actions">
                <button 
                  className="btn-simulate-primary"
                  onClick={() => onSimulate(editingPolicy)}
                  disabled={isSimulating}
                >
                  {isSimulating ? 'Simulating...' : '▶ Run 30-Day Simulation'}
                </button>
                <button 
                  className="btn-save"
                  onClick={() => onPolicyChange(editingPolicy)}
                >
                  Save Draft
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Simulation results */}
        <AnimatePresence>
          {simulationResult && (
            <SimulationResults result={simulationResult} />
          )}
        </AnimatePresence>
        
        {/* Policy history */}
        {showHistory && (
          <div className="policy-history">
            <h4>Policy History</h4>
            <div className="policy-list">
              {policies.map((policy) => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  isActive={activePolicy?.id === policy.id}
                  onActivate={() => onDeploy(policy.id)}
                  onSimulate={() => setEditingPolicy(policy)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
