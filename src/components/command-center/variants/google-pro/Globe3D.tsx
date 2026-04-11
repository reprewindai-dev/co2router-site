'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import ThreeGlobe from 'three-globe'

import type { DisplayMode, HaloTheme } from './theme'
import { actionTone, stateTone } from './theme'
import type {
  HalogridFlowView,
  HalogridRegionView,
} from './view-model'

type ZoomLevel = 1 | 2 | 3

type HoverPayload = {
  regionId: string
  clientX: number
  clientY: number
} | null

type GeoJsonFeature = {
  properties?: Record<string, unknown>
  geometry: unknown
}

const ZOOM_DISTANCE: Record<ZoomLevel, number> = {
  1: 3.15,
  2: 2.58,
  3: 1.96,
}

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function formatHexOpacity(hex: string, opacity: string) {
  if (hex.startsWith('rgba')) return hex
  if (hex.startsWith('#') && hex.length === 7) return `${hex}${opacity}`
  return hex
}

function NodeMarker({
  region,
  theme,
  hovered,
  selected,
  onHoverRegion,
  onSelectRegion,
}: {
  region: HalogridRegionView
  theme: HaloTheme
  hovered: boolean
  selected: boolean
  onHoverRegion: (payload: HoverPayload) => void
  onSelectRegion: (id: string) => void
}) {
  const markerRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)

  const position = useMemo(
    () => latLngToVector3(region.lat, region.lng, 1.03),
    [region.lat, region.lng],
  )
  const tone = stateTone(theme, region.state)
  const toneColor = useMemo(() => new THREE.Color(tone), [tone])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (markerRef.current) {
      const base = selected ? 1.26 : hovered ? 1.12 : 1
      markerRef.current.scale.setScalar(
        base + Math.sin(t * 2.4 + region.pressurePct) * 0.035,
      )
    }
    if (haloRef.current) {
      const pulse = 0.75 + ((Math.sin(t * 2.1 + region.emphasis) + 1) / 2) * 0.95
      haloRef.current.scale.setScalar(pulse)
      const material = haloRef.current.material as THREE.MeshBasicMaterial
      material.opacity = selected ? 0.6 : hovered ? 0.48 : 0.34
    }
  })

  const handleHover = useCallback(
    (event: { clientX: number; clientY: number }) => {
      onHoverRegion({
        regionId: region.id,
        clientX: event.clientX,
        clientY: event.clientY,
      })
    },
    [onHoverRegion, region.id],
  )

  return (
    <group position={position}>
      <mesh ref={markerRef}>
        <sphereGeometry args={[selected ? 0.03 : hovered ? 0.025 : 0.02, 24, 24]} />
        <meshBasicMaterial color={toneColor} />
      </mesh>
      <pointLight color={toneColor} intensity={selected ? 3 : hovered ? 1.8 : 1} distance={0.46} />
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.032, 0.05, 64]} />
        <meshBasicMaterial color={toneColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        ref={hitRef}
        onClick={(event) => {
          event.stopPropagation()
          if (region.frameId) onSelectRegion(region.frameId)
        }}
        onPointerMove={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
          handleHover(event)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
          handleHover(event)
        }}
        onPointerOut={(event) => {
          event.stopPropagation()
          document.body.style.cursor = ''
          onHoverRegion(null)
        }}
      >
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

