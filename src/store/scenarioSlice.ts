import type { StateCreator } from 'zustand';
import type { Scenario, Waypoint, WaypointTrack, Actor, ActorKind, ActorStats } from '../scenario/types';
import { defaultScenario, nextActorColor } from '../scenario/defaults';
import { createSpeedProfile } from '../scenario/interpolate';
import {
  EGO_ACCEL, EGO_BRAKE, EGO_TOP_SPEED,
  PEDESTRIAN_ACCEL, PEDESTRIAN_BRAKE, PEDESTRIAN_TOP_SPEED,
} from '../constants';
import { selectionActorId } from './scenerySlice';
import type { EditorStore } from './useEditorStore';

const KIND_DEFAULTS: Record<ActorKind, ActorStats> = {
  vehicle:    { accel: EGO_ACCEL,        brake: EGO_BRAKE,        topSpeed: EGO_TOP_SPEED },
  pedestrian: { accel: PEDESTRIAN_ACCEL, brake: PEDESTRIAN_BRAKE, topSpeed: PEDESTRIAN_TOP_SPEED },
  stroller:   { accel: PEDESTRIAN_ACCEL, brake: PEDESTRIAN_BRAKE, topSpeed: PEDESTRIAN_TOP_SPEED },
};

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

export type ScenarioSlice = {
  scenario: Scenario;
  selectedActorKind: ActorKind | null;

  selectActorKind: (kind: ActorKind | null) => void;
  placeActor: (pos: [number, number, number]) => void;
  addActor: (kind: ActorKind) => void;
  removeActor: (id: string) => void;
  setActorStats: (id: string, stats: Partial<ActorStats>) => void;
  setEgoStats: (stats: Partial<ActorStats>) => void;
  addWaypoint: (actorId: string, time: number, pos: [number, number, number]) => void;
  moveWaypoint: (actorId: string, wpId: string, pos: [number, number, number]) => void;
  setWaypointTime: (actorId: string, wpId: string, time: number) => void;
  deleteWaypoint: (actorId: string, wpId: string) => void;
  setWaypointTargetSpeed: (actorId: string, wpId: string, speed: number) => void;
  setDuration: (duration: number) => void;
};

export const createScenarioSlice: StateCreator<EditorStore, [], [], ScenarioSlice> = (set, get) => {
  function setTrack(actorId: string, updater: (track: WaypointTrack) => WaypointTrack): void {
    const { scenario } = get();
    if (actorId === 'ego') {
      const updated = updater(scenario.egoTrack);
      const { accel, brake, topSpeed } = scenario.egoStats;
      set({ scenario: { ...scenario, egoTrack: createSpeedProfile(updated, accel, brake, topSpeed) } });
    } else {
      set({
        scenario: {
          ...scenario,
          tracks: scenario.tracks.map(t => {
            if (t.actorId !== actorId) return t;
            const updated = updater(t);
            const actor = scenario.actors.find(a => a.id === actorId);
            if (!actor) return updated;
            return createSpeedProfile(updated, actor.accel, actor.brake, actor.topSpeed);
          }),
        },
      });
    }
  }

  return {
    scenario: defaultScenario(),
    selectedActorKind: null,

    selectActorKind: (kind) => set({ selectedActorKind: kind, selectedRoadId: null, selectedSceneryType: null }),

    placeActor: (pos) => {
      const { selectedActorKind, scenario } = get();
      if (!selectedActorKind) return;
      const id = uid();
      const count = scenario.actors.length;
      const kindLabels: Record<ActorKind, string> = {
        pedestrian: 'Pedestrian',
        stroller: 'Stroller',
        vehicle: 'Vehicle',
      };
      const defaults = KIND_DEFAULTS[selectedActorKind];
      const actor: Actor = {
        id,
        kind: selectedActorKind,
        label: `${kindLabels[selectedActorKind]} ${count + 1}`,
        color: nextActorColor(count),
        accel: defaults.accel,
        brake: defaults.brake,
        topSpeed: defaults.topSpeed,
      };
      const track: WaypointTrack = { actorId: id, waypoints: [{ id: uid(), time: 0, position: pos, targetSpeed: defaults.topSpeed / 2 }], length: 0 };
      set({
        scenario: {
          ...scenario,
          actors: [...scenario.actors, actor],
          tracks: [...scenario.tracks, track],
        },
        selection: { kind: 'actor', id },
        drawingPath: true,
        selectedActorKind: null,
        selectedWaypointId: null,
        selectedWaypointActorId: null,
        waypointPopupPos: null,
      });
    },

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
      const track: WaypointTrack = { actorId: id, waypoints: [{ id: uid(), time: 0, position: [0, 0, 0], targetSpeed: defaults.topSpeed / 2 }], length: 0 };
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
      const needsReset = selectionActorId(selection) === id;
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

    addWaypoint: (actorId, _time, position) => {
      const { scenario } = get();
      const id = uid();
      const dur = scenario.duration;

      setTrack(actorId, track => {
        const wps = track.waypoints;
        if (isEvenlyDistributed(wps, dur)) {
          const newWps = [...wps, { id, time: dur, position, targetSpeed: EGO_TOP_SPEED / 2 }];
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
            waypoints: sortByTime([...wps, { id, time: newTime, position, targetSpeed: EGO_TOP_SPEED / 2 }]),
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

      setTrack(actorId, t => ({
        ...t,
        waypoints: t.waypoints.filter(w => w.id !== wpId),
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
  };
};
