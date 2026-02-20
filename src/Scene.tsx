import { useState, useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Block, RoadType } from './App'
import { getRoadTexture } from './visuals/textures/road'
import Car from './Car'

interface Props {
  blocks: Block[]
  selectedRoadType: RoadType
  ghostRotation: number
  onPlace: (pos: [number, number, number]) => void
  onRotate: () => void
}

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

function snap(p: THREE.Vector3): [number, number, number] {
  return [Math.round(p.x / 5) * 5, 0, Math.round(p.z / 5) * 5]
}

// A flat road tile. The inner mesh is rotated to lie flat (normal = +Y).
// The outer group handles the road-direction rotation around Y.
function RoadTile({
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
  const texture = getRoadTexture(roadType)
  return (
    <group position={position} rotation={[0, (rotation * Math.PI) / 2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial
          map={texture}
          transparent={ghost}
          opacity={ghost ? 0.55 : 1}
        />
      </mesh>
    </group>
  )
}

export default function Scene({
  blocks,
  selectedRoadType,
  ghostRotation,
  onPlace,
  onRotate,
}: Props) {
  const { gl, camera } = useThree()
  const [ghost, setGhost] = useState<[number, number, number] | null>(null)
  const onPlaceRef = useRef(onPlace)
  onPlaceRef.current = onPlace
  const onRotateRef = useRef(onRotate)
  onRotateRef.current = onRotate

  useEffect(() => {
    camera.lookAt(0, 0, 0)
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement
    const rc = new THREE.Raycaster()
    const hit = new THREE.Vector3()

    function toGrid(e: MouseEvent | PointerEvent): [number, number, number] | null {
      const rect = canvas.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      rc.setFromCamera(ndc, camera)
      return rc.ray.intersectPlane(GROUND, hit) ? snap(hit) : null
    }

    const onMove = (e: PointerEvent) => setGhost(toGrid(e))
    const onClick = (e: MouseEvent) => {
      const p = toGrid(e)
      if (p) onPlaceRef.current(p)
    }
    const onLeave = () => setGhost(null)
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      onRotateRef.current()
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('contextmenu', onContext)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('contextmenu', onContext)
    }
  }, [gl, camera])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <gridHelper args={[30, 30, '#444', '#2a2a2a']} />
      <Car position={[0, 0, 0]} />

      {ghost && (
        <RoadTile
          position={[ghost[0], 0.005, ghost[2]]}
          roadType={selectedRoadType}
          rotation={ghostRotation}
          ghost
        />
      )}

      {blocks.map(b => (
        <RoadTile
          key={b.id}
          position={[b.position[0], 0.005, b.position[2]]}
          roadType={b.roadType}
          rotation={b.rotation}
        />
      ))}
    </>
  )
}
