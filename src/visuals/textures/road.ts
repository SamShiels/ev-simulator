import { RoadType } from '@/App'
import * as THREE from 'three'

const cache = new Map<RoadType, THREE.CanvasTexture>()

export function getRoadTexture(type: RoadType): THREE.CanvasTexture {
  if (cache.has(type)) return cache.get(type)!

  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!

  const half = S / 2        // 128
  const roadHalf = S * 0.16 // ~41 — road half-width

  // Grass background
  ctx.fillStyle = '#3a6b2a'
  ctx.fillRect(0, 0, S, S)

  ctx.fillStyle = '#555'

  if (type === 'straight') {
    // Vertical strip running N-S through the tile
    ctx.fillRect(half - roadHalf, 0, roadHalf * 2, S)

    // Yellow dashed centre line
    ctx.strokeStyle = '#ffcc00'
    ctx.lineWidth = 3
    ctx.setLineDash([18, 14])
    ctx.beginPath()
    ctx.moveTo(half, 0)
    ctx.lineTo(half, S)
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    // Corner: quarter-annulus from bottom edge → right edge.
    // Arc centre sits at the bottom-right corner of the canvas (S, S).
    const r0 = half - roadHalf // inner radius ~87
    const r1 = half + roadHalf // outer radius ~169

    ctx.beginPath()
    ctx.arc(S, S, r1, Math.PI, Math.PI * 1.5, false) // outer arc CW
    ctx.arc(S, S, r0, Math.PI * 1.5, Math.PI, true)  // inner arc CCW
    ctx.closePath()
    ctx.fill()

    // Yellow dashed centre arc
    ctx.strokeStyle = '#ffcc00'
    ctx.lineWidth = 3
    ctx.setLineDash([18, 14])
    ctx.beginPath()
    ctx.arc(S, S, half, Math.PI, Math.PI * 1.5, false)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const tex = new THREE.CanvasTexture(canvas)
  cache.set(type, tex)
  return tex
}
