export type ActorKind = 'pedestrian' | 'stroller' | 'vehicle';

export interface Waypoint {
  id: string;
  time: number; // seconds along the timeline
  position: [number, number, number]; // world XYZ
}

export interface WaypointTrack {
  actorId: string;
  waypoints: Waypoint[]; // sorted by time ascending
}

export interface Actor {
  id: string;
  kind: ActorKind;
  label: string;
  color: string; // hex color for markers and timeline lane
}

export interface Scenario {
  duration: number; // total seconds
  egoTrack: WaypointTrack; // the car's scripted path
  actors: Actor[]; // non-ego actors
  tracks: WaypointTrack[]; // one track per actor (matched by actorId)
}

export interface ScenarioPose {
  position: [number, number, number];
  yaw: number; // radians
}
