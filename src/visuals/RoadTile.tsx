import { Suspense, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import type { RoadType } from '../App'
import { TILE_SIZE } from '../constants'

const OBJ_PATH: Record<RoadType, string> = {
  straight: '/assets/roads/road-straight.obj',
  corner:   '/assets/roads/road-bend-sidewalk.obj',
}
const MTL_PATH: Record<RoadType, string> = {
  straight: '/assets/roads/road-straight.mtl',
  corner:   '/assets/roads/road-bend-sidewalk.mtl',
}

function RoadTileModel({
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
      scale={TILE_SIZE}
      rotation={[0, (rotation * Math.PI) / 2, 0]}
    />
  )
}

export default function RoadTile({
  position,
  roadType,
  rotation,
  ghost = false,
}: {
  position: [number, number, number]
  roadType: RoadType
  rotation: number
  ghost?: boolean
}) {
  return (
    <group position={position}>
      <Suspense fallback={null}>
        <RoadTileModel roadType={roadType} rotation={rotation} ghost={ghost} />
      </Suspense>
    </group>
  )
}
