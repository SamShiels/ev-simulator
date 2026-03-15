import { useState, useRef } from 'react';
import * as THREE from 'three';
import type { Block, RoadType, SceneryItem, SceneryType } from '../App';
import type { ActorKind } from '../scenario/types';
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
  selectedActorKind: ActorKind | null;
  onPlace: (pos: [number, number, number]) => void;
  onRotate: () => void;
  onSelectBlock: (id: string) => void;
  onDeselect: () => void;
  onCancelPlacement: () => void;
  onPlaceScenery: (pos: [number, number, number]) => void;
  onRotateScenery: () => void;
  onSelectSceneryItem: (id: string) => void;
  onCancelScenery: () => void;
  onPlaceActor: (pos: [number, number, number]) => void;
  onCancelActor: () => void;
}

export interface SceneMouseControls {
  ghost: [number, number, number] | null;
  isDraggingGizmoRef: React.RefObject<boolean>;
}

export function useSceneMouseControls({
  gl, camera, blocks, sceneryItems, selectedId, selectedRoadType, selectedSceneryType, selectedActorKind,
  onPlace, onRotate, onSelectBlock, onDeselect, onCancelPlacement,
  onPlaceScenery, onRotateScenery, onSelectSceneryItem, onCancelScenery,
  onPlaceActor, onCancelActor,
}: Options): SceneMouseControls {
  const [ghost, setGhost] = useState<[number, number, number] | null>(null);
  const isDraggingGizmoRef = useRef(false);

  // Keep refs for latest state values...
  const state = useRef({ blocks, sceneryItems, selectedId, selectedRoadType, selectedSceneryType, selectedActorKind });
  state.current = { blocks, sceneryItems, selectedId, selectedRoadType, selectedSceneryType, selectedActorKind };

  useViewportControls({
    gl,
    camera,
    onGroundMove: (pos) => {
      const { selectedRoadType, selectedSceneryType, selectedActorKind, selectedId } = state.current;
      const hasPlacement = selectedRoadType !== null || selectedSceneryType !== null || selectedActorKind !== null;
      if (!isDraggingGizmoRef.current && !selectedId && hasPlacement && pos) {
        setGhost(selectedRoadType !== null ? snap(pos) : snapScenery(pos));
      } else {
        setGhost(null);
      }
    },
    onGroundClick: (pos) => {
      if (isDraggingGizmoRef.current) return;
      const { selectedRoadType, selectedSceneryType, selectedId, blocks, sceneryItems } = state.current;
      const snappedPos = snap(pos);
      const snappedSceneryPos = snapScenery(pos);

      if (selectedActorKind !== null) {
        onPlaceActor(snappedSceneryPos);
        return;
      }

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
      if (state.current.selectedActorKind !== null) {
        setGhost(null);
        onCancelActor();
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
