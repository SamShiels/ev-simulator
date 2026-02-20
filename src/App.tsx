import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'
import Sidebar from './Sidebar'

export type RoadType = 'straight' | 'corner'

export interface Block {
  id: string
  position: [number, number, number]
  roadType: RoadType
  rotation: number // 0–3, each step = 90°
}

export default function App() {
  const [selectedRoadType, setSelectedRoadType] = useState<RoadType>('straight')
  const [ghostRotation, setGhostRotation] = useState(0)
  const [blocks, setBlocks] = useState<Block[]>([])

  function placeBlock(pos: [number, number, number]) {
    const occupied = blocks.some(b => b.position[0] === pos[0] && b.position[2] === pos[2])
    if (occupied) return
    setBlocks(prev => [
      ...prev,
      {
        id: `${pos[0]}-${pos[2]}-${Date.now()}`,
        position: pos,
        roadType: selectedRoadType,
        rotation: ghostRotation,
      },
    ])
  }

  function rotate() {
    setGhostRotation(r => (r + 1) % 4)
  }

  return (
    <div className="dark relative w-screen h-screen bg-[#111]">
      <Canvas
        orthographic
        camera={{ position: [10, 10, 10], zoom: 60, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          blocks={blocks}
          selectedRoadType={selectedRoadType}
          ghostRotation={ghostRotation}
          onPlace={placeBlock}
          onRotate={rotate}
        />
      </Canvas>
      <Sidebar selectedRoadType={selectedRoadType} onSelect={setSelectedRoadType} />
    </div>
  )
}
