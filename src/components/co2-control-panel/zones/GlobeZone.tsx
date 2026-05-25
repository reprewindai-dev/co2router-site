'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { RegionNode, RoutingArc, RoutingDecision } from '../types'

// Earth sphere component
function Earth({ onRegionClick }: { onRegionClick?: (region: RegionNode) => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  
  // Load Earth textures
  const [earthMap, earthNormal, earthSpecular] = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return [
      loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
      loader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
      loader.load('https://unpkg.com/three-globe/example/img/earth-water.png'),
    ]
  }, [])

  // Subtle rotation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0005
    }
  })

  return (
    <group>
      {/* Earth sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={earthMap}
          normalMap={earthNormal}
          specularMap={earthSpecular}
          specular={new THREE.Color(0x4444aa)}
          shininess={10}
        />
      </mesh>
      
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef} scale={1.05}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial
          color={0x44aaff}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer halo */}
      <mesh scale={1.15}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color={0x00ffff}
          transparent
          opacity={0.03}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// Convert lat/lng to 3D position on sphere
function latLngToVector3(lat: number, lng: number, radius: number = 2): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Animated routing arc
function RoutingArcs({ arcs }: { arcs: RoutingArc[] }) {
  const groupRef = useRef<THREE.Group>(null)
  
  const arcCurves = useMemo(() => {
    return arcs.map(arc => {
      const start = latLngToVector3(arc.from.lat, arc.from.lng, 2.02)
      const end = latLngToVector3(arc.to.lat, arc.to.lng, 2.02)
      
      // Create quadratic bezier curve
      const mid = start.clone().add(end).multiplyScalar(0.5)
      const dist = start.distanceTo(end)
      mid.setLength(2.02 + dist * 0.3) // Arc height based on distance
      
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      const points = curve.getPoints(50)
      
      return {
        id: arc.id,
        points,
        color: arc.carbonSaved > 0 ? 0x00ff88 : 0xff4444,
        animated: arc.animated,
        carbonSaved: arc.carbonSaved,
      }
    })
  }, [arcs])

  // Animate arcs
  useFrame((state) => {
    if (!groupRef.current) return
    
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Line && arcCurves[i]?.animated) {
        const material = child.material as THREE.LineBasicMaterial
        material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.3
      }
    })
  })

  return (
    <group ref={groupRef}>
      {arcCurves.map((arc) => (
        <line key={arc.id}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={arc.points.length}
              array={new Float32Array(arc.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={arc.color}
            transparent
            opacity={0.6}
            linewidth={2}
          />
        </line>
      ))}
    </group>
  )
}

// Region markers with pulse
function RegionMarkers({ 
  regions, 
  onRegionClick 
}: { 
  regions: RegionNode[]
  onRegionClick?: (region: RegionNode) => void 
}) {
  return (
    <group>
      {regions.map((region) => {
        const pos = latLngToVector3(region.lat, region.lng, 2.05)
        
        const statusColor = {
          optimal: '#00ff88',
          acceptable: '#88ff00',
          stressed: '#ffaa00',
          critical: '#ff4444',
        }[region.status]
        
        return (
          <group key={region.id} position={pos}>
            {/* Main marker */}
            <mesh
              onClick={() => onRegionClick?.(region)}
            >
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshBasicMaterial color={statusColor} />
            </mesh>
            
            {/* Pulse ring */}
            <PulseRing color={statusColor} />
            
            {/* Label */}
            <Html distanceFactor={10}>
              <div className="region-label">
                <div className="region-name">{region.name}</div>
                <div className="region-stats">
                  {region.signalLabel ?? `${region.carbonIntensity}g/kWh - ${region.renewablePercentage}% renewable`}
                </div>
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

// Pulsing ring effect
function PulseRing({ color }: { color: string }) {
  const ringRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3
      ringRef.current.scale.set(scale, scale, 1)
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = 
        0.5 - Math.sin(state.clock.elapsedTime * 2) * 0.3
    }
  })
  
  return (
    <mesh ref={ringRef} rotation={[0, 0, 0]}>
      <ringGeometry args={[0.05, 0.06, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  )
}

// Camera controller
function CameraController() {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(0, 0, 6)
  }, [camera])
  
  return null
}

// Main Globe Zone component
export function GlobeZone({
  regions,
  arcs,
  onRegionClick,
}: {
  regions: RegionNode[]
  arcs: RoutingArc[]
  onRegionClick?: (region: RegionNode) => void
}) {
  const [selectedRegion, setSelectedRegion] = useState<RegionNode | null>(null)
  
  return (
    <div className="globe-zone">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        style={{ background: 'radial-gradient(circle at center, #0a1628 0%, #000000 100%)' }}
      >
        <CameraController />
        
        {/* Starfield background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={1} color={0xffffff} />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color={0x4444ff} />
        
        {/* Earth */}
        <Earth onRegionClick={onRegionClick} />
        
        {/* Routing arcs */}
        <RoutingArcs arcs={arcs} />
        
        {/* Region markers */}
        <RegionMarkers regions={regions} onRegionClick={onRegionClick} />
        
        {/* Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={10}
          autoRotate={false}
        />
      </Canvas>
      
      {/* Overlay stats */}
      <div className="globe-overlay">
        <div className="earth-approval-badge">
          <div className="badge-icon">🌍</div>
          <div className="badge-text">
            <div className="badge-label">EARTH APPROVAL</div>
            <div className="badge-status">ACTIVE</div>
          </div>
        </div>
      </div>
    </div>
  )
}