function GlobeRig({
  controlsRef,
  selectedRegion,
  zoomLevel,
  mode,
}: {
  controlsRef: React.MutableRefObject<unknown>
  selectedRegion: HalogridRegionView | null
  zoomLevel: ZoomLevel
  mode: DisplayMode | 'presentation'
}) {
  const { camera } = useThree()
  const desiredPositionRef = useRef<THREE.Vector3 | null>(null)
  const animatingRef = useRef(false)

  useEffect(() => {
    const distance =
      ZOOM_DISTANCE[zoomLevel] - (mode === 'presentation' ? 0.18 : 0)
    const defaultPosition = new THREE.Vector3(0.8, 0.36, distance)
      .normalize()
      .multiplyScalar(distance)

    desiredPositionRef.current = selectedRegion
      ? latLngToVector3(selectedRegion.lat, selectedRegion.lng, distance)
      : defaultPosition
    animatingRef.current = true
  }, [mode, selectedRegion, zoomLevel])

  useFrame((_, delta) => {
    const controls = controlsRef.current as {
      autoRotate?: boolean
      update?: () => void
    } | null
    const desiredPosition = desiredPositionRef.current
    if (animatingRef.current && desiredPosition) {
      const lerpAlpha = 1 - Math.pow(0.0008, delta)
      camera.position.lerp(desiredPosition, lerpAlpha)
      if (camera.position.distanceTo(desiredPosition) < 0.02) {
        camera.position.copy(desiredPosition)
        animatingRef.current = false
      }
      camera.lookAt(0, 0, 0)
    }
    if (controls?.update) controls.update()
  })

  return null
}

