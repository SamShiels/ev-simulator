import { useState, useRef } from 'react';
import * as THREE from 'three';
import type { Block, RoadType } from '../App';
import { TILE_SIZE } from '../constants';
import { useViewportControls } from './useViewportControls';

function snap(p: THREE.Vector3): [number, number, number] {
  return [Math.round(p.x / TILE_SIZE) * TILE_SIZE, 0, Math.round(p.z / TILE_SIZE) * TILE_SIZE];
}

interface Options {
  gl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  blocks: Block[];
  selectedId: string | null;
  selectedRoadType: RoadType | null;
  drawingPath: boolean;
  onPlace: (pos: [number, number, number]) => void;
  onRotate: () => void;
  onSelectBlock: (id: string) => void;
  onDeselect: () => void;
  onCancelPlacement: () => void;
}

export interface SceneMouseControls {
  ghost: [number, number, number] | null;
  isDraggingGizmoRef: React.RefObject<boolean>;
}

export function useSceneMouseControls({
  gl, camera, blocks, selectedId, selectedRoadType, drawingPath,
  onPlace, onRotate, onSelectBlock, onDeselect, onCancelPlacement,
}: Options): SceneMouseControls {
  const [ghost, setGhost] = useState<[number, number, number] | null>(null);
  const isDraggingGizmoRef = useRef(false);

  // Keep refs for latest state values...
  const state = useRef({ blocks, selectedId, selectedRoadType, drawingPath });
  state.current = { blocks, selectedId, selectedRoadType, drawingPath };

  useViewportControls({
    gl,
    camera,
    onGroundMove: (pos) => {
      if (!isDraggingGizmoRef.current && !state.current.selectedId && state.current.selectedRoadType !== null && pos) {
        setGhost(snap(pos));
      } else {
        setGhost(null);
      }
    },
    onGroundClick: (pos) => {
      if (isDraggingGizmoRef.current) return;
      if (state.current.drawingPath) return;
      const snappedPos = snap(pos);
      
      const existing = state.current.blocks.find(
        b => b.position[0] === snappedPos[0] && b.position[2] === snappedPos[2]
      );

      if (existing) {
        onSelectBlock(existing.id);
      } else if (state.current.selectedId) {
        onDeselect();
      } else {
        onPlace(snappedPos);
      }
    },
    onContextMenu: (e) => {
      e.preventDefault();
      if (state.current.selectedRoadType !== null) {
        setGhost(null);
        onCancelPlacement();
      }
    },
    onKeyDown: (e) => {
      if ((e.key === 'r' || e.key === 'R') && state.current.selectedRoadType !== null && !state.current.selectedId) {
        onRotate();
      }
    }
  });

  return { ghost, isDraggingGizmoRef };
}
