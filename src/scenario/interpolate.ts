import * as THREE from 'three';
import type { WaypointTrack, ScenarioPose } from './types';

// Reused across calls to avoid per-call allocation
const _curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();

export type DrivingZone = 'accelerating' | 'braking' | 'cruising';

export interface AdvanceResult {
  pose: ScenarioPose;
  speed: number;
  progress: number;
  zone: DrivingZone;
}

function calculate_waypoint_distances(curve: THREE.CatmullRomCurve3, wps: any[]): { wp_distances: number[], total_length: number } {
  const wp_distances = [0];
  let cumulative_distance = 0;
  const SAMPLES_PER_SEGMENT = 20; 
  const temp_pos = new THREE.Vector3();
  const prev_pos = new THREE.Vector3().copy(curve.points[0]);

  for (let i = 0; i < wps.length - 1; i++) {
    for (let j = 1; j <= SAMPLES_PER_SEGMENT; j++) {
      const u = (i + j / SAMPLES_PER_SEGMENT) / (wps.length - 1);
      curve.getPoint(u, temp_pos);
      cumulative_distance += prev_pos.distanceTo(temp_pos);
      prev_pos.copy(temp_pos);
    }
    wp_distances.push(cumulative_distance);
  }

  return { wp_distances, total_length: cumulative_distance };
}

export function advance_actor(track: WaypointTrack, current_speed: number, current_progress: number, delta: number, acceleration: number, brake: number, top_speed: number): AdvanceResult | null {
  const wps = track.waypoints;
  const segments = wps.length;

  if (segments === 0) {
    return null;
  }

  if (segments === 1) {
    const [x, y, z] = wps[0].position;
    return { pose: { position: [x, y, z], yaw: 0 }, speed: current_speed, progress: current_progress, zone: 'cruising' };
  }

  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  _curve.updateArcLengths();

  const { wp_distances, total_length } = calculate_waypoint_distances(_curve, wps);

  let i = 0;
  while (i < segments - 2 && wp_distances[i + 1] <= current_progress) i++;

  const next_waypoint = wps[i + 1];

  const get_new_speed = (): number => {
    const target = Math.min(next_waypoint.targetSpeed, top_speed);
    if (current_speed < target) {
      // Speed up!
      return Math.min(current_speed + (acceleration * delta), target);
    } else if (current_speed > target) {
      // Slow down!
      const braking_distance = (Math.pow(current_speed, 2) - Math.pow(target, 2)) / (brake * 2);
      const distance_to_next_waypoint = wp_distances[i + 1] - current_progress;

      if (distance_to_next_waypoint <= braking_distance + (current_speed * delta)) {
        const braking = Math.max(current_speed - (brake * delta), target);

        return braking;
      }
    }

    return current_speed;
  }

  const updated_speed = get_new_speed();
  const average_speed_this_frame = (current_speed + updated_speed) / 2;
  const updated_progress = current_progress + (average_speed_this_frame * delta);

  const progress_percentage = updated_progress / total_length;

  _curve.getPointAt(progress_percentage, _pos);
  _curve.getTangentAt(progress_percentage, _tangent);

  const yaw = Math.atan2(_tangent.x, _tangent.z);

  let zone: DrivingZone;
  if (updated_speed > current_speed) zone = 'accelerating';
  else if (updated_speed < current_speed) zone = 'braking';
  else zone = 'cruising';

  return {
    pose: { position: [_pos.x, _pos.y, _pos.z], yaw },
    speed: updated_speed,
    progress: updated_progress,
    zone,
  };
}

export function sample_pose_at_progress(track: WaypointTrack, progress: number): ScenarioPose | null {
  const wps = track.waypoints;
  if (wps.length === 0) return null;
  if (wps.length === 1) {
    const [x, y, z] = wps[0].position;
    return { position: [x, y, z], yaw: 0 };
  }
  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  _curve.updateArcLengths();
  const { total_length } = calculate_waypoint_distances(_curve, wps);
  if (total_length === 0) {
    const [x, y, z] = wps[0].position;
    return { position: [x, y, z], yaw: 0 };
  }
  const t = Math.min(1, Math.max(0, progress / total_length));
  _curve.getPointAt(t, _pos);
  _curve.getTangentAt(t, _tangent);
  return {
    position: [_pos.x, _pos.y, _pos.z],
    yaw: Math.atan2(_tangent.x, _tangent.z),
  };
}

export function get_waypoint_distances(track: WaypointTrack): number[] {
  const wps = track.waypoints;
  if (wps.length === 0) return [];
  if (wps.length === 1) return [0];
  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  _curve.updateArcLengths();
  return calculate_waypoint_distances(_curve, wps).wp_distances;
}

export function createSpeedProfile(track: WaypointTrack, accel: number, brake: number, top_speed: number): WaypointTrack {
  const _curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
  const wps = track.waypoints;
  if (wps.length < 2) return track;

  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  _curve.updateArcLengths();

  const { wp_distances, total_length } = calculate_waypoint_distances(_curve, wps);

  const forward_pass = [wps[0].targetSpeed];

  for (let i = 0; i < wps.length - 1; i++) {
    const s_current = forward_pass[i];
    const distance_to_next_waypoint = wp_distances[i + 1] - wp_distances[i];

    let highest_speed = Math.sqrt(Math.pow(s_current, 2) + (2 * accel * distance_to_next_waypoint));
    highest_speed = Math.min(highest_speed, top_speed);
    highest_speed = Math.min(highest_speed, wps[i + 1].targetSpeed);

    forward_pass.push(highest_speed);
  }

  const backward_pass = new Array(wps.length);
  backward_pass[wps.length - 1] = wps[wps.length - 1].targetSpeed;

  for (let i = wps.length - 1; i > 0; i--) {
    const s_current = backward_pass[i];
    const distance_to_prev_waypoint = wp_distances[i] - wp_distances[i - 1];

    let highest_safe_speed = Math.sqrt(Math.pow(s_current, 2) + (2 * brake * distance_to_prev_waypoint));
    
    // Cap it to top speed
    highest_safe_speed = Math.min(highest_safe_speed, top_speed);
    
    // Cap it to the wishlist speed of the waypoint behind us!
    highest_safe_speed = Math.min(highest_safe_speed, wps[i - 1].targetSpeed);
    backward_pass[i - 1] = highest_safe_speed;
  }

  const corrected_waypoints = wps.map((w, i) => {
    return {
      ...w,
      targetSpeed: Math.min(forward_pass[i], backward_pass[i], top_speed)
    }
  });

  return {
    ...track,
    waypoints: corrected_waypoints,
    length: total_length
  }
}
