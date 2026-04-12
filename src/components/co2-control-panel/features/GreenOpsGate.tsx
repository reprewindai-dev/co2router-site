'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GreenOpsGate as GreenOpsGateType } from '../types'

function GateCard({
  gate,
  onViewDetails,
}: {
  gate: GreenOpsGateType
  onViewDetails: () => void
}) {
  const statusConfig = {
    pass: { color: '#00ff88', icon: '✓', label: 'APPROVED' },
    warn: { color: '#ffaa00', icon: '⚠', label: 'WARNING' },
    block: { color: '#ff4444', icon: '✕', label: 'BLOCKED' },
  }
  
  const config = statusConfig[gate.status]
  
  return (
    <motion.div
      className={`gate-card ${gate.status}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="gate-header">
        <div className="gate-status" style={{ color: config.color }}>
          <span className="status-icon">{config.icon}</span>
          <span className="status-label">{config.label}</span>
        </div>
        <span className="gate-repo">{gate.repo}</span>
      </div>
      
      <div className="gate-pr">
        <span className="pr-label">Pull Request</span>
        <span className="pr-number">#{gate.prNumber}</span>
      </div>
      
      <div className="gate-estimate">
        <div className="estimate-bar">
          <div 
            className="estimate-fill"
            style={{ 
              width: `${Math.min(100, (gate.carbonEstimate / gate.threshold) * 100)}%`,
              background: gate.status === 'pass' ? '#00ff88' : gate.status === 'warn' ? '#ffaa00' : '#ff4444'
            }}
          />
        </div>
        <div className="estimate-values">
          <span>{gate.carbonEstimate.toFixed(2)} kg CO₂</span>
          <span>threshold: {gate.threshold} kg</span>
        </div>
      </div>
      
      {gate.recommendations.length > 0 && (
        <div className="gate-recommendations">
          {gate.recommendations.map((rec, i) => (
            <div key={i} className="recommendation">• {rec}</div>
          ))}
        </div>
      )}
      
      <button className="btn-view-details" onClick={onViewDetails}>
        View Details
      </button>
    </motion.div>
  )
}

export function GreenOpsGate({
  onCheckRepo,
}: {
  onCheckRepo: (repo: string) => Promise<GreenOpsGateType[]>
}) {
  const [repo, setRepo] = useState('')
  const [gates, setGates] = useState<GreenOpsGateType[]>([])
  const [loading, setLoading] = useState(false)
  
  const checkRepo = useCallback(async () => {
    if (!repo) return
    
    setLoading(true)
    try {
      const results = await onCheckRepo(repo)
      setGates(results)
    } finally {
      setLoading(false)
    }
  }, [repo, onCheckRepo])
  
  return (
    <div className="greenops-gate">
      <div className="gate-header-section">
        <h3>GreenOps CI/CD Gate</h3>
        <p>Carbon-aware gating for GitHub Actions</p>
      </div>
      
      <div className="gate-checker">
        <input
          type="text"
          placeholder="username/repo"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && checkRepo()}
        />
        <button 
          onClick={checkRepo}
          disabled={loading || !repo}
        >
          {loading ? 'Checking...' : 'Check Repo'}
        </button>
      </div>
      
      <div className="gates-list">
        <AnimatePresence>
          {gates.map((gate) => (
            <GateCard
              key={`${gate.repo}-${gate.prNumber}`}
              gate={gate}
              onViewDetails={() => console.log('View details:', gate)}
            />
          ))}
        </AnimatePresence>
        
        {gates.length === 0 && !loading && (
          <div className="empty-gates">
            <div className="empty-icon">🌿</div>
            <p>Enter a repository to check active PRs</p>
          </div>
        )}
      </div>
      
      <div className="gate-info">
        <h4>How it works</h4>
        <ul>
          <li>Estimates carbon impact of changes</li>
          <li>Blocks PRs exceeding carbon thresholds</li>
          <li>Suggests optimizations</li>
          <li>Annotates PRs with carbon data</li>
        </ul>
      </div>
    </div>
  )
}
