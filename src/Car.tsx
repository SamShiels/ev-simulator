import { Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'

const MTL = '/assets/car/sedan-sports.mtl'
const OBJ = '/assets/car/sedan-sports.obj'

function Model({ position }: { position: [number, number, number] }) {
  const materials = useLoader(MTLLoader, MTL)
  const obj = useLoader(OBJLoader, OBJ, loader => {
    materials.preload()
    loader.setMaterials(materials)
  })

  return <primitive object={obj.clone()} position={position} scale={0.4} />
}

export default function Car({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <Suspense fallback={null}>
      <Model position={position} />
    </Suspense>
  )
}
