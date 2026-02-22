import { useMemo } from 'react';
import * as THREE from 'three';
import type { WaypointTrack } from '../scenario/types';

interface Props {
  track: WaypointTrack;
  color: string;
}

const SAMPLE_COUNT = 80;

export default function TrackLine({ track, color }: Props) {
  const line = useMemo(() => {
    const wps = track.waypoints;
    if (wps.length < 2) return null;

    const curve = new THREE.CatmullRomCurve3(
      wps.map(w => new THREE.Vector3(w.position[0], w.position[1] + 0.05, w.position[2])),
      false,
      'centripetal',
    );

    const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SAMPLE_COUNT));
    const mat = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geom, mat);
  }, [track.waypoints, color]);

  if (!line) return null;
  return <primitive object={line} />;
}
