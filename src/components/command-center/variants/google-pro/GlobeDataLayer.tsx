'use client'

import { useEffect } from 'react'
import type ThreeGlobe from 'three-globe'

import type { HaloTheme } from './theme'
import { stateTone } from './theme'
import type { HalogridFlowView, HalogridRegionView } from './view-model'

export default function GlobeDataLayer(props: {
  globeInstance: ThreeGlobe | null
  regions: HalogridRegionView[]
  flows: HalogridFlowView[]
  theme: HaloTheme
  showArcs: boolean
  showRadar: boolean
}) {
  useEffect(() => {
    if (!props.globeInstance) return

    const ringData = props.showRadar
      ? props.regions.map((region) => ({
          lat: region.lat,
          lng: region.lng,
          color: stateTone(props.theme, region.state),
          maxRadius: region.state === 'blocked' ? 8 : region.state === 'marginal' ? 6 : 4.5,
          propagationSpeed: region.state === 'blocked' ? 1.5 : 0.9,
          repeatPeriod: region.state === 'blocked' ? 1100 : 1800,
        }))
      : []

    const flowData = props.showArcs
      ? props.flows
          .filter((flow) => flow.from && flow.to)
          .map((flow) => ({
            startLat: flow.from!.lat,
            startLng: flow.from!.lng,
            endLat: flow.to!.lat,
            endLng: flow.to!.lng,
            action: flow.mode === 'blocked' ? 'Blocked' : 'Reroute',
          }))
      : []

    props.globeInstance
      .ringsData(ringData)
      .ringLat((item: object) => (item as { lat: number }).lat)
      .ringLng((item: object) => (item as { lng: number }).lng)
      .ringColor((item: object) => (item as { color: string }).color)
      .ringMaxRadius((item: object) => (item as { maxRadius: number }).maxRadius)
      .ringPropagationSpeed((item: object) => (item as { propagationSpeed: number }).propagationSpeed)
      .ringRepeatPeriod((item: object) => (item as { repeatPeriod: number }).repeatPeriod)
      .arcsData(flowData)
      .arcStartLat((item: object) => (item as { startLat: number }).startLat)
      .arcStartLng((item: object) => (item as { startLng: number }).startLng)
      .arcEndLat((item: object) => (item as { endLat: number }).endLat)
      .arcEndLng((item: object) => (item as { endLng: number }).endLng)
      .arcColor((item: object) =>
        (item as { action: string }).action === 'Reroute'
          ? ['rgba(56,189,248,0.15)', props.theme.primary, 'rgba(74,222,128,0.30)']
          : ['rgba(248,113,113,0.18)', props.theme.danger],
      )
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2000)
      .arcStroke((item: object) => ((item as { action: string }).action === 'Reroute' ? 0.8 : 0.5))
  }, [props.flows, props.globeInstance, props.regions, props.showArcs, props.showRadar, props.theme])

  return null
}
