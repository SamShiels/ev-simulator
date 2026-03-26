import { useState, useRef } from 'react';
import * as THREE from 'three';
import type { SceneryItem, SceneryType, GridCell } from '../App';
import { GRID_SIZE } from '../constants';
import type { ActorKind } from '../scenario/types';
import { TILE_SIZE, SCENERY_GRID_SIZE } from '../constants';
import { useViewportControls } from './useViewportControls';

function snap(p: THREE.Vector3): [number, number, number] {
  return [Math.round(p.x / TILE_SIZE) * TILE_SIZE, 0, Math.round(p.z / TILE_SIZE) * TILE_SIZE];
}

function snapScenery(p: THREE.Vector3): [number, number, number] {
  return [Math.round(p.x / SCENERY_GRID_SIZE) * SCENERY_GRID_SIZE, 0, Math.round(p.z / SCENERY_GRID_SIZE) * SCENERY_GRID_SIZE];
}

function worldToGrid(worldX: number, worldZ: number): [number, number] | null {
  const col = Math.round(worldX / TILE_SIZE) + Math.floor(GRID_SIZE / 2);
  const row = Math.round(worldZ / TILE_SIZE) + Math.floor(GRID_SIZE / 2);
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
  return [row, col];
}

interface Options {
  gl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  roadGrid: GridCell[][];
  sceneryItems: SceneryItem[];
  selectedRoadId: number | null;
  selectedSceneryType: SceneryType | null;
  selectedActorKind: ActorKind | null;
  onPaintCell: (row: number, col: number) => void;
  onRotate: () => void;
  onDeselect: () => void;
  onPlaceScenery: (pos: [number, number, number]) => void;
  onRotateScenery: () => void;
  onSelectSceneryItem: (id: string) => void;
  onCancelScenery: () => void;
  onPlaceActor: (pos: [number, number, number]) => void;
  onCancelActor: () => void;
  onCancelRoad: () => void;
}

export interface SceneMouseControls {
  ghost: [number, number, number] | null;
  isDraggingGizmoRef: React.RefObject<boolean>;
}

export function useSceneMouseControls({
  gl, camera, roadGrid, sceneryItems, selectedRoadId, selectedSceneryType, selectedActorKind,
  onPaintCell, onRotate, onDeselect,
  onPlaceScenery, onRotateScenery, onSelectSceneryItem, onCancelScenery,
  onPlaceActor, onCancelActor, onCancelRoad,
}: Options): SceneMouseControls {
  const [ghost, setGhost] = useState<[number, number, number] | null>(null);
  const isDraggingGizmoRef = useRef(false);

  const state = useRef({ roadGrid, sceneryItems, selectedRoadId, selectedSceneryType, selectedActorKind });
  state.current = { roadGrid, sceneryItems, selectedRoadId, selectedSceneryType, selectedActorKind };

  useViewportControls({
    gl,
    camera,
    onGroundMove: (pos) => {
      const { selectedRoadId, selectedSceneryType, selectedActorKind } = state.current;
      const hasPlacement = selectedRoadId !== null || selectedSceneryType !== null || selectedActorKind !== null;
      if (!isDraggingGizmoRef.current && hasPlacement && pos) {
        if (selectedRoadId !== null) {
          setGhost(snap(pos));
        } else {
          setGhost(snapScenery(pos));
        }
      } else {
        setGhost(null);
      }
    },
    onGroundClick: (pos) => {
      if (isDraggingGizmoRef.current) return;
      const { selectedRoadId, selectedSceneryType, sceneryItems } = state.current;
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

      if (selectedRoadId !== null) {
        const gridCoords = worldToGrid(snappedPos[0], snappedPos[2]);
        if (gridCoords) {
          onPaintCell(gridCoords[0], gridCoords[1]);
        }
        return;
      }

      const existingScenery = sceneryItems.filter(
        s => s.position[0] === snappedSceneryPos[0] && s.position[2] === snappedSceneryPos[2]
      );
      if (existingScenery.length > 0) {
        onSelectSceneryItem(existingScenery[existingScenery.length - 1].id);
        return;
      }

      onDeselect();
    },
    onContextMenu: (e) => {
      e.preventDefault();
      if (state.current.selectedRoadId !== null) {
        setGhost(null);
        onCancelRoad();
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
        if (state.current.selectedRoadId !== null) {
          onRotate();
        } else if (state.current.selectedSceneryType !== null) {
          onRotateScenery();
        }
      }
    }
  });

  return { ghost, isDraggingGizmoRef };
}
