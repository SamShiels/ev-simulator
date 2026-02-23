import { create } from 'zustand';
import type { RoadType, GizmoMode, RenderPass, Block, SelectedObject } from '../App';
import type { Scenario, Waypoint, WaypointTrack, Actor, ActorKind } from '../scenario/types';
import { defaultScenario, nextActorColor } from '../scenario/defaults';
import { findRoadPath } from '../road/pathfinder';
import { getRoadWaypoints } from '../road/roadCurve';

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

// ── Store types ──────────────────────────────────────────────────────────────

interface EditorState {
  // Road editor
  blocks: Block[];
  selectedRoadType: RoadType | null;
  ghostRotation: number;
  selectedObject: SelectedObject;
  gizmoMode: GizmoMode;

  // Scenario
  scenario: Scenario;
  scenarioTime: number;
  selectedWaypointId: string | null;
  selectedActorId: string;

  // Playback / UI
  playing: boolean;
  renderPass: RenderPass;
  drawingPath: boolean;
}

interface EditorActions {
  // Road editor
  selectRoadType: (type: RoadType | null) => void;
  rotateGhost: () => void;
  placeBlock: (pos: [number, number, number]) => void;
  selectBlock: (id: string) => void;
  deselectBlock: () => void;
  moveBlock: (id: string, pos: [number, number, number]) => void;
  rotateBlock: (id: string, delta: 1 | -1) => void;
  deleteSelectedBlock: () => void;
  seedEgoTrack: () => void;

  // Actors
  addActor: (kind: ActorKind) => void;
  removeActor: (id: string) => void;
  selectActor: (id: string) => void;

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
  setDrawingPath: (drawing: boolean) => void;
  toggleDrawingPath: () => void;
}

export type EditorStore = EditorState & EditorActions;

// ── Store ────────────────────────────────────────────────────────────────────

export const useEditorStore = create<EditorStore>()((set, get) => {
  // Helper: update a track by actorId
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
    selectedObject: null,
    gizmoMode: 'translate',

    scenario: defaultScenario(),
    scenarioTime: 0,
    selectedWaypointId: null,
    selectedActorId: 'ego',

    playing: false,
    renderPass: 'idle',
    drawingPath: false,

    // ── Road editor actions ────────────────────────────────────────────────
    selectRoadType: (type) => {
      set({ selectedRoadType: type });
      if (type !== null) set({ drawingPath: false });
    },

    rotateGhost: () => set(s => ({ ghostRotation: (s.ghostRotation + 1) % 4 })),

    placeBlock: (pos) => {
      const { selectedRoadType, ghostRotation, blocks, scenario } = get();
      if (!selectedRoadType) return;
      const occupied = blocks.some(b => b.position[0] === pos[0] && b.position[2] === pos[2]);
      if (occupied) return;

      const newBlock: Block = {
        id: `${pos[0]}-${pos[2]}-${Date.now()}`,
        position: pos,
        roadType: selectedRoadType,
        rotation: ghostRotation,
      };
      const newBlocks = [...blocks, newBlock];

      const oldPath = findRoadPath(blocks);
      const oldPathLen = oldPath?.length ?? 0;
      const newPath = findRoadPath(newBlocks);

      if (!newPath || newPath.length <= oldPathLen) {
        set({ blocks: newBlocks });
        return;
      }

      const oldPts = oldPath ? getRoadWaypoints(oldPath) : [];
      const newPts = getRoadWaypoints(newPath);
      const addedPts = newPts.slice(oldPts.length);

      if (addedPts.length === 0) {
        set({ blocks: newBlocks });
        return;
      }

      const addedWps: Waypoint[] = addedPts.map(pt => ({
        id: uid(),
        time: 0,
        position: [pt.x, pt.y, pt.z] as [number, number, number],
      }));

      const wps = [...scenario.egoTrack.waypoints, ...addedWps];
      const n = wps.length;
      const dur = scenario.duration;
      const redistributed = wps.map((wp, i) => ({
        ...wp,
        time: n === 1 ? 0 : (i / (n - 1)) * dur,
      }));

      set({
        blocks: newBlocks,
        scenario: {
          ...scenario,
          egoTrack: { ...scenario.egoTrack, waypoints: redistributed },
        },
      });
    },

    selectBlock: (id) => set({ selectedObject: { kind: 'tile', id } }),
    deselectBlock: () => set({ selectedObject: null }),

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
      const { selectedObject, blocks } = get();
      if (!selectedObject || selectedObject.kind !== 'tile') return;
      const block = blocks.find(b => b.id === selectedObject.id);
      if (block && block.position[0] === 0 && block.position[2] === 0) return;
      set({
        blocks: blocks.filter(b => b.id !== selectedObject.id),
        selectedObject: null,
      });
    },

    seedEgoTrack: () => {
      const { blocks, scenario } = get();
      const path = findRoadPath(blocks);
      if (!path) {
        set({ scenario: { ...scenario, egoTrack: { actorId: 'ego', waypoints: [] } } });
        return;
      }
      const pts = getRoadWaypoints(path);
      const n = pts.length;
      const dur = scenario.duration;
      const waypoints: Waypoint[] = pts.map((pt, i) => ({
        id: uid(),
        time: n === 1 ? 0 : (i / (n - 1)) * dur,
        position: [pt.x, pt.y, pt.z],
      }));
      set({ scenario: { ...scenario, egoTrack: { actorId: 'ego', waypoints } } });
    },

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
      const actor: Actor = {
        id,
        kind,
        label: `${kindLabels[kind]} ${count + 1}`,
        color: nextActorColor(count),
      };
      const track: WaypointTrack = { actorId: id, waypoints: [] };
      set({
        scenario: {
          ...scenario,
          actors: [...scenario.actors, actor],
          tracks: [...scenario.tracks, track],
        },
        selectedActorId: id,
        drawingPath: true,
      });
    },

    removeActor: (id) => {
      const { scenario, selectedActorId } = get();
      set({
        scenario: {
          ...scenario,
          actors: scenario.actors.filter(a => a.id !== id),
          tracks: scenario.tracks.filter(t => t.actorId !== id),
        },
        selectedActorId: selectedActorId === id ? 'ego' : selectedActorId,
      });
    },

    selectActor: (id) => set({ selectedActorId: id, selectedWaypointId: null }),

    // ── Waypoint actions ───────────────────────────────────────────────────
    addWaypoint: (actorId, _time, position) => {
      const { scenario } = get();
      const id = uid();
      const dur = scenario.duration;

      setTrack(actorId, track => {
        const wps = track.waypoints;
        if (isEvenlyDistributed(wps, dur)) {
          const newWps = [...wps, { id, time: dur, position }];
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
            waypoints: sortByTime([...wps, { id, time: newTime, position }]),
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
      setTrack(actorId, track => ({
        ...track,
        waypoints: track.waypoints.filter(w => w.id !== wpId),
      }));
      const { selectedWaypointId } = get();
      if (selectedWaypointId === wpId) set({ selectedWaypointId: null });
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
    setDrawingPath: (drawing) => set({ drawingPath: drawing }),
    toggleDrawingPath: () => set(s => ({ drawingPath: !s.drawingPath })),
  };
});
