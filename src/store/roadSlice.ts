import type { StateCreator } from 'zustand';
import type { GizmoMode, GridCell } from '../App';
import { GRID_SIZE } from '../constants';
import type { EditorStore } from './useEditorStore';

function createDefaultGrid(): GridCell[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ type: 0, rotation: 0 }))
  );
}

export type RoadSlice = {
  roadGrid: GridCell[][];
  selectedRoadId: number | null;
  ghostRotation: number;
  gizmoMode: GizmoMode;

  selectRoadId: (id: number | null) => void;
  rotateGhost: () => void;
  paintCell: (row: number, col: number) => void;
  setGizmoMode: (mode: GizmoMode) => void;
};

export const createRoadSlice: StateCreator<EditorStore, [], [], RoadSlice> = (set, get) => ({
  roadGrid: createDefaultGrid(),
  selectedRoadId: null,
  ghostRotation: 0,
  gizmoMode: 'translate',

  selectRoadId: (id) => set({ selectedRoadId: id, selectedSceneryType: null, selectedActorKind: null }),

  rotateGhost: () => set(s => ({ ghostRotation: (s.ghostRotation + 1) % 4 })),

  paintCell: (row, col) => {
    const { selectedRoadId, ghostRotation, roadGrid } = get();
    if (selectedRoadId === null) return;
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    const newGrid = roadGrid.map((r, ri) =>
      ri === row
        ? r.map((c, ci) => (ci === col ? { type: selectedRoadId, rotation: ghostRotation } : c))
        : r
    );
    set({ roadGrid: newGrid });
  },

  setGizmoMode: (mode) => set({ gizmoMode: mode }),
});
