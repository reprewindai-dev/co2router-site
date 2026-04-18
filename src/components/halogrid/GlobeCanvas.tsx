'use client'

import { useEffect, useRef, useState } from 'react'

import type { Region } from '@/lib/halogrid/types'
import { stateColor } from '@/lib/halogrid/utils'

function project(lat: number, lng: number, cx: number, cy: number, rx: number, ry: number) {
  const x = cx + (lng / 180) * rx
  const y = cy - (lat / 90) * ry
  return { x, y }
}

export function GlobeCanvas({
  regions,
  onRegionClick,
}: {
  regions: Region[]
  onRegionClick: (region: Region) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverRegionId, setHoverRegionId] = useState<string | null>(null)
  const animationFrameRef = useRef<number>()
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const width = parent.clientWidth
      const height = parent.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.scale(dpr, dpr)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas.parentElement!)

    const draw = () => {
      frameRef.current += 1
      const width = canvas.width / dpr
      const height = canvas.height / dpr
      context.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      const rx = width * 0.44
      const ry = height * 0.42

      context.strokeStyle = 'rgba(56,189,248,0.06)'
      context.lineWidth = 0.5
      for (let lng = -180; lng <= 180; lng += 30) {
        const { x: x1 } = project(-90, lng, cx, cy, rx, ry)
        const { x: x2 } = project(90, lng, cx, cy, rx, ry)
        context.beginPath()
        context.moveTo(x1, cy + ry)
        context.lineTo(x2, cy - ry)
        context.stroke()
      }

      for (let lat = -75; lat <= 75; lat += 30) {
        const { x, y } = project(lat, -180, cx, cy, rx, ry)
        context.beginPath()
        context.moveTo(x, y)
        context.lineTo(cx + rx, y)
        context.stroke()
      }

      context.strokeStyle = 'rgba(56,189,248,0.12)'
      context.lineWidth = 0.8
      context.beginPath()
      context.moveTo(cx - rx, cy)
      context.lineTo(cx + rx, cy)
      context.stroke()
      context.beginPath()
      context.moveTo(cx, cy - ry)
      context.lineTo(cx, cy + ry)
      context.stroke()

      for (const region of regions) {
        const { x, y } = project(region.lat, region.lng, cx, cy, rx, ry)
        const color = stateColor(region.state)
        const isHovered = hoverRegionId === region.id
        const pulse = Math.sin(frameRef.current * 0.05 + region.lat) * 0.5 + 0.5
        const radius = isHovered ? 9 : 6

        if (region.state !== 'green') {
          context.beginPath()
          context.arc(x, y, radius + 4 + pulse * 5, 0, Math.PI * 2)
          context.strokeStyle = `${color}22`
          context.lineWidth = 1.5
          context.stroke()
        }

        const gradient = context.createRadialGradient(x, y, 0, x, y, radius + 10)
        gradient.addColorStop(0, `${color}55`)
        gradient.addColorStop(1, 'transparent')
        context.fillStyle = gradient
        context.beginPath()
        context.arc(x, y, radius + 10, 0, Math.PI * 2)
        context.fill()

        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fillStyle = `${color}cc`
        context.fill()
        context.strokeStyle = color
        context.lineWidth = isHovered ? 2 : 1
        context.stroke()

        if (isHovered) {
          context.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace'
          context.fillStyle = '#e2e8f0'
          context.textAlign = 'left'
          context.fillText(region.code, x + 12, y + 4)
          context.font = '400 9px ui-monospace, SFMono-Regular, Menlo, monospace'
          context.fillStyle = color
          context.fillText(`${region.carbon} g`, x + 12, y + 14)
        } else {
          context.font = '500 9px ui-monospace, SFMono-Regular, Menlo, monospace'
          context.fillStyle = `${color}cc`
          context.textAlign = 'center'
          context.fillText(region.code, x, y - 10)
        }
      }

      for (const region of regions.filter((entry) => entry.lastDecision === 'SHIFT_REGION')) {
        const target = regions.find((entry) => entry.state === 'green' && entry.id !== region.id)
        if (!target) continue
        const start = project(region.lat, region.lng, cx, cy, rx, ry)
        const end = project(target.lat, target.lng, cx, cy, rx, ry)
        const mx = (start.x + end.x) / 2
        const my = (start.y + end.y) / 2 - 30
        const alpha = 0.35 + Math.sin(frameRef.current * 0.08) * 0.15
        context.beginPath()
        context.moveTo(start.x, start.y)
        context.quadraticCurveTo(mx, my, end.x, end.y)
        context.strokeStyle = `rgba(56,189,248,${alpha})`
        context.lineWidth = 1
        context.setLineDash([4, 6])
        context.stroke()
        context.setLineDash([])
      }

      animationFrameRef.current = window.requestAnimationFrame(draw)
    }

    animationFrameRef.current = window.requestAnimationFrame(draw)
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
      observer.disconnect()
    }
  }, [regions, hoverRegionId])

  const resolveHoveredRegion = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    const cx = width / 2
    const cy = height / 2
    const rx = width * 0.44
    const ry = height * 0.42

    return (
      regions.find((region) => {
        const { x, y } = project(region.lat, region.lng, cx, cy, rx, ry)
        return Math.hypot(mx - x, my - y) < 14
      }) ?? null
    )
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={(event) => {
        const region = resolveHoveredRegion(event.clientX, event.clientY)
        if (region) onRegionClick(region)
      }}
      onMouseMove={(event) => {
        const region = resolveHoveredRegion(event.clientX, event.clientY)
        setHoverRegionId(region?.id ?? null)
        if (canvasRef.current) {
          canvasRef.current.style.cursor = region ? 'pointer' : 'default'
        }
      }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