function GlobeScene({
  countries,
  theme,
  mode,
  regions,
  flows,
  selectedFrameId,
  hoveredRegionId,
  zoomLevel,
  showArcs,
  showNodes,
  showRadar,
  showHeat,
  stormMode,
  onHoverRegion,
  onSelectRegion,
}: {
  countries: GeoJsonFeature[]
  theme: HaloTheme
  mode: DisplayMode | 'presentation'
  regions: HalogridRegionView[]
  flows: HalogridFlowView[]
  selectedFrameId: string | null
  hoveredRegionId: string | null
  zoomLevel: ZoomLevel
  showArcs: boolean
  showNodes: boolean
  showRadar: boolean
  showHeat: boolean
  stormMode: boolean
  onHoverRegion: (payload: HoverPayload) => void
  onSelectRegion: (id: string) => void
}) {
  const globeRef = useRef<ThreeGlobe | null>(null)
  const controlsRef = useRef<unknown>(null)
  const [globe] = useState(() => new ThreeGlobe())

  const selectedRegion = useMemo(
    () => regions.find((region) => region.frameId === selectedFrameId) ?? null,
    [regions, selectedFrameId],
  )

  const arcData = useMemo(
    () =>
      showArcs
        ? flows
            .filter((flow) => flow.from && flow.to)
            .map((flow, index) => ({
              ...flow,
              startLat: flow.from!.lat,
              startLng: flow.from!.lng,
              endLat: flow.to!.lat,
              endLng: flow.to!.lng,
              color: actionTone(
                theme,
                flow.mode === 'blocked' ? 'deny' : flow.from?.action,
              ),
              initialGap: (index % 4) * 0.12,
            }))
        : [],
    [flows, showArcs, theme],
  )

  const ringData = useMemo(() => {
    if (!showRadar) return []
    const sourceRegions = stormMode
      ? [...regions]
          .sort((left, right) => right.pressurePct - left.pressurePct)
          .slice(0, 5)
      : regions

    return sourceRegions.map((region) => ({
      lat: region.lat,
      lng: region.lng,
      color: stateTone(theme, region.state),
      maxRadius:
        region.state === 'blocked' ? 10 : region.state === 'marginal' ? 7 : 5.5,
      propagationSpeed:
        region.state === 'blocked' ? 3.4 : region.state === 'marginal' ? 2.5 : 1.8,
      repeatPeriod:
        region.state === 'blocked' ? 1000 : region.state === 'marginal' ? 1600 : 2400,
    }))
  }, [regions, showRadar, stormMode, theme])

  const heatData = useMemo(() => {
    if (!showHeat) return []
    return [
      {
        points: regions.map((region) => ({
          lat: region.lat,
          lng: region.lng,
          weight: region.pressurePct / 100,
        })),
      },
    ]
  }, [regions, showHeat])

  useEffect(() => {
    globeRef.current = globe
    globe
      .globeImageUrl(theme.globeTexture)
      .bumpImageUrl(theme.globeBump)
      .showAtmosphere(true)
      .atmosphereColor(theme.globeAtmosphere)
      .atmosphereAltitude(mode === 'presentation' ? 0.21 : 0.17)
      .hexPolygonsData(countries)
      .hexPolygonGeoJsonGeometry((feature: object) =>
        (feature as GeoJsonFeature).geometry as never,
      )
      .hexPolygonResolution(() => 3)
      .hexPolygonMargin(() => 0.28)
      .hexPolygonUseDots(() => false)
      .hexPolygonCurvatureResolution(() => 5)
      .hexPolygonAltitude(() => (mode === 'presentation' ? 0.015 : 0.011))
      .hexPolygonColor(() => theme.globeCountry)
      .arcsData(arcData)
      .arcStartLat((item: object) => (item as { startLat: number }).startLat)
      .arcStartLng((item: object) => (item as { startLng: number }).startLng)
      .arcEndLat((item: object) => (item as { endLat: number }).endLat)
      .arcEndLng((item: object) => (item as { endLng: number }).endLng)
      .arcColor((item: object) => (item as { color: string }).color)
      .arcAltitude((item: object) => (item as { altitude: number }).altitude)
      .arcStroke((item: object) => (item as { stroke: number }).stroke)
      .arcDashLength((item: object) => (item as { dashLength: number }).dashLength)
      .arcDashGap((item: object) => (item as { dashGap: number }).dashGap)
      .arcDashInitialGap((item: object) =>
        (item as { initialGap: number }).initialGap,
      )
      .arcDashAnimateTime((item: object) =>
        (item as { dashAnimateTime: number }).dashAnimateTime,
      )
      .ringsData(ringData)
      .ringLat((item: object) => (item as { lat: number }).lat)
      .ringLng((item: object) => (item as { lng: number }).lng)
      .ringColor((item: object) => (item as { color: string }).color)
      .ringMaxRadius((item: object) =>
        (item as { maxRadius: number }).maxRadius,
      )
      .ringPropagationSpeed((item: object) =>
        (item as { propagationSpeed: number }).propagationSpeed,
      )
      .ringRepeatPeriod((item: object) =>
        (item as { repeatPeriod: number }).repeatPeriod,
      )
      .heatmapsData(heatData)
      .heatmapPoints((item: object) =>
        (item as { points: Array<{ lat: number; lng: number; weight: number }> }).points,
      )
      .heatmapPointLat((point: object) => (point as { lat: number }).lat)
      .heatmapPointLng((point: object) => (point as { lng: number }).lng)
      .heatmapPointWeight((point: object) => (point as { weight: number }).weight)
      .heatmapBandwidth(() => 1.08)
      .heatmapColorFn(() => (t: number) =>
        t > 0.78
          ? formatHexOpacity(theme.rose, 'dd')
          : t > 0.5
            ? formatHexOpacity(theme.amber, 'dd')
            : formatHexOpacity(theme.sky, '99'),
      )
      .heatmapBaseAltitude(() => 0.01)
      .heatmapTopAltitude(() => 0.12)

    const globeMaterial = globe.globeMaterial() as THREE.MeshStandardMaterial
    globeMaterial.color = new THREE.Color(theme.globeSphere)
    globeMaterial.emissive = new THREE.Color(theme.globeGrid)
    globeMaterial.emissiveIntensity = theme.mode === 'day' ? 0.08 : 0.24
    globeMaterial.roughness = theme.mode === 'day' ? 0.88 : 0.7
    globeMaterial.metalness = theme.mode === 'day' ? 0.04 : 0.1
    globeMaterial.needsUpdate = true
  }, [arcData, countries, globe, heatData, mode, ringData, theme])

  const controlsAutoRotate = !selectedFrameId

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <ambientLight intensity={theme.mode === 'day' ? 1.05 : 0.34} />
      <directionalLight position={[3, 2, 3]} intensity={theme.mode === 'day' ? 1.25 : 0.7} color={theme.textStrong} />
      <pointLight position={[-4, -1.2, -5]} intensity={theme.mode === 'day' ? 0.4 : 0.55} color={theme.sky} />
      {theme.starCount > 0 && (
        <Stars
          radius={80}
          depth={42}
          count={theme.starCount}
          factor={stormMode ? 2.5 : 3.5}
          saturation={0}
          fade
          speed={stormMode ? 0.4 : 0.7}
        />
      )}
      <primitive object={globe} />
      {showNodes &&
        regions.map((region) => (
          <NodeMarker
            key={region.id}
            region={region}
            theme={theme}
            hovered={hoveredRegionId === region.id}
            selected={selectedFrameId === region.frameId}
            onHoverRegion={onHoverRegion}
            onSelectRegion={onSelectRegion}
          />
        ))}
      <OrbitControls
        ref={controlsRef as never}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.48}
        enableDamping
        dampingFactor={0.07}
        autoRotate={controlsAutoRotate}
        autoRotateSpeed={mode === 'presentation' ? 0.48 : 0.36}
      />
      <GlobeRig
        controlsRef={controlsRef}
        selectedRegion={selectedRegion}
        zoomLevel={zoomLevel}
        mode={mode}
      />
      <EffectComposer multisampling={0}>
        <Bloom
          mipmapBlur
          luminanceThreshold={theme.mode === 'day' ? 0.5 : 0.24}
          luminanceSmoothing={0.18}
          intensity={theme.bloomStrength}
        />
        <Vignette
          eskil={false}
          offset={theme.vignetteOffset}
          darkness={theme.vignetteDarkness}
        />
      </EffectComposer>
    </>
  )
}

