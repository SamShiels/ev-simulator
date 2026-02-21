import { Suspense, useRef, useMemo } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import * as THREE from 'three'

const MTL = '/assets/car/sedan-sports.mtl'
const OBJ = '/assets/car/sedan-sports.obj'

// World units per second along the curve
const SPEED = 6

interface Props {
  curve: THREE.CatmullRomCurve3 | null
}

function Model({ curve }: Props) {
  const materials = useLoader(MTLLoader, MTL)
  const obj = useLoader(OBJLoader, OBJ, loader => {
    materials.preload()
    loader.setMaterials(materials)
  })

  // Clone once so the cached loader object isn't mutated by the scene graph
  const clone = useMemo(() => obj.clone(), [obj])

  const groupRef = useRef<THREE.Group>(null)
  const tRef = useRef(0)

  useFrame((_, delta) => {
    if (!curve || !groupRef.current) return

    // Advance t proportional to world-space speed
    const len = curve.getLength()
    tRef.current = (tRef.current + (SPEED / len) * delta) % 1

    const pos = curve.getPoint(tRef.current)
    const tangent = curve.getTangent(tRef.current)

    groupRef.current.position.copy(pos)
    // atan2(x, z) gives the Y rotation for a model that faces +Z by default
    groupRef.current.rotation.y = Math.atan2(tangent.x, tangent.z)
  })

  return (
    <group ref={groupRef}>
      <primitive object={clone} scale={0.4} />
    </group>
  )
}

export default function Car({ curve }: Props) {
  return (
    <Suspense fallback={null}>
      <Model curve={curve} />
    </Suspense>
  )
}
