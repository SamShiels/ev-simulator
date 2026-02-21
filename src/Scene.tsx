import { useState, useRef, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Block, RoadType } from './App';
import { TILE_SIZE } from './constants';
import Car from './Car';
import CurveLine from './visuals/CurveLine';
import RoadTile from './visuals/RoadTile';
import SelectionGizmo from './visuals/SelectionGizmo';
import { findRoadPath } from './road/pathfinder';
import { buildRoadCurve } from './road/roadCurve';

interface Props {
  blocks: Block[];
  selectedRoadType: RoadType;
  ghostRotation: number;
  selectedId: string | null;
  onPlace: (pos: [number, number, number]) => void;
  onRotate: () => void;
  onSelectBlock: (id: string) => void;
  onDeselect: () => void;
  onMoveBlock: (id: string, newPos: [number, number, number]) => void;
}

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function snap(p: THREE.Vector3): [number, number, number] {
  return [Math.round(p.x / TILE_SIZE) * TILE_SIZE, 0, Math.round(p.z / TILE_SIZE) * TILE_SIZE];
}

export default function Scene({
  blocks,
  selectedRoadType,
  ghostRotation,
  selectedId,
  onPlace,
  onRotate,
  onSelectBlock,
  onDeselect,
  onMoveBlock,
}: Props) {
  const { gl, camera } = useThree();
  const [ghost, setGhost] = useState<[number, number, number] | null>(null);

  // Shared with SelectionGizmo — true while an axis drag is in progress.
  const isDraggingGizmoRef = useRef(false);

  // Option/Alt + drag to pan.
  const prevPtrRef  = useRef<{ x: number; y: number } | null>(null);
  const rightVec    = useRef(new THREE.Vector3());
  const screenUpVec = useRef(new THREE.Vector3());

  // Keep stable refs for callbacks so event listeners don't need to re-register.
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;
  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;
  const onSelectBlockRef = useRef(onSelectBlock);
  onSelectBlockRef.current = onSelectBlock;
  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;


  const roadCurve = useMemo(() => {
    const result = findRoadPath(blocks);
    return result ? buildRoadCurve(result) : null;
  }, [blocks]);

  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    const rc = new THREE.Raycaster();
    const hit = new THREE.Vector3();

    function toGrid(e: MouseEvent | PointerEvent): [number, number, number] | null {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      rc.setFromCamera(ndc, camera);
      return rc.ray.intersectPlane(GROUND, hit) ? snap(hit) : null;
    }

    const onMove = (e: PointerEvent) => {
      const prev = prevPtrRef.current;
      prevPtrRef.current = { x: e.clientX, y: e.clientY };

      if (e.altKey && prev && (e.buttons & 1)) {
        // Option + drag → pan camera.
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        const speed = 1 / camera.zoom;
        rightVec.current.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
        screenUpVec.current.setFromMatrixColumn(camera.matrixWorld, 1).setY(0).normalize();
        camera.position.addScaledVector(rightVec.current, -dx * speed);
        camera.position.addScaledVector(screenUpVec.current, dy * speed);
        setGhost(null);
      } else if (!isDraggingGizmoRef.current && !e.altKey) {
        setGhost(toGrid(e));
      }
    };

    const onClick = (e: MouseEvent) => {
      if (isDraggingGizmoRef.current || e.altKey) return;
      const p = toGrid(e);
      if (!p) return;
      const existing = blocksRef.current.find(
        b => b.position[0] === p[0] && b.position[2] === p[2],
      );
      if (existing) {
        onSelectBlockRef.current(existing.id);
      } else {
        onDeselectRef.current();
        onPlaceRef.current(p);
      }
    };

    const onLeave = () => {
      prevPtrRef.current = null;
      setGhost(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        e.preventDefault();
        canvas.style.cursor = 'grab';
        setGhost(null);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        canvas.style.cursor = '';
      }
    };

    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      onRotateRef.current();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      camera.zoom = Math.max(15, Math.min(300, camera.zoom * factor));
      camera.updateProjectionMatrix();
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('contextmenu', onContext);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gl, camera]);

  const selectedBlock = selectedId ? blocks.find(b => b.id === selectedId) ?? null : null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <gridHelper args={[30, 30, '#444', '#2a2a2a']} />
      <CurveLine curve={roadCurve} />
      <Car curve={roadCurve} />

      {ghost && (
        <RoadTile
          position={[ghost[0], 0, ghost[2]]}
          roadType={selectedRoadType}
          rotation={ghostRotation}
          ghost
        />
      )}

      {blocks.map(b => (
        <RoadTile
          key={b.id}
          position={[b.position[0], 0, b.position[2]]}
          roadType={b.roadType}
          rotation={b.rotation}
          selected={b.id === selectedId}
        />
      ))}

      {selectedBlock && (
        <SelectionGizmo
          position={selectedBlock.position}
          onMove={(newPos) => onMoveBlock(selectedId!, newPos)}
          isDraggingRef={isDraggingGizmoRef}
        />
      )}
    </>
  );
}
