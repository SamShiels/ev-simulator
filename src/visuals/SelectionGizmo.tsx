import { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE_SIZE } from '../constants';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const Y_HOVER  = 0.15;
const SPHERE_R = 0.12;
const SHAFT_LEN = 0.8;
const SHAFT_R   = 0.075;
const CONE_H    = 0.28;
const CONE_R    = 0.14;

function snapToGrid(v: number) {
  return Math.round(v / TILE_SIZE) * TILE_SIZE;
}

// ── Single axis arrow ────────────────────────────────────────────────────────

interface ArrowProps {
  axis: 'x' | 'z';
  color: string;
  onDragStart: (axis: 'x' | 'z') => void;
}

function Arrow({ axis, color, onDragStart }: ArrowProps) {
  const [hovered, setHovered] = useState(false);
  const c = hovered ? '#ffffff' : color;

  // Default cylinder/cone points along +Y.
  // X axis: rotate -90° around Z → points along +X
  // Z axis: rotate +90° around X → points along +Z
  const rot: [number, number, number] = axis === 'x'
    ? [0, 0, -Math.PI / 2]
    : [Math.PI / 2, 0, 0];

  const shaftOffset = SPHERE_R + SHAFT_LEN / 2;
  const coneOffset  = SPHERE_R + SHAFT_LEN + CONE_H / 2;

  const shaftPos: [number, number, number] = axis === 'x'
    ? [shaftOffset, 0, 0] : [0, 0, shaftOffset];
  const conePos: [number, number, number] = axis === 'x'
    ? [coneOffset, 0, 0]  : [0, 0, coneOffset];

  return (
    <group
      onPointerDown={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onDragStart(axis); }}
      onPointerEnter={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab'; }}
      onPointerLeave={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = ''; }}
    >
      <mesh position={shaftPos} rotation={rot}>
        <cylinderGeometry args={[SHAFT_R, SHAFT_R, SHAFT_LEN, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <mesh position={conePos} rotation={rot}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
    </group>
  );
}

// ── SelectionGizmo ───────────────────────────────────────────────────────────

interface Props {
  position: [number, number, number];
  onMove: (newPos: [number, number, number]) => void;
  /** Ref shared with Scene so it can suppress ghost/place during drag. */
  isDraggingRef: React.MutableRefObject<boolean>;
}

export default function SelectionGizmo({ position, onMove, isDraggingRef }: Props) {
  const { gl, camera } = useThree();

  // Keep a ref so drag handlers always see the latest position without
  // needing to re-create the listeners on every render.
  const posRef = useRef(position);
  posRef.current = position;

  const rc    = useRef(new THREE.Raycaster());
  const hitPt = useRef(new THREE.Vector3());

  // If the gizmo unmounts while a drag is in progress, clean up.
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
    };
  }, [isDraggingRef]);

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

  function startDrag(axis: 'x' | 'z') {
    isDraggingRef.current = true;
    document.body.style.cursor = 'grabbing';

    function handleMove(e: PointerEvent) {
      const p = raycastGround(e);
      if (!p) return;
      const [curX, , curZ] = posRef.current;
      const newX = axis === 'x' ? snapToGrid(p[0]) : curX;
      const newZ = axis === 'z' ? snapToGrid(p[2]) : curZ;
      // Only call onMove when the snapped cell actually changed.
      if (newX !== curX || newZ !== curZ) {
        onMove([newX, 0, newZ]);
      }
    }

    function handleUp() {
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      // Delay clearing so the canvas click event (which fires after pointerup)
      // still sees isDraggingRef = true and skips the place/deselect logic.
      setTimeout(() => { isDraggingRef.current = false; }, 0);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  const [px, , pz] = position;

  return (
    <group position={[px, Y_HOVER, pz]}>
      {/* Central sphere at origin */}
      <mesh>
        <sphereGeometry args={[SPHERE_R, 12, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* X axis — red */}
      <Arrow axis="x" color="#ef4444" onDragStart={startDrag} />
      {/* Z axis — blue */}
      <Arrow axis="z" color="#3b82f6" onDragStart={startDrag} />
    </group>
  );
}
