import { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Waypoint } from '../scenario/types';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const POLE_HEIGHT = 0.6;
const POLE_RADIUS = 0.04;
const SPHERE_RADIUS = 0.18;
const HOVER_Y = 0.0;

interface Props {
  waypoint: Waypoint;
  color: string;
  selected: boolean;
  onSelect: () => void;
  onMove: (pos: [number, number, number]) => void;
}

export default function WaypointMarker({ waypoint, color, selected, onSelect, onMove }: Props) {
  const { gl, camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const posRef = useRef<[number, number, number]>(waypoint.position);
  posRef.current = waypoint.position;
  const rc = useRef(new THREE.Raycaster());
  const hitPt = useRef(new THREE.Vector3());

  const [px, py, pz] = waypoint.position;
  const sphereColor = selected ? '#ffffff' : hovered ? '#cccccc' : color;

  function raycastGround(e: PointerEvent): [number, number, number] | null {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    rc.current.setFromCamera(ndc, camera);
    if (!rc.current.ray.intersectPlane(GROUND, hitPt.current)) return null;
    return [hitPt.current.x, 0, hitPt.current.z];
  }

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSelect();

    let moved = false;

    function handleMove(ev: PointerEvent) {
      const p = raycastGround(ev);
      if (!p) return;
      moved = true;
      onMove(p);
    }

    function handleUp() {
      document.body.style.cursor = hovered ? 'grab' : '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (!moved) {
        // Pure click, selection already handled above
      }
    }

    document.body.style.cursor = 'grabbing';
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  return (
    <group position={[px, py + HOVER_Y, pz]}>
      {/* Pole */}
      <mesh position={[0, POLE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS, POLE_HEIGHT, 6]} />
        <meshBasicMaterial color={selected ? '#ffffff' : color} />
      </mesh>

      {/* Sphere (interactive) */}
      <mesh
        position={[0, POLE_HEIGHT + SPHERE_RADIUS, 0]}
        onPointerDown={handlePointerDown}
        onPointerEnter={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'grab';
        }}
        onPointerLeave={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[SPHERE_RADIUS, 10, 8]} />
        <meshBasicMaterial color={sphereColor} />
      </mesh>

      {/* Index label rendered as a small disc (no HTML in canvas) */}
      <mesh position={[0, POLE_HEIGHT + SPHERE_RADIUS * 2 + 0.08, 0]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshBasicMaterial color={color} transparent opacity={0.0} />
      </mesh>
    </group>
  );
}

