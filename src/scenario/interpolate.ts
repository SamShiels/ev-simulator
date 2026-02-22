import * as THREE from 'three';
import type { WaypointTrack, ScenarioPose } from './types';

// Reused across calls to avoid per-call allocation
const _curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();

/**
 * Evaluate a WaypointTrack at a given time in seconds.
 * Returns null if the track has no waypoints.
 * Clamps to [first waypoint time, last waypoint time].
 */
export function evaluateTrack(track: WaypointTrack, time: number): ScenarioPose | null {
  const wps = track.waypoints;
  if (wps.length === 0) return null;

  if (wps.length === 1) {
    const [x, y, z] = wps[0].position;
    return { position: [x, y, z], yaw: 0 };
  }

  // Clamp time to the track's range
  const t0 = wps[0].time;
  const tN = wps[wps.length - 1].time;
  const clamped = Math.max(t0, Math.min(tN, time));

  // Find the bracketing segment index
  let i = 0;
  while (i < wps.length - 2 && wps[i + 1].time <= clamped) i++;

  const segT0 = wps[i].time;
  const segT1 = wps[i + 1].time;
  const alpha = segT1 > segT0 ? (clamped - segT0) / (segT1 - segT0) : 0;

  // Map to CatmullRomCurve3's uniform parameter space [0, 1]
  const u = (i + alpha) / (wps.length - 1);

  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  _curve.getPoint(u, _pos);
  _curve.getTangent(u, _tangent);

  const yaw = Math.atan2(_tangent.x, _tangent.z);

  return {
    position: [_pos.x, _pos.y, _pos.z],
    yaw,
  };
}
