'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CSRDExport, RoutingDecision } from '../types'

interface ProofVerification {
  hash: string
  verified: boolean
  timestamp: number
  blockHeight?: number
  validator: string
}

function ExportCard({ 
  export_, 
  onDownload, 
  onVerify 
}: { 
  export_: CSRDExport
  onDownload: () => void
  onVerify: () => void
}) {
  return (
    <motion.div 
      className="export-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="export-header">
        <div className="export-period">{export_.reportingPeriod}</div>
        <div className={`export-badge ${export_.thirdPartyVerified ? 'verified' : 'pending'}`}>
          {export_.thirdPartyVerified ? '✓ Verified' : '⏳ Pending'}
        </div>
      </div>
      
      <div className="export-metrics">
        <div className="metric">
          <span className="metric-value">{(export_.totalEmissions / 1000).toFixed(2)}</span>
          <span className="metric-label">tonnes CO₂</span>
        </div>
        <div className="metric">
          <span className="metric-value">{(export_.avoidanceClaims / 1000).toFixed(2)}</span>
          <span className="metric-label">tonnes avoided</span>
        </div>
        <div className="metric">
          <span className="metric-value">{export_.proofHashes.length}</span>
          <span className="metric-label">proofs</span>
        </div>
      </div>
      
      <div className="export-category">
        <span className="category-label">Category</span>
        <span className="category-value">{export_.scope3Category}</span>
      </div>
      
      <div className="export-actions">
        <button className="btn-download" onClick={onDownload}>
          ↓ Download XBRL
        </button>
        <button className="btn-verify" onClick={onVerify}>
          🔍 Verify Chain
        </button>
      </div>
    </motion.div>
  )
}

