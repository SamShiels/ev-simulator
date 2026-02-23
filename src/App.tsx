import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import Toolbar from './ui/Toolbar';
import Sidebar from './ui/Sidebar';
import Timeline from './ui/Timeline';
import HintBar from './ui/HintBar';
import InspectorPanel from './ui/InspectorPanel';
import { useEditorKeyBindings } from './hooks/useEditorKeyBindings';
import { useEditorStore } from './store/useEditorStore';

export type RoadType = 'straight' | 'corner';
export type GizmoMode = 'translate' | 'rotate';
export type RenderPass = 'idle' | 'rgb' | 'depth';

export interface Block {
  id: string;
  position: [number, number, number];
  roadType: RoadType;
  rotation: number; // 0–3, each step = 90°
}

export type SelectedObject =
  | { kind: 'tile'; id: string }
  | null;

export default function App() {
  useEditorKeyBindings();
  const seedEgoTrack = useEditorStore(s => s.seedEgoTrack);

  return (
    <div className="dark relative w-screen h-screen bg-[#111]">
      <Canvas
        orthographic
        camera={{ position: [10, 10, 10], zoom: 60, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
        onCreated={() => seedEgoTrack()}
      >
        <Scene />
      </Canvas>

      <Toolbar />
      <InspectorPanel />
      <Sidebar />
      <HintBar />
      <Timeline />
    </div>
  );
}
