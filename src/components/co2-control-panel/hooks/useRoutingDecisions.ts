'use client'

import { useQuery } from '@tanstack/react-query'
import type { RoutingDecision, RegionNode, RoutingArc } from '../types'

interface RoutingSnapshot {
  decisions: RoutingDecision[]
  regions: RegionNode[]
  arcs: RoutingArc[]
  totals: {
    carbonSaved: number
    waterSaved: number
    latency: number
    cost: number
    workloadsRouted: number
  }
}

async function fetchRoutingSnapshot(): Promise<RoutingSnapshot> {
  const res = await fetch('/api/control-surface/routing-snapshot', {
    cache: 'no-store'
  })
  if (!res.ok) throw new Error('Failed to fetch routing snapshot')
  return res.json()
}

export function useRoutingDecisions(refreshInterval: number = 5000) {
  return useQuery<RoutingSnapshot>({
    queryKey: ['co2-routing-snapshot'],
    queryFn: fetchRoutingSnapshot,
    refetchInterval: refreshInterval,
    staleTime: refreshInterval / 2,
    retry: 3,
    retryDelay: 1000,
  })
}

export function useRegionStatus(regionId: string) {
  return useQuery<RegionNode>({
    queryKey: ['co2-region', regionId],
    queryFn: async () => {
      const res = await fetch(`/api/control-surface/region/${regionId}`, {
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to fetch region status')
      return res.json()
    },
    refetchInterval: 10000,
    enabled: !!regionId,
  })
}