function ProofChain({ 
  hashes, 
  verifications 
}: { 
  hashes: string[]
  verifications: Map<string, ProofVerification>
}) {
  return (
    <div className="proof-chain">
      <h4>Cryptographic Proof Chain</h4>
      <div className="chain-visualization">
        {hashes.map((hash, index) => {
          const verification = verifications.get(hash)
          const isVerified = verification?.verified ?? false
          
          return (
            <motion.div 
              key={hash}
              className={`chain-link ${isVerified ? 'verified' : 'unverified'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="link-connector" />
              <div className="link-node">
                <span className="link-icon">{isVerified ? '✓' : '?'}</span>
              </div>
              <div className="link-details">
                <span className="link-hash">
                  {hash.slice(0, 12)}...{hash.slice(-8)}
                </span>
                {verification && (
                  <span className="link-meta">
                    Block {verification.blockHeight} • {new Date(verification.timestamp).toLocaleDateString()}
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function VerificationPanel({ 
  hash, 
  onClose 
}: { 
  hash: string
  onClose: () => void
}) {
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<ProofVerification | null>(null)
  
  const verify = useCallback(async () => {
    setVerifying(true)
    
    // Call verification API
    const res = await fetch(`/api/control-surface/verify/${hash}`)
    const verification = await res.json()
    
    setResult(verification)
    setVerifying(false)
  }, [hash])
  
  return (
    <motion.div 
      className="verification-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="panel-header">
        <h4>Proof Verification</h4>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>
      
      <div className="verification-hash">
        <span className="hash-label">Hash</span>
        <code className="hash-value">{hash}</code>
      </div>
      
      {!result && (
        <button 
          className="btn-verify-primary"
          onClick={verify}
          disabled={verifying}
        >
          {verifying ? 'Verifying on-chain...' : 'Verify on Blockchain'}
        </button>
      )}
      
      {result && (
        <div className={`verification-result ${result.verified ? 'success' : 'failure'}`}>
          <div className="result-icon">{result.verified ? '✓' : '✕'}</div>
          <div className="result-text">
            {result.verified 
              ? 'Proof verified on blockchain' 
              : 'Verification failed'}
          </div>
          {result.blockHeight && (
            <div className="result-meta">
              Block height: {result.blockHeight}
              <br />
              Validator: {result.validator}
              <br />
              {new Date(result.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export function ProofWorkspace({
  decisions,
  onGenerateExport,
}: {
  decisions: RoutingDecision[]
  onGenerateExport: (params: { startDate: string; endDate: string }) => Promise<CSRDExport>
}) {
  const [exports, setExports] = useState<CSRDExport[]>([])
  const [generating, setGenerating] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [verifications, setVerifications] = useState<Map<string, ProofVerification>>(new Map())
  const [activeVerification, setActiveVerification] = useState<string | null>(null)
  
  const generateExport = useCallback(async () => {
    setGenerating(true)
    
    try {
      const export_ = await onGenerateExport({
        startDate: dateRange.start,
        endDate: dateRange.end,
      })
      
      setExports(prev => [export_, ...prev])
    } finally {
      setGenerating(false)
    }
  }, [dateRange, onGenerateExport])
  
  const verifyChain = useCallback(async (hashes: string[]) => {
    // Batch verify all hashes
    const results = await Promise.all(
      hashes.map(async (hash) => {
        const res = await fetch(`/api/control-surface/verify/${hash}`)
        return res.json() as Promise<ProofVerification>
      })
    )
    
    const newVerifications = new Map(verifications)
    results.forEach((result, i) => {
      newVerifications.set(hashes[i], result)
    })
    
    setVerifications(newVerifications)
  }, [verifications])
  
  // Calculate total stats from decisions
  const stats = {
    totalEmissions: decisions.reduce((sum, d) => sum + d.selectedCarbon, 0),
    totalAvoided: decisions.reduce((sum, d) => sum + Math.max(0, d.delta), 0),
    proofCount: decisions.length,
  }
  
  return (
    <div className="proof-workspace">
      <div className="workspace-header">
        <h3>Proof Workspace</h3>
        <div className="workspace-subtitle">
          CSRD-compliant Scope 3 exports with cryptographic verification
        </div>
      </div>
      
      {/* Stats overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{(stats.totalEmissions / 1000).toFixed(2)}</span>
          <span className="stat-label">tonnes emitted</span>
        </div>
        <div className="stat-card highlight">
          <span className="stat-value">{(stats.totalAvoided / 1000).toFixed(2)}</span>
          <span className="stat-label">tonnes avoided</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.proofCount}</span>
          <span className="stat-label">cryptographic proofs</span>
        </div>
      </div>
      
      {/* Generate new export */}
      <div className="generate-section">
        <h4>Generate New Export</h4>
        <div className="date-inputs">
          <label>
            Start Date
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </label>
          <label>
            End Date
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </label>
        </div>
        <button 
          className="btn-generate"
          onClick={generateExport}
          disabled={generating}
        >
          {generating ? 'Generating XBRL...' : 'Generate CSRD Export'}
        </button>
      </div>
      
      {/* Export list */}
      <div className="exports-section">
        <h4>Generated Reports</h4>
        <div className="exports-list">
          <AnimatePresence>
            {exports.map((export_) => (
              <ExportCard
                key={export_.reportingPeriod + export_.scope3Category}
                export_={export_}
                onDownload={() => {
                  // Trigger download
                  const blob = new Blob([JSON.stringify(export_, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `csrd-export-${export_.reportingPeriod}.json`
                  a.click()
                }}
                onVerify={() => verifyChain(export_.proofHashes)}
              />
            ))}
          </AnimatePresence>
          
          {exports.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No exports generated yet</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Proof chain visualization */}
      {exports.length > 0 && exports[0].proofHashes.length > 0 && (
        <ProofChain 
          hashes={exports[0].proofHashes} 
          verifications={verifications}
        />
      )}
      
      {/* Active verification panel */}
      <AnimatePresence>
        {activeVerification && (
          <VerificationPanel
            hash={activeVerification}
            onClose={() => setActiveVerification(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
