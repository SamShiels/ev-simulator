import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'
import Sidebar from './Sidebar'

export interface Block {
  id: string
  position: [number, number, number]
  color: string
}

export const COLORS = [
  '#4169E1', '#DC143C', '#228B22',
  '#FF8C00', '#9400D3', '#FFD700',
  '#FF6347', '#008B8B', '#A0A0A0',
  '#8B4513', '#20B2AA', '#FF69B4',
]

export default function App() {
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [blocks, setBlocks] = useState<Block[]>([])

  function placeBlock(pos: [number, number, number]) {
    const occupied = blocks.some(b => b.position[0] === pos[0] && b.position[2] === pos[2])
    if (occupied) return
    setBlocks(prev => [
      ...prev,
      { id: `${pos[0]}-${pos[2]}-${Date.now()}`, position: pos, color: selectedColor },
    ])
  }

  return (
    <div className="dark relative w-screen h-screen bg-[#111]">
      <Canvas
        orthographic
        camera={{ position: [10, 10, 10], zoom: 60, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene blocks={blocks} selectedColor={selectedColor} onPlace={placeBlock} />
      </Canvas>
      <Sidebar colors={COLORS} selectedColor={selectedColor} onSelect={setSelectedColor} />
    </div>
  )
}
