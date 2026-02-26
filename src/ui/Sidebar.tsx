import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import type { RoadType, SceneryType } from '../App';
import type { ActorKind } from '../scenario/types';
import { RoadTileModel } from '../visuals/RoadTile';
import { SceneryModel } from '../visuals/SceneryMesh';
import { PedestrianMesh, StrollerMesh, VehicleMesh } from '../visuals/ActorMesh';
import { useEditorStore } from '../store/useEditorStore';

const ROAD_TYPES: { type: RoadType; label: string }[] = [
  { type: 'straight', label: 'Straight' },
  { type: 'corner', label: 'Corner' },
  { type: 'pavement', label: 'Pavement' },
];

const SCENERY_TYPES: { type: SceneryType; label: string }[] = [
  { type: 'building-a', label: 'Building A' },
  { type: 'building-b', label: 'Building B' },
  { type: 'building-c', label: 'Building C' },
];

const ACTOR_KINDS: { kind: ActorKind; label: string; cameraPos: [number, number, number] }[] = [
  { kind: 'pedestrian', label: 'Pedestrian', cameraPos: [1.5, 2.5, 2] },
  { kind: 'stroller',   label: 'Stroller',   cameraPos: [1.5, 2, 2] },
  { kind: 'vehicle',    label: 'Vehicle',     cameraPos: [4, 4, 5] },
];

function TilePreview({ roadType }: { roadType: RoadType }) {
  return (
    <Canvas
      camera={{ position: [0, 4, 0], fov: 40, up: [0, 0, -1] }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={2} />
      <directionalLight position={[3, 6, 3]} intensity={1} />
      <Suspense fallback={null}>
        <RoadTileModel roadType={roadType} rotation={0} ghost={false} />
      </Suspense>
    </Canvas>
  );
}

function SceneryPreview({ sceneryType }: { sceneryType: SceneryType }) {
  return (
    <Canvas
      camera={{ position: [4, 6, 4], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={2} />
      <directionalLight position={[3, 6, 3]} intensity={1} />
      <Suspense fallback={null}>
        <SceneryModel sceneryType={sceneryType} rotation={0} ghost={false} />
      </Suspense>
    </Canvas>
  );
}

function ActorKindPreview({ kind, cameraPos }: { kind: ActorKind; cameraPos: [number, number, number] }) {
  const PREVIEW_COLOR = '#9ca3af';
  return (
    <Canvas
      camera={{ position: cameraPos, fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={2} />
      <directionalLight position={[3, 6, 3]} intensity={1} />
      {kind === 'pedestrian' && <PedestrianMesh color={PREVIEW_COLOR} />}
      {kind === 'stroller' && <StrollerMesh color={PREVIEW_COLOR} />}
      {kind === 'vehicle' && <VehicleMesh color={PREVIEW_COLOR} />}
    </Canvas>
  );
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold tracking-widest uppercase text-white/50 hover:text-white transition-colors"
      >
        {title}
        <svg
          className={cn('w-3 h-3 transition-transform duration-150', open && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}


export default function Sidebar() {
  const selectedRoadType = useEditorStore(s => s.selectedRoadType);
  const selectedSceneryType = useEditorStore(s => s.selectedSceneryType);
  const selectRoadType = useEditorStore(s => s.selectRoadType);
  const selectSceneryType = useEditorStore(s => s.selectSceneryType);
  const addActor = useEditorStore(s => s.addActor);

  function handleTileClick(type: RoadType) {
    selectRoadType(selectedRoadType === type ? null : type);
  }

  function handleSceneryClick(type: SceneryType) {
    selectSceneryType(selectedSceneryType === type ? null : type);
  }

  return (
    <div className="absolute top-4 right-4 w-52 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 py-1 flex flex-col gap-0">

      <Section title="Actors" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-1.5">
          {ACTOR_KINDS.map(({ kind, label, cameraPos }) => (
            <button
              key={kind}
              onClick={() => addActor(kind)}
              className="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white"
            >
              <div className="w-full aspect-square rounded-md overflow-hidden">
                <ActorKindPreview kind={kind} cameraPos={cameraPos} />
              </div>
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Roads" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2">
          {ROAD_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleTileClick(type)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all text-sm font-medium',
                selectedRoadType === type
                  ? 'bg-white/20 ring-1 ring-white/40 text-white'
                  : 'text-white/50 hover:bg-white/10 hover:text-white',
              )}
            >
              <div className="w-full aspect-square rounded-md overflow-hidden">
                <TilePreview roadType={type} />
              </div>
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Scenery" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2">
          {SCENERY_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleSceneryClick(type)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all text-sm font-medium',
                selectedSceneryType === type
                  ? 'bg-white/20 ring-1 ring-white/40 text-white'
                  : 'text-white/50 hover:bg-white/10 hover:text-white',
              )}
            >
              <div className="w-full aspect-square rounded-md overflow-hidden">
                <SceneryPreview sceneryType={type} />
              </div>
              {label}
            </button>
          ))}
        </div>
      </Section>

    </div>
  );
}
