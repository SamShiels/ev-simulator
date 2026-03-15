import type { StateCreator } from 'zustand';
import type { RoadType, GizmoMode, Block } from '../App';
import type { EditorStore } from './useEditorStore';

export type RoadSlice = {
  blocks: Block[];
  selectedRoadType: RoadType | null;
  ghostRotation: number;
  gizmoMode: GizmoMode;

  selectRoadType: (type: RoadType | null) => void;
  rotateGhost: () => void;
  placeBlock: (pos: [number, number, number]) => void;
  selectBlock: (id: string) => void;
  deselectBlock: () => void;
  moveBlock: (id: string, pos: [number, number, number]) => void;
  rotateBlock: (id: string, delta: 1 | -1) => void;
  deleteSelectedBlock: () => void;
  setGizmoMode: (mode: GizmoMode) => void;
};

export const createRoadSlice: StateCreator<EditorStore, [], [], RoadSlice> = (set, get) => ({
  blocks: [
    // Road — 3 straight tiles running through centre
    { id: 'default-road-0', position: [0,   0, -2.5], roadType: 'straight', rotation: 1 },
    { id: 'default-road-1', position: [0,   0,  0  ], roadType: 'straight', rotation: 1 },
    { id: 'default-road-2', position: [0,   0,  2.5], roadType: 'straight', rotation: 1 },
    // Pavement — surrounding 6 tiles
    { id: 'default-pave-0', position: [-2.5, 0, -2.5], roadType: 'pavement', rotation: 0 },
    { id: 'default-pave-1', position: [-2.5, 0,  0  ], roadType: 'pavement', rotation: 0 },
    { id: 'default-pave-2', position: [-2.5, 0,  2.5], roadType: 'pavement', rotation: 0 },
    { id: 'default-pave-3', position: [ 2.5, 0, -2.5], roadType: 'pavement', rotation: 0 },
    { id: 'default-pave-4', position: [ 2.5, 0,  0  ], roadType: 'pavement', rotation: 0 },
    { id: 'default-pave-5', position: [ 2.5, 0,  2.5], roadType: 'pavement', rotation: 0 },
  ],
  selectedRoadType: null,
  ghostRotation: 1,
  gizmoMode: 'translate',

  selectRoadType: (type) => set({ selectedRoadType: type, selectedSceneryType: null, selectedActorKind: null }),

  rotateGhost: () => set(s => ({ ghostRotation: (s.ghostRotation + 1) % 4 })),

  placeBlock: (pos) => {
    const { selectedRoadType, ghostRotation, blocks } = get();
    if (!selectedRoadType) return;
    const occupied = blocks.some(b => b.position[0] === pos[0] && b.position[2] === pos[2]);
    if (occupied) return;
    const newBlock: Block = {
      id: `${pos[0]}-${pos[2]}-${Date.now()}`,
      position: pos,
      roadType: selectedRoadType,
      rotation: ghostRotation,
    };
    set({ blocks: [...blocks, newBlock] });
  },

  selectBlock: (id) => {
    const { drawingPath } = get();
    if (!drawingPath) {
      set({ selection: { kind: 'tile', id }, selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null });
    }
  },

  deselectBlock: () => set({
    selection: { kind: 'actor', id: 'ego' },
    drawingPath: false,
    selectedWaypointId: null,
    selectedWaypointActorId: null,
    waypointPopupPos: null,
  }),

  moveBlock: (id, pos) => {
    const { blocks } = get();
    const occupied = blocks.some(b => b.id !== id && b.position[0] === pos[0] && b.position[2] === pos[2]);
    if (occupied) return;
    set({ blocks: blocks.map(b => b.id === id ? { ...b, position: pos } : b) });
  },

  rotateBlock: (id, delta) => {
    const { blocks } = get();
    set({
      blocks: blocks.map(b =>
        b.id === id ? { ...b, rotation: ((b.rotation + delta) % 4 + 4) % 4 } : b,
      ),
    });
  },

  deleteSelectedBlock: () => {
    const { selection, blocks } = get();
    if (selection?.kind !== 'tile') return;
    const block = blocks.find(b => b.id === selection.id);
    if (block && block.position[0] === 0 && block.position[2] === 0) return;
    set({
      blocks: blocks.filter(b => b.id !== selection.id),
      selection: { kind: 'actor', id: 'ego' },
      drawingPath: false,
      selectedWaypointId: null,
      selectedWaypointActorId: null,
      waypointPopupPos: null,
    });
  },

  setGizmoMode: (mode) => set({ gizmoMode: mode }),
});
