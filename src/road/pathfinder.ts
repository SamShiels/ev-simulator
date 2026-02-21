import { TILE_SIZE } from '@/constants'
import type { Block } from '../App'

export type Dir = 'N' | 'E' | 'S' | 'W'

export interface PathStep {
  block: Block
  fromDir: Dir // direction we entered from
  toDir: Dir   // direction we exit toward
}

// Grid step size matches the tile snap increment
const DIR_DELTA: Record<Dir, [number, number]> = {
  N: [0, -TILE_SIZE],
  E: [TILE_SIZE,  0],
  S: [0,  TILE_SIZE],
  W: [-TILE_SIZE, 0],
}

const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' }

// The two open edges for each tile type + rotation.
//
// Base model orientations (rotation=0, from .obj geometry):
//   straight: W + E   corner: W + S
//
// Corner exits indexed by r = (block.rotation + 1) % 4:
//   r=0 → N,W   r=1 → W,S   r=2 → S,E   r=3 → E,N
function getTileExits(block: Block): [Dir, Dir] {
  const r = ((block.rotation % 4) + 4) % 4
  if (block.roadType === 'straight') {
    return r % 2 === 0 ? ['E', 'W'] : ['N', 'S']
  }
  const CORNER_EXITS: [Dir, Dir][] = [
    ['W', 'S'], // r=0: South-West
    ['S', 'E'], // r=1: South-East
    ['E', 'N'], // r=2: North-East
    ['N', 'W'], // r=3: North-West
  ]
  return CORNER_EXITS[r]
}

function blockKey(b: Block) {
  return `${b.position[0]},${b.position[2]}`
}

// The direction the path starts moving from the 0,0 tile.
const START_DIR: Dir = 'N'

// Walk the road starting at block (0,0) in START_DIR, following connected tiles
// until a tile has no exit that connects to the next one.
export function findRoadPath(blocks: Block[]): PathStep[] | null {
  if (blocks.length === 0) return null

  const tileMap = new Map(blocks.map(b => [blockKey(b), b]))
  const startBlock = tileMap.get('0,0')
  if (!startBlock) return null

  const steps: PathStep[] = []
  let current = startBlock
  let fromDir: Dir = OPPOSITE[START_DIR]
  let toDir: Dir = START_DIR

  for (let guard = 0; guard < blocks.length; guard++) {
    const exits = getTileExits(current)
    if (!exits.includes(toDir)) break

    steps.push({ block: current, fromDir, toDir })

    const [dx, dz] = DIR_DELTA[toDir]
    const [cx, , cz] = current.position
    const next = tileMap.get(`${cx + dx},${cz + dz}`)
    if (!next) break

    const entryDir = OPPOSITE[toDir]
    const nextExits = getTileExits(next)
    if (!nextExits.includes(entryDir)) break

    fromDir = entryDir
    toDir = nextExits.find(d => d !== entryDir)!
    current = next
  }

  return steps.length >= 1 ? steps : null
}
