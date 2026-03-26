import type { StateCreator } from 'zustand';
import type { SceneryType, SceneryItem, Selection } from '../App';
import { EGO_TOP_SPEED } from '../constants';
import type { EditorStore } from './useEditorStore';

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ── Selection helpers (exported for use in components) ───────────────────────

/** The "active" actor id — used to determine which track/lane is shown. */
export function selectionActorId(selection: Selection): string {
  if (selection?.kind === 'actor') return selection.id;
  return 'ego';
}

export function selectionSceneryId(selection: Selection): string | null {
  return selection?.kind === 'scenery' ? selection.id : null;
}

export type ScenerySlice = {
  sceneryItems: SceneryItem[];
  selectedSceneryType: SceneryType | null;
  sceneryGhostRotation: number;
  selection: Selection;
  drawingPath: boolean;
  selectedWaypointId: string | null;
  selectedWaypointActorId: string | null;
  waypointPopupPos: { x: number; y: number } | null;

  selectSceneryType: (type: SceneryType | null) => void;
  placeSceneryItem: (pos: [number, number, number]) => void;
  rotateSceneryGhost: () => void;
  selectSceneryItem: (id: string) => void;
  moveSceneryItem: (id: string, pos: [number, number, number]) => void;
  rotateSceneryItem: (id: string, delta: 1 | -1) => void;
  deleteSelectedScenery: () => void;
  seedEgoTrack: () => void;
  selectActor: (id: string) => void;
  selectWaypoint: (actorId: string, id: string) => void;
  setWaypointPopupPos: (pos: { x: number; y: number } | null) => void;
  dismissWaypointPopup: () => void;
  toggleDrawingPath: () => void;
  setDrawingPath: (isDrawing: boolean) => void;
};

export const createScenerySlice: StateCreator<EditorStore, [], [], ScenerySlice> = (set, get) => ({
  sceneryItems: [],
  selectedSceneryType: null,
  sceneryGhostRotation: 0,
  selection: { kind: 'actor', id: 'ego' },
  drawingPath: false,
  selectedWaypointId: null,
  selectedWaypointActorId: null,
  waypointPopupPos: null,

  selectSceneryType: (type) => set({ selectedSceneryType: type, selectedRoadId: null, selectedActorKind: null }),

  placeSceneryItem: (pos) => {
    const { selectedSceneryType, sceneryGhostRotation, sceneryItems } = get();
    if (!selectedSceneryType) return;
    const newItem: SceneryItem = {
      id: uid(),
      position: pos,
      sceneryType: selectedSceneryType,
      rotation: sceneryGhostRotation,
    };
    set({ sceneryItems: [...sceneryItems, newItem] });
  },

  rotateSceneryGhost: () => set(s => ({ sceneryGhostRotation: (s.sceneryGhostRotation + 1) % 4 })),

  selectSceneryItem: (id) => {
    const { drawingPath } = get();
    if (!drawingPath) {
      set({ selection: { kind: 'scenery', id }, drawingPath: false, selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null });
    }
  },

  moveSceneryItem: (id, pos) => {
    const { sceneryItems } = get();
    set({ sceneryItems: sceneryItems.map(s => s.id === id ? { ...s, position: pos } : s) });
  },

  rotateSceneryItem: (id, delta) => {
    const { sceneryItems } = get();
    set({
      sceneryItems: sceneryItems.map(s =>
        s.id === id ? { ...s, rotation: ((s.rotation + delta) % 4 + 4) % 4 } : s,
      ),
    });
  },

  deleteSelectedScenery: () => {
    const { selection, sceneryItems } = get();
    if (selection?.kind !== 'scenery') return;
    set({
      sceneryItems: sceneryItems.filter(s => s.id !== selection.id),
      selection: { kind: 'actor', id: 'ego' },
      drawingPath: false,
      selectedWaypointId: null,
      selectedWaypointActorId: null,
      waypointPopupPos: null,
    });
  },

  seedEgoTrack: () => {
    const { scenario } = get();
    set({
      scenario: {
        ...scenario,
        egoTrack: { actorId: 'ego', waypoints: [{ id: uid(), time: 0, position: [0, 0, 0], targetSpeed: EGO_TOP_SPEED / 2 }], length: 0 },
      },
    });
  },

  selectActor: (id) => set({ selection: { kind: 'actor', id }, drawingPath: false, selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null }),
  selectWaypoint: (actorId, id) => set({ selectedWaypointId: id, selectedWaypointActorId: actorId }),
  setWaypointPopupPos: (pos) => set({ waypointPopupPos: pos }),
  dismissWaypointPopup: () => set({ selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null }),

  toggleDrawingPath: () => {
    const { selection, drawingPath } = get();
    if (!drawingPath && selection?.kind !== 'actor') return;
    const disabling = drawingPath;
    set({
      drawingPath: !drawingPath,
      ...(disabling ? { selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null } : {}),
    });
  },

  setDrawingPath: (isDrawing) => set({ drawingPath: isDrawing }),
});
