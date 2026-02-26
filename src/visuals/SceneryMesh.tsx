import { Suspense, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import type { SceneryType } from '../App';
import { TILE_SIZE } from '../constants';

const OBJ_PATH: Record<SceneryType, string> = {
  'building-a': '/assets/city/building-type-a.obj',
  'building-b': '/assets/city/building-type-b.obj',
  'building-c': '/assets/city/building-type-c.obj',
};

const MTL_PATH: Record<SceneryType, string> = {
  'building-a': '/assets/city/building-type-a.mtl',
  'building-b': '/assets/city/building-type-b.mtl',
  'building-c': '/assets/city/building-type-c.mtl',
};


export function SceneryModel({
  sceneryType,
  rotation,
  ghost,
}: {
  sceneryType: SceneryType;
  rotation: number;
  ghost: boolean;
}) {
  const materials = useLoader(MTLLoader, MTL_PATH[sceneryType]);
  const obj = useLoader(OBJLoader, OBJ_PATH[sceneryType], loader => {
    materials.preload();
    loader.setMaterials(materials);
  });

  const clone = useMemo(() => {
    const c = obj.clone();
    if (ghost) {
      c.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mat = ((child as THREE.Mesh).material as THREE.Material).clone();
        mat.transparent = true;
        mat.opacity = 0.5;
        (child as THREE.Mesh).material = mat;
      });
    }
    return c;
  }, [obj, ghost]);

  return (
    <primitive
      object={clone}
      scale={TILE_SIZE}
      rotation={[0, (rotation * Math.PI) / 2, 0]}
    />
  );
}

export default function SceneryMesh({
  position,
  sceneryType,
  rotation,
  ghost = false,
  selected = false,
}: {
  position: [number, number, number];
  sceneryType: SceneryType;
  rotation: number;
  ghost?: boolean;
  selected?: boolean;
}) {
  return (
    <group position={position}>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TILE_SIZE * 0.97, TILE_SIZE * 0.97]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      <Suspense fallback={null}>
        <SceneryModel sceneryType={sceneryType} rotation={rotation} ghost={ghost} />
      </Suspense>
    </group>
  );
}
