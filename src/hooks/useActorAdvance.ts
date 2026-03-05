import { useRef, useEffect, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { advance_actor, sample_pose_at_progress } from '../scenario/interpolate';
import type { DrivingZone } from '../scenario/interpolate';
import type { WaypointTrack, ScenarioPose } from '../scenario/types';
import { useEditorStore } from '../store/useEditorStore';

export function useActorAdvance(
  track: WaypointTrack,
  accel: number,
  brake: number,
  topSpeed: number,
  label: string,
  isEgo = false,
): RefObject<ScenarioPose | null> {
  const poseRef     = useRef<ScenarioPose | null>(null);
  const speedRef    = useRef(0);
  const progressRef = useRef(0);
  const zoneRef     = useRef<DrivingZone | null>(null);

  useEffect(() => {
    poseRef.current     = null;
    speedRef.current    = 0;
    progressRef.current = 0;
    zoneRef.current     = null;
  }, [track]);

  useFrame((_, delta) => {
    const store = useEditorStore.getState();
    const { playing, renderPass } = store;
    const rendering = renderPass !== 'idle';
    const active = playing || rendering;
    const scenarioProgress = store.scenarioProgress; // distance in metres

    if (active) {
      // Detect loop/reset: scenarioProgress jumped back to near 0
      if (scenarioProgress < progressRef.current - 0.5) {
        speedRef.current    = 0;
        progressRef.current = 0;
        zoneRef.current     = null;
      }

      const result = advance_actor(track, speedRef.current, progressRef.current, delta, accel, brake, topSpeed);
      if (!result) return;

      if (result.zone !== zoneRef.current) {
        console.log(`[${label}] ${result.zone} — speed: ${result.speed.toFixed(2)} m/s`);
        zoneRef.current = result.zone;
      }

      poseRef.current     = result.pose;
      speedRef.current    = result.speed;
      progressRef.current = result.progress;

      if (isEgo) {
        store.setScenarioProgress(result.progress);
        if (rendering && result.progress >= track.length) {
          store.setRenderPass('idle');
        }
      }
    } else {
      // Scrubbing: sample the curve geometrically at the target distance
      const pose = sample_pose_at_progress(track, scenarioProgress);
      poseRef.current     = pose;
      progressRef.current = scenarioProgress;
      speedRef.current    = 0;
      zoneRef.current     = null;
    }
  });

  return poseRef;
}
