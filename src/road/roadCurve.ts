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
// entry of first step, [arc midpoint for corner steps,] then exit of every step.
// Used to populate ego track waypoints when tiles are placed.
export function getRoadWaypoints(steps: PathStep[]): THREE.Vector3[] {
  if (steps.length === 0) return [];
  const points: THREE.Vector3[] = [];

  steps.forEach(({ worldPos, fromDir, toDir }, i) => {
    const [cx, , cz] = worldPos;
    const [fdx, fdz] = DIR_XZ[fromDir];
    const [tdx, tdz] = DIR_XZ[toDir];
    const lEx = -fdz, lEz = fdx;
    const lXx =  tdz, lXz = -tdx;

    const entryX = cx + fdx * HALF_TILE + lEx * LANE_OFFSET;
    const entryZ = cz + fdz * HALF_TILE + lEz * LANE_OFFSET;
    const exitX  = cx + tdx * HALF_TILE + lXx * LANE_OFFSET;
    const exitZ  = cz + tdz * HALF_TILE + lXz * LANE_OFFSET;

    if (i === 0) {
      points.push(new THREE.Vector3(entryX, 0, entryZ));
    }

    // For corner tiles add a bezier arc midpoint so CatmullRom curves naturally.
    // Control point = intersection of the two lane tangents; midpoint = bezier at t=0.5.
    const isCorner = fdx * tdx + fdz * tdz === 0;
    if (isCorner) {
      const ctrlX = fdx === 0 ? entryX : exitX;
      const ctrlZ = fdz === 0 ? entryZ : exitZ;
      points.push(new THREE.Vector3(
        0.25 * entryX + 0.5 * ctrlX + 0.25 * exitX,
        0,
        0.25 * entryZ + 0.5 * ctrlZ + 0.25 * exitZ,
      ));
    }

    points.push(new THREE.Vector3(exitX, 0, exitZ));
  });

  return points;
}
