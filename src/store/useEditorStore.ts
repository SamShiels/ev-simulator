import { create } from 'zustand';
import type { RoadType, SceneryType, GizmoMode, RenderPass, Block, SceneryItem, Selection } from '../App';
import type { Scenario, Waypoint, WaypointTrack, Actor, ActorKind, ActorStats } from '../scenario/types';
import { defaultScenario, nextActorColor } from '../scenario/defaults';
import {
  EGO_ACCEL, EGO_BRAKE, EGO_TOP_SPEED,
  PEDESTRIAN_ACCEL, PEDESTRIAN_BRAKE, PEDESTRIAN_TOP_SPEED,
} from '../constants';

const KIND_DEFAULTS: Record<ActorKind, ActorStats> = {
  vehicle:    { accel: EGO_ACCEL,        brake: EGO_BRAKE,        topSpeed: EGO_TOP_SPEED },
  pedestrian: { accel: PEDESTRIAN_ACCEL, brake: PEDESTRIAN_BRAKE, topSpeed: PEDESTRIAN_TOP_SPEED },
  stroller:   { accel: PEDESTRIAN_ACCEL, brake: PEDESTRIAN_BRAKE, topSpeed: PEDESTRIAN_TOP_SPEED },
};

// ── Private helpers ──────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function sortByTime(waypoints: Waypoint[]): Waypoint[] {
  return [...waypoints].sort((a, b) => a.time - b.time);
}

function isEvenlyDistributed(waypoints: Waypoint[], duration: number): boolean {
  if (waypoints.length <= 1) return true;
  const n = waypoints.length;
  const tolerance = duration * 0.01;
  return waypoints.every((wp, i) =>
    Math.abs(wp.time - (i / (n - 1)) * duration) <= tolerance,
  );
}

// ── Selection helpers (exported for use in components) ───────────────────────

/** The "active" actor id — used to determine which track/lane is shown. */
export function selectionActorId(selection: Selection): string {
  if (selection?.kind === 'actor') return selection.id;
  return 'ego';
}

export function selectionTileId(selection: Selection): string | null {
  return selection?.kind === 'tile' ? selection.id : null;
}

export function selectionSceneryId(selection: Selection): string | null {
  return selection?.kind === 'scenery' ? selection.id : null;
}

// ── Store types ──────────────────────────────────────────────────────────────

interface EditorState {
  // Road editor
  blocks: Block[];
  selectedRoadType: RoadType | null;
  ghostRotation: number;
  gizmoMode: GizmoMode;

  // Scenery
  sceneryItems: SceneryItem[];
  selectedSceneryType: SceneryType | null;
  sceneryGhostRotation: number;

  selection: Selection;
  drawingPath: boolean;
  selectedWaypointId: string | null;
  selectedWaypointActorId: string | null;
  waypointPopupPos: { x: number; y: number } | null;

  // Scenario
  scenario: Scenario;
  scenarioTime: number;

  // Playback / UI
  playing: boolean;
  renderPass: RenderPass;
}

interface EditorActions {
  // Road editor
  selectRoadType: (type: RoadType | null) => void;
  rotateGhost: () => void;
  placeBlock: (pos: [number, number, number]) => void;

  // Scenery
  selectSceneryType: (type: SceneryType | null) => void;
  placeSceneryItem: (pos: [number, number, number]) => void;
  rotateSceneryGhost: () => void;
  selectSceneryItem: (id: string) => void;
  moveSceneryItem: (id: string, pos: [number, number, number]) => void;
  rotateSceneryItem: (id: string, delta: 1 | -1) => void;
  deleteSelectedScenery: () => void;
  selectBlock: (id: string) => void;
  deselectBlock: () => void;
  moveBlock: (id: string, pos: [number, number, number]) => void;
  rotateBlock: (id: string, delta: 1 | -1) => void;
  deleteSelectedBlock: () => void;
  seedEgoTrack: () => void;

  // Selection
  selectActor: (id: string) => void;
  selectWaypoint: (actorId: string, id: string) => void;
  setWaypointPopupPos: (pos: { x: number; y: number } | null) => void;
  dismissWaypointPopup: () => void;

  // Waypoint properties
  setWaypointTargetSpeed: (actorId: string, wpId: string, speed: number) => void;

  // Actors
  addActor: (kind: ActorKind) => void;
  removeActor: (id: string) => void;
  setActorStats: (id: string, stats: Partial<ActorStats>) => void;
  setEgoStats: (stats: Partial<ActorStats>) => void;

