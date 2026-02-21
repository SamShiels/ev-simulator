import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import Sidebar from './Sidebar';
import type { InspectedObject } from './Inspector';

export type RoadType = 'straight' | 'corner';
export type GizmoMode = 'translate' | 'rotate';

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
  const [selectedRoadType, setSelectedRoadType] = useState<RoadType | null>(null);
  const [ghostRotation, setGhostRotation] = useState(1);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');

  function placeBlock(pos: [number, number, number]) {
    if (!selectedRoadType) return;
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

  function handleRotateBlock(id: string, delta: 1 | -1) {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, rotation: ((b.rotation + delta) % 4 + 4) % 4 } : b,
    ));
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
          gizmoMode={gizmoMode}
          onPlace={placeBlock}
          onRotate={rotate}
          onSelectBlock={handleSelectBlock}
          onDeselect={handleDeselect}
          onCancelPlacement={() => setSelectedRoadType(null)}
          onMoveBlock={handleMoveBlock}
          onRotateBlock={handleRotateBlock}
        />
      </Canvas>

      {/* Gizmo mode tab bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 p-1 z-10">
        <button
          title="Move"
          onClick={() => setGizmoMode('translate')}
          className={`p-2 rounded-lg transition-all ${gizmoMode === 'translate' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          {/* Four-way move arrows */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M12 3v18M3 12h18" />
          </svg>
        </button>
        <button
          title="Rotate"
          onClick={() => setGizmoMode('rotate')}
          className={`p-2 rounded-lg transition-all ${gizmoMode === 'rotate' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          {/* Circular rotation arrow */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6" />
            <path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
          </svg>
        </button>
      </div>

      <Sidebar
        selectedRoadType={selectedRoadType}
        onSelect={setSelectedRoadType}
        inspectedObject={inspectedObject}
        onDelete={handleDelete}
      />
    </div>
  );
}
