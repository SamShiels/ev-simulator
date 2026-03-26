import { TILE_SIZE } from '@/constants';
import type { GridCell } from '../App';
import { GRID_SIZE } from '../constants';
import { ROAD_TYPE_MAP } from '../App';

export type Dir = 'N' | 'E' | 'S' | 'W';

export interface PathStep {
  row: number;
  col: number;
  roadType: string;
  rotation: number;
  worldPos: [number, number, number];
  fromDir: Dir;
  toDir: Dir;
}

const DIR_DELTA: Record<Dir, [number, number]> = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
};

const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

function gridToWorld(row: number, col: number): [number, number, number] {
  const half = Math.floor(GRID_SIZE / 2);
  return [(col - half) * TILE_SIZE, 0, (row - half) * TILE_SIZE];
}

function getTileExits(roadType: string, rotation: number): [Dir, Dir] | null {
  const r = ((rotation % 4) + 4) % 4;
  if (roadType === 'straight') {
    return r % 2 === 0 ? ['E', 'W'] : ['N', 'S'];
  }
  if (roadType === 'corner') {
    const CORNER_EXITS: [Dir, Dir][] = [
      ['W', 'S'],
      ['S', 'E'],
      ['E', 'N'],
      ['N', 'W'],
    ];
    return CORNER_EXITS[r];
  }
  return null;
}

const START_DIR: Dir = 'S';

export function findRoadPath(grid: GridCell[][]): PathStep[] | null {
  if (grid.length === 0) return null;

  const half = Math.floor(GRID_SIZE / 2);
  const startRow = half;
  const startCol = half;

  const startCell = grid[startRow]?.[startCol];
  if (!startCell) return null;

  const startType = ROAD_TYPE_MAP[startCell.type];
  if (!startType || startType === 'pavement') return null;

  const steps: PathStep[] = [];
  let row = startRow;
  let col = startCol;
  let fromDir: Dir = OPPOSITE[START_DIR];
  let toDir: Dir = START_DIR;

  const maxIter = GRID_SIZE * GRID_SIZE;
  for (let guard = 0; guard < maxIter; guard++) {
    const cell = grid[row]?.[col];
    if (!cell) break;

    const roadType = ROAD_TYPE_MAP[cell.type];
    if (!roadType || roadType === 'pavement') break;

    const exits = getTileExits(roadType, cell.rotation);
    if (!exits || !exits.includes(toDir)) break;

    steps.push({ row, col, roadType, rotation: cell.rotation, worldPos: gridToWorld(row, col), fromDir, toDir });

    const [dr, dc] = DIR_DELTA[toDir];
    const nextRow = row + dr;
    const nextCol = col + dc;
    const nextCell = grid[nextRow]?.[nextCol];
    if (!nextCell) break;

    const nextType = ROAD_TYPE_MAP[nextCell.type];
    if (!nextType || nextType === 'pavement') break;

    const entryDir = OPPOSITE[toDir];
    const nextExits = getTileExits(nextType, nextCell.rotation);
    if (!nextExits || !nextExits.includes(entryDir)) break;

    fromDir = entryDir;
    toDir = nextExits.find(d => d !== entryDir)!;
    row = nextRow;
    col = nextCol;
  }

  return steps.length >= 1 ? steps : null;
}
