import { useState, useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Block, RoadType } from './App';
import { TILE_SIZE } from './constants';
import Car from './Car';
import CurveLine from './visuals/CurveLine';
import RoadTile from './visuals/RoadTile';
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
}: Props) {
  const { gl, camera } = useThree();
  const [ghost, setGhost] = useState<[number, number, number] | null>(null);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);

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

  // Edge pan: move camera each frame when cursor is within EDGE_PX of the viewport border.
  const EDGE_PX = 40;
  const right = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  useFrame((_, delta) => {
    const pos = pointerPosRef.current;
    if (!pos) return;
    const rect = gl.domElement.getBoundingClientRect();
    const xRel = pos.x - rect.left;
    const yRel = pos.y - rect.top;

    const speed = (800 / camera.zoom) * delta;

    right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    screenUp.setFromMatrixColumn(camera.matrixWorld, 1).setY(0).normalize();

    if (xRel < EDGE_PX)                    camera.position.addScaledVector(right, -speed);
    else if (xRel > rect.width - EDGE_PX)  camera.position.addScaledVector(right,  speed);
    if (yRel < EDGE_PX)                    camera.position.addScaledVector(screenUp,  speed);
    else if (yRel > rect.height - EDGE_PX) camera.position.addScaledVector(screenUp, -speed);
  });

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
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      setGhost(toGrid(e));
    };

    const onClick = (e: MouseEvent) => {
      const p = toGrid(e);
      if (!p) return;

      // If an existing block occupies this grid cell, select it instead of placing.
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
      pointerPosRef.current = null;
      setGhost(null);
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
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl, camera]);

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
    </>
  );
}
