'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { RegionNode, RoutingArc } from '../types'

interface HaloGridProps {
  regions: RegionNode[]
  arcs: RoutingArc[]
  onRegionClick?: (region: RegionNode) => void
}

// Convert lat/lng to canvas coordinates (simple equirectangular projection)
function geoToXY(lat: number, lng: number, width: number, height: number) {
  // Map lng (-180 to 180) to x (0 to width)
  const x = ((lng + 180) / 360) * width
  // Map lat (90 to -90) to y (0 to height)
  const y = ((90 - lat) / 180) * height
  return { x, y }
}

export function HaloGrid({ regions, arcs, onRegionClick }: HaloGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arcsRef = useRef<RoutingArc[]>([])
  const regionsRef = useRef<RegionNode[]>([])
  const animFrameRef = useRef<number>()
  const canvasSizeRef = useRef({ width: 0, height: 0 })

  // Keep refs in sync
  useEffect(() => {
    arcsRef.current = arcs
  }, [arcs])

  useEffect(() => {
    regionsRef.current = regions
  }, [regions])

  // Resize handler
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvas.parentElement) return

    const rect = canvas.parentElement.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    canvasSizeRef.current = { width: rect.width, height: rect.height }
  }, [])

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !onRegionClick) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Find closest region within threshold
    const threshold = 20
    let closest: RegionNode | null = null
    let closestDist = Infinity

    regionsRef.current.forEach(r => {
      const pos = geoToXY(r.lat, r.lng, canvas.width, canvas.height)
      const dist = Math.sqrt((clickX - pos.x) ** 2 + (clickY - pos.y) ** 2)
      if (dist < threshold && dist < closestDist) {
        closestDist = dist
        closest = r
      }
    })

    if (closest) {
      onRegionClick(closest)
    }
  }, [onRegionClick])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    resizeCanvas()

    let animFrame = 0

    const draw = () => {
      const { width: W, height: H } = canvasSizeRef.current
      if (!W || !H) {
        animFrameRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, W, H)

      // Deep space background gradient
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7)
      bg.addColorStop(0, '#0a0f1a')
      bg.addColorStop(1, '#050709')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Grid lines (lat/lon)
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.04)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= W; x += W / 12) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y <= H; y += H / 8) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      // Continent blobs (simplified impressions)
      const contBlobs = [
        { x: 0.20, y: 0.28, w: 0.18, h: 0.22 }, // NA
        { x: 0.48, y: 0.24, w: 0.14, h: 0.18 }, // Europe
        { x: 0.60, y: 0.30, w: 0.12, h: 0.20 }, // Asia
        { x: 0.78, y: 0.42, w: 0.10, h: 0.16 }, // SE Asia
        { x: 0.28, y: 0.55, w: 0.08, h: 0.16 }, // SA
        { x: 0.55, y: 0.52, w: 0.10, h: 0.18 }, // Africa
      ]
      contBlobs.forEach(b => {
        ctx.fillStyle = 'rgba(100, 200, 255, 0.03)'
        ctx.beginPath()
        ctx.ellipse(b.x * W, b.y * H, (b.w * W) / 2, (b.h * H) / 2, 0, 0, Math.PI * 2)
        ctx.fill()
      })

      // Routing arcs
      const t = Date.now() / 1000
      arcsRef.current.forEach((arc, i) => {
        const from = geoToXY(arc.from.lat, arc.from.lng, W, H)
        const to = geoToXY(arc.to.lat, arc.to.lng, W, H)

        // Control point for quadratic curve (midpoint + offset for arc)
        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2)
        const cpX = midX - (to.y - from.y) * 0.2
        const cpY = midY + (to.x - from.x) * 0.2

        const color = arc.carbonSaved > 0 ? '#00ff88' : '#ff4444'
        const speed = 0.02
        const progress = ((t * 0.5 + i * 0.3) % 1.4)

        if (progress > 1.4) return

        const tail = Math.max(0, progress - 0.4)
        const head = Math.min(progress, 1)

        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.shadowColor = color
        ctx.shadowBlur = 6
        ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.8

        ctx.beginPath()
        const steps = 30
        for (let step = Math.floor(tail * steps); step <= Math.floor(head * steps); step++) {
          const u = step / steps
          const u2 = u * u
          const u1 = 1 - u
          const px = u1 * u1 * from.x + 2 * u1 * u * cpX + u2 * to.x
          const py = u1 * u1 * from.y + 2 * u1 * u * cpY + u2 * to.y
          if (step === Math.floor(tail * steps)) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.stroke()

        // Head dot
        const hu = head
        const hu2 = hu * hu
        const hu1 = 1 - hu
        const hx = hu1 * hu1 * from.x + 2 * hu1 * hu * cpX + hu2 * to.x
        const hy = hu1 * hu1 * from.y + 2 * hu1 * hu * cpY + hu2 * to.y

        ctx.fillStyle = color
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(hx, hy, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Region nodes with pulse
      regionsRef.current.forEach((r, i) => {
        const pos = geoToXY(r.lat, r.lng, W, H)
        const pulse = (Math.sin(t * 1.5 + i * 0.8) + 1) / 2

        let color = '#3dd9ff'
        if (r.status === 'optimal') color = '#00e5a0'
        else if (r.status === 'acceptable') color = '#ffb347'
        else if (r.status === 'stressed') color = '#ffb347'
        else if (r.status === 'critical') color = '#ff4f6b'
        else if (r.carbonIntensity < 100) color = '#00e5a0'
        else if (r.carbonIntensity < 300) color = '#ffb347'
        else color = '#ff4f6b'

        const activeDecisions = r.activeDecisions || 0
        const amp = Math.min(1, Math.max(0.15, activeDecisions / 12))

        // Pulse ring
        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.globalAlpha = (1 - pulse) * 0.55 * amp
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 8 + pulse * 14 * amp, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // Core dot
        ctx.save()
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = 10
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 4 + amp * 1.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Label
        ctx.save()
        ctx.font = '9px JetBrains Mono, monospace'
        ctx.fillStyle = 'rgba(150, 200, 220, 0.6)'
        ctx.fillText(r.name, pos.x + 7, pos.y + 4)
        ctx.restore()
      })

      animFrame++
      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      resizeCanvas()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [resizeCanvas])

  return (
    <div className="relative w-full h-full bg-[#050709]">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Overlay stats */}
      <div className="absolute top-8 right-4 flex flex-col gap-3">
        <div className="bg-[rgba(8,12,16,0.85)] border border-[rgba(100,200,255,0.08)] rounded-md p-2 backdrop-blur-sm min-w-[120px]">
          <div className="font-mono text-xs text-[#3d5260] uppercase tracking-wide">Visible Regions</div>
          <div className="font-mono text-lg font-bold text-[#00e5a0] tabular-nums">{regions.length}</div>
        </div>
        <div className="bg-[rgba(8,12,16,0.85)] border border-[rgba(100,200,255,0.08)] rounded-md p-2 backdrop-blur-sm min-w-[120px]">
          <div className="font-mono text-xs text-[#3d5260] uppercase tracking-wide">Routed Paths</div>
          <div className="font-mono text-lg font-bold text-[#ffb347] tabular-nums">{arcs.filter(a => a.animated).length}</div>
        </div>
        <div className="bg-[rgba(8,12,16,0.85)] border border-[rgba(100,200,255,0.08)] rounded-md p-2 backdrop-blur-sm min-w-[120px]">
          <div className="font-mono text-xs text-[#3d5260] uppercase tracking-wide">Cleanest Region</div>
          <div className="font-mono text-lg font-bold text-[#3dd9ff] tabular-nums truncate">
            {regions.reduce((prev, curr) => (curr.carbonIntensity < prev.carbonIntensity ? curr : prev), regions[0] || { name: '—', carbonIntensity: 0 }).name}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[#7a99aa]">
          <div className="w-2 h-2 rounded-full bg-[#00e5a0]" />
          Clean route active
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7a99aa]">
          <div className="w-2 h-2 rounded-full bg-[#ffb347]" />
          Delay / reroute pending
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7a99aa]">
          <div className="w-2 h-2 rounded-full bg-[#ff4f6b]" />
          Denied / high stress
        </div>
      </div>
    </div>
  )
}
