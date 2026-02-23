import { useRef } from 'react';
import * as THREE from 'three';
import { useViewportControls } from './useViewportControls';

interface Options {
  gl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  enabled: boolean;
  scenarioTime: number;
  selectedActorId: string;
  onAddWaypoint: (actorId: string, time: number, position: [number, number, number]) => void;
  onScenarioTimeChange: (t: number) => void;
  onCursorMove?: (pos: [number, number, number] | null) => void;
}

export function useScenarioMouseControls({
  gl, camera, enabled, scenarioTime, selectedActorId,
  onAddWaypoint, onCursorMove
}: Options) {
  const state = useRef({ scenarioTime, selectedActorId });
  state.current = { scenarioTime, selectedActorId };

  useViewportControls({
    gl,
    camera,
    enabled,
    onGroundClick: (pos) => {
      onAddWaypoint(
        state.current.selectedActorId,
        state.current.scenarioTime,
        [pos.x, 0, pos.z],
      );
    },
    onGroundMove: onCursorMove
      ? (pos) => onCursorMove(pos ? [pos.x, 0, pos.z] : null)
      : undefined,
    onContextMenu: (e) => e.preventDefault(),
  });
}