export function Globe3D({
  regions,
  flows,
  selectedFrameId,
  hoveredRegionId,
  onHoverRegion,
  onSelectRegion,
  showArcs,
  showNodes,
  showRadar,
  showHeat,
  theme,
  mode,
  stormMode,
  zoomLevel,
  onZoomChange,
}: {
  regions: HalogridRegionView[]
  flows: HalogridFlowView[]
  selectedFrameId: string | null
  hoveredRegionId: string | null
  onHoverRegion: (payload: HoverPayload) => void
  onSelectRegion: (id: string) => void
  showArcs: boolean
  showNodes: boolean
  showRadar: boolean
  showHeat: boolean
  theme: HaloTheme
  mode: DisplayMode | 'presentation'
  stormMode: boolean
  zoomLevel: ZoomLevel
  onZoomChange: (next: ZoomLevel) => void
}) {
  const [countries, setCountries] = useState<GeoJsonFeature[]>([])

  useEffect(() => {
    let active = true
    fetch('/halogrid/countries.geojson')
      .then((response) => response.json())
      .then((json) => {
        if (!active) return
        setCountries(Array.isArray(json.features) ? json.features : [])
      })
      .catch(() => {
        if (!active) return
        setCountries([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div
      className="h-full w-full"
      onWheel={(event) => {
        event.preventDefault()
        if (event.deltaY < 0 && zoomLevel < 3) onZoomChange((zoomLevel + 1) as ZoomLevel)
        if (event.deltaY > 0 && zoomLevel > 1) onZoomChange((zoomLevel - 1) as ZoomLevel)
      }}
    >
      <Canvas
        camera={{ position: [0.8, 0.36, ZOOM_DISTANCE[zoomLevel]], fov: mode === 'presentation' ? 33 : 38 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <GlobeScene
          countries={countries}
          theme={theme}
          mode={mode}
          regions={regions}
          flows={flows}
          selectedFrameId={selectedFrameId}
          hoveredRegionId={hoveredRegionId}
          zoomLevel={zoomLevel}
          showArcs={showArcs}
          showNodes={showNodes}
          showRadar={showRadar}
          showHeat={showHeat}
          stormMode={stormMode}
          onHoverRegion={onHoverRegion}
          onSelectRegion={onSelectRegion}
        />
      </Canvas>
    </div>
  )
}
