import * as THREE from 'three';
import type { Dir, PathStep } from './pathfinder';
import { TILE_SIZE } from '@/constants';

const HALF_TILE = TILE_SIZE / 2;

// Lateral offset from road centre — positive = left of travel direction (UK/left-hand traffic)
const LANE_OFFSET = 0.4;

const DIR_XZ: Record<Dir, [number, number]> = {
  N: [0, -1],
  E: [1,  0],
  S: [0,  1],
  W: [-1, 0],
};

// Returns the lane-centerline control points for a path:
// entry of first step, then exit of every step.
// Used to populate ego track waypoints when tiles are placed.
export function getRoadWaypoints(steps: PathStep[]): THREE.Vector3[] {
  if (steps.length === 0) return [];
  const points: THREE.Vector3[] = [];

  steps.forEach(({ block, fromDir, toDir }, i) => {
    const [cx, , cz] = block.position;
    const [fdx, fdz] = DIR_XZ[fromDir];
    const [tdx, tdz] = DIR_XZ[toDir];
    const lEx = -fdz, lEz = fdx;
    const lXx =  tdz, lXz = -tdx;

    if (i === 0) {
      points.push(new THREE.Vector3(cx + fdx * HALF_TILE + lEx * LANE_OFFSET, 0, cz + fdz * HALF_TILE + lEz * LANE_OFFSET));
    }
    points.push(new THREE.Vector3(cx + tdx * HALF_TILE + lXx * LANE_OFFSET, 0, cz + tdz * HALF_TILE + lXz * LANE_OFFSET));
  });

  return points;
}
