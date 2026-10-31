'use client'

import "./klyv-animated-beam-utils/klyv-theme.css";

import { useEffect, useId, useState, type CSSProperties, type RefObject } from 'react'
import { cn } from "./klyv-animated-beam-utils/lib-cn"

export interface AnimatedBeamProps {
  /** The positioned element both endpoints live inside. */
  containerRef: RefObject<HTMLElement | null>
  /** The element the beam starts at. */
  fromRef: RefObject<HTMLElement | null>
  /** The element the beam ends at. */
  toRef: RefObject<HTMLElement | null>
  /** Bow of the curve in pixels (used when connectionType is 'center'). */
  curvature?: number
  /** Connection style: 'edge-horizontal' connects right edge to left edge via smooth cubic Bezier; 'center' connects centers. Defaults to 'edge-horizontal'. */
  connectionType?: 'edge-horizontal' | 'center'
  /** Send the pulse from `to` to `from` instead. */
  reverse?: boolean
  /** Seconds for one pulse to cross. */
  duration?: number
  /** Seconds before the first pulse. Stagger these across a diagram. */
  delay?: number
  /** The dim track the pulse runs along. */
  pathColor?: string
  /** Stroke width of the dim track underneath. */
  pathWidth?: number
  /** Opacity of the dim track underneath. */
  pathOpacity?: number
  /** Any CSS colour for the travelling pulse. */
  beamColor?: string
  /** Length of the lit pulse in pixels. */
  beamLength?: number
  /** Draw the track but hold the pulse still. */
  paused?: boolean
  /** Merged last, so it wins. */
  className?: string
}

interface Geometry {
  width: number
  height: number
  d: string
  length: number
}

/** Centre of `node` in `container` coordinates. */
function centreIn(container: HTMLElement, node: HTMLElement) {
  const containerRect = container.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  return {
    x: nodeRect.left - containerRect.left - container.clientLeft + nodeRect.width / 2,
    y: nodeRect.top - containerRect.top - container.clientTop + nodeRect.height / 2,
  }
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  connectionType = 'edge-horizontal',
  reverse = false,
  duration = 3,
  delay = 0,
  pathColor = 'var(--color-line-strong)',
  pathWidth = 1.75,
  pathOpacity = 1,
  beamColor = 'var(--color-accent-strong)',
  beamLength = 46,
  paused = false,
  className,
}: AnimatedBeamProps) {
  const id = useId()
  const [geometry, setGeometry] = useState<Geometry | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const from = fromRef.current
    const to = toRef.current
    if (!container || !from || !to) return

    const measure = () => {
      const containerRect = container.getBoundingClientRect()
      const fromRect = from.getBoundingClientRect()
      const toRect = to.getBoundingClientRect()

      let d = ''
      let length = 0

      if (connectionType === 'edge-horizontal') {
        const isForward = fromRect.left < toRect.left
        const startX = isForward
          ? fromRect.right - containerRect.left - container.clientLeft
          : fromRect.left - containerRect.left - container.clientLeft
        const startY = fromRect.top - containerRect.top - container.clientTop + fromRect.height / 2

        const endX = isForward
          ? toRect.left - containerRect.left - container.clientLeft
          : toRect.right - containerRect.left - container.clientLeft
        const endY = toRect.top - containerRect.top - container.clientTop + toRect.height / 2

        const dx = endX - startX
        const cp1x = startX + dx * 0.5
        const cp1y = startY
        const cp2x = startX + dx * 0.5
        const cp2y = endY

        d = `M ${startX.toFixed(1)},${startY.toFixed(1)} C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`

        const chord = Math.hypot(endX - startX, endY - startY)
        const net =
          Math.hypot(cp1x - startX, cp1y - startY) +
          Math.hypot(cp2x - cp1x, cp2y - cp1y) +
          Math.hypot(endX - cp2x, endY - cp2y)
        length = (chord + net) / 2
      } else {
        const start = centreIn(container, from)
        const end = centreIn(container, to)

        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2
        const dx = end.x - start.x
        const dy = end.y - start.y
        const span = Math.hypot(dx, dy) || 1
        const controlX = midX + (-dy / span) * curvature
        const controlY = midY + (dx / span) * curvature

        d = `M ${start.x.toFixed(1)},${start.y.toFixed(1)} Q ${controlX.toFixed(1)},${controlY.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`

        const chord = span
        const legs =
          Math.hypot(controlX - start.x, controlY - start.y) +
          Math.hypot(end.x - controlX, end.y - controlY)
        length = (chord + legs) / 2
      }

      setGeometry({
        width: containerRect.width,
        height: containerRect.height,
        d,
        length,
      })
    }

    measure()
    const rafId = requestAnimationFrame(measure)
    const timeoutId = setTimeout(measure, 60)

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(from)
    observer.observe(to)
    window.addEventListener('resize', measure)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [containerRef, fromRef, toRef, curvature, connectionType])

  if (!geometry) return null

  const total = Math.max(1, Math.round(geometry.length))
  const lap = total + beamLength
  const travel = reverse ? lap : -lap

  return (
    <svg
      aria-hidden="true"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      fill="none"
      className={cn('pointer-events-none absolute left-0 top-0 z-0', className)}
    >
      <path
        d={geometry.d}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id={`beam-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={beamColor} stopOpacity="0" />
          <stop offset="50%" stopColor={beamColor} stopOpacity="1" />
          <stop offset="100%" stopColor={beamColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="motion-safe-only"
        d={geometry.d}
        stroke={`url(#beam-${id})`}
        strokeWidth={pathWidth + 1.25}
        strokeLinecap="round"
        strokeDasharray={`${beamLength} ${total}`}
        strokeDashoffset={0}
        style={
          {
            '--beam-travel': travel,
            animation: `beam-dash ${duration}s linear infinite`,
            animationDelay: `${delay}s`,
            animationPlayState: paused ? 'paused' : 'running',
          } as CSSProperties
        }
      />
    </svg>
  )
}

export default AnimatedBeam
