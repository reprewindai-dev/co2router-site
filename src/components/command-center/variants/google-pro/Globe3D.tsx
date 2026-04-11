'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

const ZOOM_DISTANCE: Record<1 | 2 | 3, number> = {
  1: 3.15,
  2: 2.58,
  3: 1.96,
}

const GLOBE_WORLD_SCALE = 0.01
type ThreeGlobeInstance = any

type ThemeLike = {
  bg: string
  primary: string
  globeTexture?: string
  globeBump?: string
}

type GlobeNode = {
  id: string
  name: string
  lat: number
  lng: number
  status: 'Active' | 'Marginal' | 'Blocked'
}

type GlobeFlow = {
  id: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  action: 'Run now' | 'Reroute' | 'Blocked'
}

function GlobeScene({
  countries,
  zoomLevel,
  theme,
  nodes,
  flows,
  onReady,
}: {
  countries: Array<Record<string, unknown>>
  zoomLevel: 1 | 2 | 3
  theme: ThemeLike
  nodes: GlobeNode[]
  flows: GlobeFlow[]
  onReady?: (globe: ThreeGlobeInstance | null) => void
}) {
  const controlsRef = useRef<any>(null)
  const globeRef = useRef<ThreeGlobeInstance | null>(null)
  const { camera } = useThree()

  const pointData = useMemo(
    () =>
      nodes.map((node) => ({
        lat: node.lat,
        lng: node.lng,
        color:
          node.status === 'Blocked'
            ? '#f87171'
            : node.status === 'Marginal'
              ? '#fbbf24'
              : '#4ade80',
        radius: node.status === 'Blocked' ? 1.2 : node.status === 'Marginal' ? 0.95 : 0.8,
      })),
    [nodes],
  )

  useEffect(() => {
    let active = true

    void import('three-globe').then((module) => {
      if (!active) return
      const GlobeCtor = module.default
      const globe = new GlobeCtor()
        .globeImageUrl(theme.globeTexture ?? '/halogrid/earth-night.jpg')
        .bumpImageUrl(theme.globeBump ?? '/halogrid/earth-topology.png')
        .hexPolygonsData(countries)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.3)
        .hexPolygonColor(() => '#0f1f42')
        .showAtmosphere(true)
        .atmosphereColor(theme.primary)
        .atmosphereAltitude(0.16)
        .pointsData(pointData)
        .pointLat((item: object) => (item as { lat: number }).lat)
        .pointLng((item: object) => (item as { lng: number }).lng)
        .pointColor((item: object) => (item as { color: string }).color)
        .pointAltitude(0.02)
        .pointRadius((item: object) => (item as { radius: number }).radius)
        .arcsData(flows)
        .arcStartLat((item: object) => (item as GlobeFlow).startLat)
        .arcStartLng((item: object) => (item as GlobeFlow).startLng)
        .arcEndLat((item: object) => (item as GlobeFlow).endLat)
        .arcEndLng((item: object) => (item as GlobeFlow).endLng)
        .arcColor((item: object) =>
          (item as GlobeFlow).action === 'Blocked'
            ? ['rgba(248,113,113,0.12)', '#f87171']
            : (item as GlobeFlow).action === 'Reroute'
              ? ['rgba(56,189,248,0.12)', '#38bdf8', 'rgba(74,222,128,0.22)']
              : ['rgba(74,222,128,0.10)', '#4ade80'],
        )
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(2200)
        .arcStroke((item: object) => ((item as GlobeFlow).action === 'Reroute' ? 0.8 : 0.55))

      globeRef.current = globe
      onReady?.(globe)
    })

    return () => {
      active = false
      onReady?.(null)
      globeRef.current = null
    }
  }, [countries, flows, onReady, pointData, theme.globeBump, theme.globeTexture, theme.primary])

  useFrame(() => {
    const controls = controlsRef.current
    if (controls) {
      camera.position.lerp(
        new THREE.Vector3(camera.position.x, camera.position.y, ZOOM_DISTANCE[zoomLevel]),
        0.05,
      )
      controls.update()
    }
  })

  return (
    <group scale={[GLOBE_WORLD_SCALE, GLOBE_WORLD_SCALE, GLOBE_WORLD_SCALE]}>
      {globeRef.current ? <primitive object={globeRef.current} /> : null}
      <mesh scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[100, 64, 64]} />
        <meshBasicMaterial color={theme.primary} transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.18}
      />
    </group>
  )
}

export default function Globe3D({
  mode,
  zoomLevel = 1,
  theme,
  nodes,
  flows,
  onReady,
}: {
  mode: 'hybrid' | 'theater' | 'presentation'
  zoomLevel?: 1 | 2 | 3
  theme: ThemeLike
  nodes: GlobeNode[]
  flows: GlobeFlow[]
  onReady?: (globe: ThreeGlobeInstance | null) => void
  onNodeHover?: (node: GlobeNode | null) => void
  onNodeClick?: (node: GlobeNode | null) => void
}) {
  const [countries, setCountries] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    let active = true
    fetch('/halogrid/countries.geojson')
      .then((response) => response.json())
      .then((json) => {
        if (active) setCountries(Array.isArray(json.features) ? json.features : [])
      })
      .catch(() => {
        if (active) setCountries([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="h-full w-full" style={{ backgroundColor: theme.bg }}>
      <Canvas
        camera={{ position: [0, 0, ZOOM_DISTANCE[1]], fov: mode === 'presentation' ? 33 : 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 10]} intensity={0.5} />
        <Stars radius={300} depth={50} count={1500} factor={4} saturation={0} fade speed={0.5} />
        <GlobeScene
          countries={countries}
          zoomLevel={zoomLevel}
          theme={theme}
          nodes={nodes}
          flows={flows}
          onReady={onReady}
        />
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={0.8} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
