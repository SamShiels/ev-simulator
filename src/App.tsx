import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import Sidebar from './Sidebar';
import type { InspectedObject } from './Inspector';

export type RoadType = 'straight' | 'corner';

export interface Block {
  id: string;
  position: [number, number, number];
  roadType: RoadType;
  rotation: number; // 0–3, each step = 90°
}

export type SelectedObject =
  | { kind: 'tile'; id: string }
  // | { kind: 'actor'; id: string }
  // | { kind: 'static'; id: string }
  | null;

export default function App() {
  const [selectedRoadType, setSelectedRoadType] = useState<RoadType>('straight');
  const [ghostRotation, setGhostRotation] = useState(1);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null);

  function placeBlock(pos: [number, number, number]) {
    const occupied = blocks.some(b => b.position[0] === pos[0] && b.position[2] === pos[2]);
    if (occupied) return;
    setBlocks(prev => [
      ...prev,
      {
        id: `${pos[0]}-${pos[2]}-${Date.now()}`,
        position: pos,
        roadType: selectedRoadType,
        rotation: ghostRotation,
      },
    ]);
  }

  function rotate() {
    setGhostRotation(r => (r + 1) % 4);
  }

  function handleSelectBlock(id: string) {
    setSelectedObject({ kind: 'tile', id });
  }

  function handleDeselect() {
    setSelectedObject(null);
  }

  function handleMoveBlock(id: string, newPos: [number, number, number]) {
    const occupied = blocks.some(b => b.id !== id && b.position[0] === newPos[0] && b.position[2] === newPos[2]);
    if (occupied) return;
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, position: newPos } : b));
  }

  function handleDelete() {
    if (!selectedObject) return;
    if (selectedObject.kind === 'tile') {
      const block = blocks.find(b => b.id === selectedObject.id);
      if (block && block.position[0] === 0 && block.position[2] === 0) return;
      setBlocks(prev => prev.filter(b => b.id !== selectedObject.id));
    }
    setSelectedObject(null);
  }

  // Resolve the selected object into its full data for the inspector.
  const inspectedObject: InspectedObject | null = useMemo(() => {
    if (!selectedObject) return null;
    if (selectedObject.kind === 'tile') {
      const block = blocks.find(b => b.id === selectedObject.id);
      if (!block) return null;
      return {
        kind: 'tile',
        id: block.id,
        position: block.position,
        roadType: block.roadType,
        rotation: block.rotation,
      };
    }
    return null;
  }, [selectedObject, blocks]);

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
          selectedId={selectedObject?.kind === 'tile' ? selectedObject.id : null}
          onPlace={placeBlock}
          onRotate={rotate}
          onSelectBlock={handleSelectBlock}
          onDeselect={handleDeselect}
          onMoveBlock={handleMoveBlock}
        />
      </Canvas>
      <Sidebar
        selectedRoadType={selectedRoadType}
        onSelect={setSelectedRoadType}
        inspectedObject={inspectedObject}
        onDelete={handleDelete}
      />
    </div>
  );
}