  // Waypoints
  addWaypoint: (actorId: string, time: number, pos: [number, number, number]) => void;
  moveWaypoint: (actorId: string, wpId: string, pos: [number, number, number]) => void;
  setWaypointTime: (actorId: string, wpId: string, time: number) => void;
  deleteWaypoint: (actorId: string, wpId: string) => void;

  // Scenario
  setDuration: (duration: number) => void;

  // Playback
  togglePlaying: () => void;
  setScenarioTime: (t: number) => void;
  setRenderPass: (pass: RenderPass) => void;
  startRender: () => void;

  // UI
  setGizmoMode: (mode: GizmoMode) => void;
  toggleDrawingPath: () => void;
}

export type EditorStore = EditorState & EditorActions;

// ── Store ────────────────────────────────────────────────────────────────────

export const useEditorStore = create<EditorStore>()((set, get) => {
  function setTrack(actorId: string, updater: (track: WaypointTrack) => WaypointTrack) {
    const { scenario } = get();
    if (actorId === 'ego') {
      set({ scenario: { ...scenario, egoTrack: updater(scenario.egoTrack) } });
    } else {
      set({
        scenario: {
          ...scenario,
          tracks: scenario.tracks.map(t => t.actorId === actorId ? updater(t) : t),
        },
      });
    }
  }

  return {
    // ── Initial state ──────────────────────────────────────────────────────
    blocks: [{ id: 'default-0', position: [0, 0, 0], roadType: 'straight', rotation: 1 }],
    selectedRoadType: null,
    ghostRotation: 1,
    gizmoMode: 'translate',

    sceneryItems: [],
    selectedSceneryType: null,
    sceneryGhostRotation: 0,
    selection: { kind: 'actor', id: 'ego' },
    drawingPath: false,
    selectedWaypointId: null,
    selectedWaypointActorId: null,
    waypointPopupPos: null,

    scenario: defaultScenario(),
    scenarioTime: 0,

    playing: false,
    renderPass: 'idle',

    // ── Road editor actions ────────────────────────────────────────────────
    selectRoadType: (type) => {
      set({ selectedRoadType: type, selectedSceneryType: null });
    },

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

    selectBlock: (id) => set({ selection: { kind: 'tile', id }, drawingPath: false, selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null }),
    deselectBlock: () => set({ selection: { kind: 'actor', id: 'ego' }, drawingPath: false, selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null }),

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

    // ── Scenery actions ────────────────────────────────────────────────────
    selectSceneryType: (type) => {
      set({ selectedSceneryType: type, selectedRoadType: null });
    },

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

    selectSceneryItem: (id) => set({ selection: { kind: 'scenery', id }, drawingPath: false, selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null }),

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
          egoTrack: { actorId: 'ego', waypoints: [{ id: uid(), time: 0, position: [0, 0, 0], targetSpeed: EGO_TOP_SPEED }] },
        },
      });
    },

    // ── Selection actions ──────────────────────────────────────────────────
    selectActor: (id) => set({ selection: { kind: 'actor', id }, drawingPath: false, selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null }),
    selectWaypoint: (actorId, id) => set({ selectedWaypointId: id, selectedWaypointActorId: actorId }),
    setWaypointPopupPos: (pos) => set({ waypointPopupPos: pos }),
    dismissWaypointPopup: () => set({ selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null }),

    // ── Actor actions ──────────────────────────────────────────────────────
    addActor: (kind) => {
      const { scenario } = get();
      const id = uid();
      const count = scenario.actors.length;
      const kindLabels: Record<ActorKind, string> = {
        pedestrian: 'Pedestrian',
        stroller: 'Stroller',
        vehicle: 'Vehicle',
      };
      const defaults = KIND_DEFAULTS[kind];
      const actor: Actor = {
        id,
        kind,
        label: `${kindLabels[kind]} ${count + 1}`,
        color: nextActorColor(count),
        accel: defaults.accel,
        brake: defaults.brake,
        topSpeed: defaults.topSpeed,
      };
      const track: WaypointTrack = { actorId: id, waypoints: [{ id: uid(), time: 0, position: [0, 0, 0], targetSpeed: defaults.topSpeed }] };
      set({
        scenario: {
          ...scenario,
          actors: [...scenario.actors, actor],
          tracks: [...scenario.tracks, track],
        },
        selection: { kind: 'actor', id },
        drawingPath: false,
        selectedWaypointId: null,
        selectedWaypointActorId: null,
        waypointPopupPos: null,
      });
    },

    removeActor: (id) => {
      const { scenario, selection } = get();
      const selActorId = selectionActorId(selection);
      const needsReset = selActorId === id;
      set({
        scenario: {
          ...scenario,
          actors: scenario.actors.filter(a => a.id !== id),
          tracks: scenario.tracks.filter(t => t.actorId !== id),
        },
        selection: needsReset ? { kind: 'actor', id: 'ego' } : selection,
        drawingPath: false,
        selectedWaypointId: null,
        selectedWaypointActorId: null,
        waypointPopupPos: null,
      });
    },

    setActorStats: (id, stats) => {
      const { scenario } = get();
      set({
        scenario: {
          ...scenario,
          actors: scenario.actors.map(a => a.id === id ? { ...a, ...stats } : a),
        },
      });
    },

    setEgoStats: (stats) => {
      const { scenario } = get();
      set({ scenario: { ...scenario, egoStats: { ...scenario.egoStats, ...stats } } });
    },

    // ── Waypoint actions ───────────────────────────────────────────────────
    addWaypoint: (actorId, _time, position) => {
      const { scenario } = get();
      const id = uid();
      const dur = scenario.duration;

      setTrack(actorId, track => {
        const wps = track.waypoints;
        if (isEvenlyDistributed(wps, dur)) {
          const newWps = [...wps, { id, time: dur, position, targetSpeed: EGO_TOP_SPEED }];
          const n = newWps.length;
          return {
            ...track,
            waypoints: newWps.map((wp, i) => ({
              ...wp,
              time: n === 1 ? 0 : (i / (n - 1)) * dur,
            })),
          };
        } else {
          const lastTime = wps[wps.length - 1].time;
          const avgGap = wps.length > 1
            ? (wps[wps.length - 1].time - wps[0].time) / (wps.length - 1)
            : dur * 0.25;
          const newTime = Math.min(dur, lastTime + avgGap);
          return {
            ...track,
            waypoints: sortByTime([...wps, { id, time: newTime, position, targetSpeed: EGO_TOP_SPEED }]),
          };
        }
      });

      set({ selectedWaypointId: id });
    },

    moveWaypoint: (actorId, wpId, position) => {
      setTrack(actorId, track => ({
        ...track,
        waypoints: track.waypoints.map(w => w.id === wpId ? { ...w, position } : w),
      }));
    },

    setWaypointTime: (actorId, wpId, time) => {
      setTrack(actorId, track => ({
        ...track,
        waypoints: sortByTime(track.waypoints.map(w => w.id === wpId ? { ...w, time } : w)),
      }));
    },

    deleteWaypoint: (actorId, wpId) => {
      const { scenario } = get();
      const track = actorId === 'ego'
        ? scenario.egoTrack
        : scenario.tracks.find(t => t.actorId === actorId);
      if (!track || track.waypoints.length <= 1) return;

      setTrack(actorId, track => ({
        ...track,
        waypoints: track.waypoints.filter(w => w.id !== wpId),
      }));
      const { selectedWaypointId } = get();
      if (selectedWaypointId === wpId) {
        set({ selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null });
      }
    },

    setWaypointTargetSpeed: (actorId, wpId, speed) => {
      setTrack(actorId, track => ({
        ...track,
        waypoints: track.waypoints.map(w => w.id === wpId ? { ...w, targetSpeed: speed } : w),
      }));
    },

    // ── Scenario actions ───────────────────────────────────────────────────
    setDuration: (duration) => {
      const { scenario } = get();
      const newDur = Math.max(1, duration);
      const scale = newDur / scenario.duration;
      const rescaleTrack = (track: WaypointTrack): WaypointTrack => ({
        ...track,
        waypoints: track.waypoints.map(wp => ({ ...wp, time: wp.time * scale })),
      });
      set({
        scenario: {
          ...scenario,
          duration: newDur,
          egoTrack: rescaleTrack(scenario.egoTrack),
          tracks: scenario.tracks.map(rescaleTrack),
        },
      });
    },

    // ── Playback actions ───────────────────────────────────────────────────
    togglePlaying: () => set(s => ({ playing: !s.playing })),
    setScenarioTime: (t) => set({ scenarioTime: t }),
    setRenderPass: (pass) => set({ renderPass: pass }),
    startRender: () => set({ scenarioTime: 0, playing: false, renderPass: 'rgb' }),

    // ── UI actions ─────────────────────────────────────────────────────────
    setGizmoMode: (mode) => set({ gizmoMode: mode }),
    toggleDrawingPath: () => {
      const { selection, drawingPath } = get();
      if (!drawingPath && selection?.kind !== 'actor') return;
      const disabling = drawingPath;
      set({
        drawingPath: !drawingPath,
        ...(disabling ? { selectedWaypointId: null, selectedWaypointActorId: null, waypointPopupPos: null } : {}),
      });
    },
  };
});
