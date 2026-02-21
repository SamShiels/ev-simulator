import { Suspense, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import type { RoadType } from '../App'
import { TILE_SIZE } from '../constants'

const OBJ_PATH: Record<RoadType, string> = {
  straight: '/assets/roads/road-straight.obj',
  corner:   '/assets/roads/road-curve-pavement.obj',
}
const MTL_PATH: Record<RoadType, string> = {
  straight: '/assets/roads/road-straight.mtl',
  corner:   '/assets/roads/road-curve-pavement.mtl',
}

export function RoadTileModel({
  roadType,
  rotation,
  ghost,
}: {
  roadType: RoadType
  rotation: number
  ghost: boolean
}) {
  const materials = useLoader(MTLLoader, MTL_PATH[roadType])
  const obj = useLoader(OBJLoader, OBJ_PATH[roadType], loader => {
    materials.preload()
    loader.setMaterials(materials)
  })

  const clone = useMemo(() => {
    const c = obj.clone()
    if (ghost) {
      c.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return
        const mat = ((child as THREE.Mesh).material as THREE.Material).clone()
        mat.transparent = true
        mat.opacity = 0.5
        ;(child as THREE.Mesh).material = mat
      })
    }
    return c
  }, [obj, ghost])

  return (
    <primitive
      object={clone}
      scale={TILE_SIZE * 0.5}
      rotation={[0, (rotation * Math.PI) / 2, 0]}
    />
  )
}

export default function RoadTile({
  position,
  roadType,
  rotation,
  ghost = false,
  selected = false,
}: {
  position: [number, number, number];
  roadType: RoadType;
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
        <RoadTileModel roadType={roadType} rotation={rotation} ghost={ghost} />
      </Suspense>
    </group>
  );
}
