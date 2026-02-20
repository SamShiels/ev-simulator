import { useState, useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Block } from './App'

interface Props {
  blocks: Block[]
  selectedColor: string
  onPlace: (pos: [number, number, number]) => void
}

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

function snap(p: THREE.Vector3): [number, number, number] {
  return [Math.round(p.x), 0, Math.round(p.z)]
}

export default function Scene({ blocks, selectedColor, onPlace }: Props) {
  const { gl, camera } = useThree()
  const [ghost, setGhost] = useState<[number, number, number] | null>(null)
  const onPlaceRef = useRef(onPlace)
  onPlaceRef.current = onPlace

  // Point isometric camera at origin
  useEffect(() => {
    camera.lookAt(0, 0, 0)
  }, [camera])

  // Raycast against the y=0 plane directly from canvas events,
  // so placed blocks never interfere with snapping
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

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('pointerleave', onLeave)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [gl, camera])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <gridHelper args={[30, 30, '#444', '#2a2a2a']} />

      {ghost && (
        <mesh position={[ghost[0], 0.5, ghost[2]]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={selectedColor} transparent opacity={0.5} />
        </mesh>
      )}

      {blocks.map(b => (
        <mesh key={b.id} position={[b.position[0], 0.5, b.position[2]]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={b.color} />
        </mesh>
      ))}
    </>
  )
}
