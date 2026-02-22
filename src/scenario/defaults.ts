import type { Scenario, WaypointTrack } from './types';

export function defaultEgoTrack(): WaypointTrack {
  return { actorId: 'ego', waypoints: [] };
}

export function defaultScenario(): Scenario {
  return {
    duration: 10,
    egoTrack: defaultEgoTrack(),
    actors: [],
    tracks: [],
  };
}

const ACTOR_COLORS = [
  '#f97316', // orange
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

export function nextActorColor(existingCount: number): string {
  return ACTOR_COLORS[existingCount % ACTOR_COLORS.length];
}
