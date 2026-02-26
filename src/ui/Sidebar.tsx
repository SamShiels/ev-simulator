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

function SubLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mt-3 mb-1">
      {children}
    </p>
  );
}

export default function Sidebar() {
  const selectedRoadType = useEditorStore(s => s.selectedRoadType);
  const selectedSceneryType = useEditorStore(s => s.selectedSceneryType);
  const blocks = useEditorStore(s => s.blocks);
  const scenario = useEditorStore(s => s.scenario);
  const selection = useEditorStore(s => s.selection);
  const selectRoadType = useEditorStore(s => s.selectRoadType);
  const selectSceneryType = useEditorStore(s => s.selectSceneryType);
  const selectBlock = useEditorStore(s => s.selectBlock);
  const selectActor = useEditorStore(s => s.selectActor);
  const addActor = useEditorStore(s => s.addActor);
  const removeActor = useEditorStore(s => s.removeActor);

  function handleTileClick(type: RoadType) {
    selectRoadType(selectedRoadType === type ? null : type);
  }

  function handleSceneryClick(type: SceneryType) {
    selectSceneryType(selectedSceneryType === type ? null : type);
  }

  return (
    <div className="absolute top-4 right-4 w-52 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 py-1 flex flex-col gap-0">
      <Section title="Place" defaultOpen={true}>

        <SubLabel>Roads</SubLabel>
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

        <SubLabel>Actors</SubLabel>
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

        <SubLabel>Scene</SubLabel>
        <div className="flex flex-col gap-0.5">
          <div
            onClick={() => selectActor('ego')}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all',
              selection?.kind === 'actor' && selection.id === 'ego' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10',
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#22d3ee' }} />
            <span className="flex-1 truncate">Car (ego)</span>
          </div>

          {scenario.actors.map(actor => (
            <div
              key={actor.id}
              onClick={() => selectActor(actor.id)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all group',
                selection?.kind === 'actor' && selection.id === actor.id ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10',
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: actor.color }} />
              <span className="flex-1 truncate">{actor.label}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeActor(actor.id); }}
                className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-all"
                title="Remove actor"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}

          {blocks.map(block => {
            const isOrigin = block.position[0] === 0 && block.position[2] === 0;
            const isSelected = selection?.kind === 'tile' && selection.id === block.id;
            const label = block.roadType.charAt(0).toUpperCase() + block.roadType.slice(1);
            const pos = `(${block.position[0]}, ${block.position[2]})`;
            return (
              <div
                key={block.id}
                onClick={() => { selectBlock(block.id); selectRoadType(null); }}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all',
                  isSelected ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10',
                )}
              >
                <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-white/20" />
                <span className="flex-1 truncate">{label}</span>
                <span className="font-mono text-[10px] text-white/30">{pos}</span>
                {isOrigin && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white/20 shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <SubLabel>Scenery</SubLabel>
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
