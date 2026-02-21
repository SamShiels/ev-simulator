import * as THREE from 'three'
import type { Dir, PathStep } from './pathfinder'
import { TILE_SIZE } from '@/constants'

const HALF_TILE = TILE_SIZE / 2;

const DIR_XZ: Record<Dir, [number, number]> = {
  N: [0, -1],
  E: [1,  0],
  S: [0,  1],
  W: [-1, 0],
}

function addUnique(pts: THREE.Vector3[], v: THREE.Vector3) {
  if (pts.length === 0 || !pts[pts.length - 1].equals(v)) pts.push(v)
}

// Convert a sequence of path steps into a smooth CatmullRom spline.
//
// Per tile we emit up to 3 points:
//   • entry edge midpoint  (where the road crosses the incoming tile edge)
//   • tile centre          (guides the curve through corners)
//   • exit edge midpoint   (where the road crosses the outgoing tile edge)
//
// Adjacent tiles share an edge midpoint so duplicates are filtered out.
export function buildRoadCurve(steps: PathStep[]): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = []

  for (const { block, fromDir, toDir } of steps) {
    const [cx, , cz] = block.position

    const [fdx, fdz] = DIR_XZ[fromDir]
    const [tdx, tdz] = DIR_XZ[toDir]

    const entry  = new THREE.Vector3(cx + fdx * HALF_TILE, 0, cz + fdz * HALF_TILE)
    const centre = new THREE.Vector3(cx, 0, cz)
    const exit   = new THREE.Vector3(cx + tdx * HALF_TILE, 0, cz + tdz * HALF_TILE)

    addUnique(pts, entry)
    addUnique(pts, centre)
    addUnique(pts, exit)
  }

  return new THREE.CatmullRomCurve3(pts, false, 'centripetal')
}
