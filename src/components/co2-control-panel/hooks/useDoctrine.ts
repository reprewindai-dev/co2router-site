'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DoctrinePolicy, DoctrineWeights, SimulationResult } from '../types'

async function fetchActivePolicy(): Promise<DoctrinePolicy> {
  const res = await fetch('/api/control-surface/doctrine/active', {
    cache: 'no-store'
  })
  if (!res.ok) throw new Error('Failed to fetch active policy')
  return res.json()
}

async function fetchPolicies(): Promise<DoctrinePolicy[]> {
  const res = await fetch('/api/control-surface/doctrine/policies', {
    cache: 'no-store'
  })
  if (!res.ok) throw new Error('Failed to fetch policies')
  return res.json()
}

async function simulatePolicy(policy: DoctrinePolicy, days: number = 30): Promise<SimulationResult> {
  const res = await fetch('/api/control-surface/doctrine/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ policy, backtestDays: days }),
  })
  if (!res.ok) throw new Error('Simulation failed')
  return res.json()
}

async function deployPolicy(policyId: string): Promise<void> {
  const res = await fetch(`/api/control-surface/doctrine/deploy/${policyId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Deployment failed')
}

export function useDoctrine() {
  const queryClient = useQueryClient()

  const activePolicy = useQuery<DoctrinePolicy>({
    queryKey: ['co2-doctrine-active'],
    queryFn: fetchActivePolicy,
    refetchInterval: 30000,
  })

  const policies = useQuery<DoctrinePolicy[]>({
    queryKey: ['co2-doctrine-policies'],
    queryFn: fetchPolicies,
    refetchInterval: 60000,
  })

  const simulate = useMutation<SimulationResult, Error, { policy: DoctrinePolicy; days?: number }>({
    mutationFn: ({ policy, days }) => simulatePolicy(policy, days),
  })

  const deploy = useMutation<void, Error, string>({
    mutationFn: deployPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co2-doctrine-active'] })
      queryClient.invalidateQueries({ queryKey: ['co2-doctrine-policies'] })
    },
  })

  const createDraft = useCallback((weights: DoctrineWeights): DoctrinePolicy => {
    return {
      id: `draft-${Date.now()}`,
      version: '0.0.0-draft',
      name: 'New Policy Draft',
      weights,
      maxLatency: 500,
      maxCost: 1.5,
      minRenewable: 50,
      status: 'draft',
    }
  }, [])

  return {
    activePolicy,
    policies,
    simulate,
    deploy,
    createDraft,
  }
}
