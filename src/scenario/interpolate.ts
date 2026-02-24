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
  const segments = wps.length;

  if (segments === 0) {
    return null;
  }

  if (segments === 1) {
    const [x, y, z] = wps[0].position;
    return { position: [x, y, z], yaw: 0 };
  }

  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  const lengths = _curve.getLengths(segments - 1);

  // Clamp time to the track's range
  const t0 = wps[0].time;
  const tN = wps[segments - 1].time;
  const clamped = Math.max(t0, Math.min(tN, time));

  // Find the bracketing segment index
  let i = 0;
  while (i < segments - 2 && wps[i + 1].time <= clamped) i++;

  const segStart = wps[i].time;
  const segEnd =   wps[i + 1].time;
  const alpha = segEnd > segStart ? (clamped - segStart) / (segEnd - segStart) : 0;

  // Map to CatmullRomCurve3's uniform parameter space [0, 1]
  const totalLen = lengths[segments - 1];
  const arcFracs = lengths.map(l => l / totalLen);
  const u = arcFracs[i] + alpha * (arcFracs[i + 1] - arcFracs[i]);

  _curve.getPointAt(u, _pos);
  _curve.getTangentAt(u, _tangent);

  const yaw = Math.atan2(_tangent.x, _tangent.z);

  return {
    position: [_pos.x, _pos.y, _pos.z],
    yaw,
  };
}
