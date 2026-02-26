import { useState, useRef } from 'react';
import * as THREE from 'three';
import type { Block, RoadType, SceneryItem, SceneryType } from '../App';
import { TILE_SIZE, SCENERY_GRID_SIZE } from '../constants';
import { useViewportControls } from './useViewportControls';

function snap(p: THREE.Vector3): [number, number, number] {
  return [Math.round(p.x / TILE_SIZE) * TILE_SIZE, 0, Math.round(p.z / TILE_SIZE) * TILE_SIZE];
}

function snapScenery(p: THREE.Vector3): [number, number, number] {
  return [Math.round(p.x / SCENERY_GRID_SIZE) * SCENERY_GRID_SIZE, 0, Math.round(p.z / SCENERY_GRID_SIZE) * SCENERY_GRID_SIZE];
}

interface Options {
  gl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  blocks: Block[];
  sceneryItems: SceneryItem[];
  selectedId: string | null;
  selectedRoadType: RoadType | null;
  selectedSceneryType: SceneryType | null;
  onPlace: (pos: [number, number, number]) => void;
  onRotate: () => void;
  onSelectBlock: (id: string) => void;
  onDeselect: () => void;
  onCancelPlacement: () => void;
  onPlaceScenery: (pos: [number, number, number]) => void;
  onRotateScenery: () => void;
  onSelectSceneryItem: (id: string) => void;
  onCancelScenery: () => void;
}

export interface SceneMouseControls {
  ghost: [number, number, number] | null;
  isDraggingGizmoRef: React.RefObject<boolean>;
}

export function useSceneMouseControls({
  gl, camera, blocks, sceneryItems, selectedId, selectedRoadType, selectedSceneryType,
  onPlace, onRotate, onSelectBlock, onDeselect, onCancelPlacement,
  onPlaceScenery, onRotateScenery, onSelectSceneryItem, onCancelScenery,
}: Options): SceneMouseControls {
  const [ghost, setGhost] = useState<[number, number, number] | null>(null);
  const isDraggingGizmoRef = useRef(false);

  // Keep refs for latest state values...
  const state = useRef({ blocks, sceneryItems, selectedId, selectedRoadType, selectedSceneryType });
  state.current = { blocks, sceneryItems, selectedId, selectedRoadType, selectedSceneryType };

  useViewportControls({
    gl,
    camera,
    onGroundMove: (pos) => {
      const { selectedRoadType, selectedSceneryType, selectedId } = state.current;
      if (!isDraggingGizmoRef.current && !selectedId && (selectedRoadType !== null || selectedSceneryType !== null) && pos) {
        setGhost(selectedSceneryType !== null ? snapScenery(pos) : snap(pos));
      } else {
        setGhost(null);
      }
    },
    onGroundClick: (pos) => {
      if (isDraggingGizmoRef.current) return;
      const { selectedRoadType, selectedSceneryType, selectedId, blocks, sceneryItems } = state.current;
      const snappedPos = snap(pos);
      const snappedSceneryPos = snapScenery(pos);

      if (selectedSceneryType !== null) {
        onPlaceScenery(snappedSceneryPos);
        return;
      }

      const existingBlock = blocks.find(
        b => b.position[0] === snappedPos[0] && b.position[2] === snappedPos[2]
      );
      if (existingBlock) {
        onSelectBlock(existingBlock.id);
        return;
      }

      const existingScenery = sceneryItems.filter(
        s => s.position[0] === snappedSceneryPos[0] && s.position[2] === snappedSceneryPos[2]
      );
      if (existingScenery.length > 0) {
        onSelectSceneryItem(existingScenery[existingScenery.length - 1].id);
        return;
      }

      if (selectedId) {
        onDeselect();
      } else if (selectedRoadType) {
        onPlace(snappedPos);
      }
    },
    onContextMenu: (e) => {
      e.preventDefault();
      if (state.current.selectedRoadType !== null) {
        setGhost(null);
        onCancelPlacement();
      }
      if (state.current.selectedSceneryType !== null) {
        setGhost(null);
        onCancelScenery();
      }
    },
    onKeyDown: (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (state.current.selectedRoadType !== null && !state.current.selectedId) {
          onRotate();
        } else if (state.current.selectedSceneryType !== null) {
          onRotateScenery();
        }
      }
    }
  });

  return { ghost, isDraggingGizmoRef };
}
