import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { cn } from '@/lib/utils';
import type { RoadType, SceneryType } from '../App';
import type { ActorKind } from '../scenario/types';
import { RoadTileModel } from '../visuals/RoadTile';
import { SceneryModel } from '../visuals/SceneryMesh';
import { PedestrianMesh, StrollerMesh, VehicleMesh } from '../visuals/ActorMesh';
import { useEditorStore, selectionTileId, selectionSceneryId } from '../store/useEditorStore';

const ROAD_TYPES: { type: RoadType; label: string }[] = [
  { type: 'straight', label: 'Straight' },
  { type: 'corner',   label: 'Corner' },
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
    <Canvas camera={{ position: [0, 4, 0], fov: 40, up: [0, 0, -1] }} gl={{ antialias: true, alpha: true }}>
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
    <Canvas camera={{ position: [4, 6, 4], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={2} />
      <directionalLight position={[3, 6, 3]} intensity={1} />
      <Suspense fallback={null}>
        <SceneryModel sceneryType={sceneryType} rotation={0} ghost={false} />
      </Suspense>
    </Canvas>
  );
}

function ActorPreview({ kind, cameraPos }: { kind: ActorKind; cameraPos: [number, number, number] }) {
  return (
    <Canvas camera={{ position: cameraPos, fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={2} />
      <directionalLight position={[3, 6, 3]} intensity={1} />
      {kind === 'pedestrian' && <PedestrianMesh color="#9ca3af" />}
      {kind === 'stroller'   && <StrollerMesh   color="#9ca3af" />}
      {kind === 'vehicle'    && <VehicleMesh     color="#9ca3af" />}
    </Canvas>
  );
}

function PlacementDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedRoadType = useEditorStore(s => s.selectedRoadType);
  const selectedSceneryType = useEditorStore(s => s.selectedSceneryType);
  const selectRoadType = useEditorStore(s => s.selectRoadType);
  const selectSceneryType = useEditorStore(s => s.selectSceneryType);
  const selectedActorKind = useEditorStore(s => s.selectedActorKind);
  const selectActorKind = useEditorStore(s => s.selectActorKind);
  const setDrawingPath = useEditorStore(s => s.setDrawingPath);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function handleRoadClick(type: RoadType) {
    selectRoadType(selectedRoadType === type ? null : type);
    setDrawingPath(false);
    setOpen(false);
  }

  function handleSceneryClick(type: SceneryType) {
    selectSceneryType(selectedSceneryType === type ? null : type);
    setDrawingPath(false);
    setOpen(false);
  }

  function handleActorClick(kind: ActorKind) {
    selectActorKind(selectedActorKind === kind ? null : kind);
    setDrawingPath(false);
    setOpen(false);
  }

  const activeLabel =
    ROAD_TYPES.find(r => r.type === selectedRoadType)?.label ??
    SCENERY_TYPES.find(s => s.type === selectedSceneryType)?.label ??
    ACTOR_KINDS.find(a => a.kind === selectedActorKind)?.label ??
    null;

  return (
    <div ref={ref} className="relative px-3 py-2">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
          open || activeLabel
            ? 'bg-white/20 text-white'
            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white',
        )}
      >
        <span>{activeLabel ? `Placing: ${activeLabel}` : '+ Add object'}</span>
        <svg
          className={cn('w-3 h-3 transition-transform duration-150', open && 'rotate-180')}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-3 right-3 mt-1 rounded-xl backdrop-blur-xl bg-[#1a1a1a]/90 border border-white/15 shadow-2xl z-50 py-1 overflow-hidden">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/40 px-3 pt-2 pb-1">Roads</p>
          {ROAD_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleRoadClick(type)}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-all',
                selectedRoadType === type
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <div className="w-7 h-7 rounded shrink-0 overflow-hidden"><TilePreview roadType={type} /></div>
              {label}
            </button>
          ))}

          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/40 px-3 pt-3 pb-1">Scenery</p>
          {SCENERY_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleSceneryClick(type)}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-all',
                selectedSceneryType === type
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <div className="w-7 h-7 rounded shrink-0 overflow-hidden"><SceneryPreview sceneryType={type} /></div>
              {label}
            </button>
          ))}

          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/40 px-3 pt-3 pb-1">Actors</p>
          {ACTOR_KINDS.map(({ kind, label, cameraPos }) => (
            <button
              key={kind}
              onClick={() => handleActorClick(kind)}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-all',
                selectedActorKind === kind
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <div className="w-7 h-7 rounded shrink-0 overflow-hidden"><ActorPreview kind={kind} cameraPos={cameraPos} /></div>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const selection = useEditorStore(s => s.selection);
  const scenario = useEditorStore(s => s.scenario);
  const blocks = useEditorStore(s => s.blocks);
  const sceneryItems = useEditorStore(s => s.sceneryItems);
  const selectActor = useEditorStore(s => s.selectActor);
  const selectBlock = useEditorStore(s => s.selectBlock);
  const selectSceneryItem = useEditorStore(s => s.selectSceneryItem);
  const removeActor = useEditorStore(s => s.removeActor);
  const selectRoadType = useEditorStore(s => s.selectRoadType);
  const setDrawingPath = useEditorStore(s => s.setDrawingPath);

  const tileId = selectionTileId(selection);
  const sceneryId = selectionSceneryId(selection);

  return (
    <div className="absolute top-4 right-4 w-52 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 flex flex-col">
      <PlacementDropdown />

      <div className="border-t border-white/10" />

      <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 px-3 pt-3 pb-2">Scene</p>

      <div className="flex flex-col gap-0.5 px-3 pb-3 overflow-y-auto max-h-[60vh]">
        {/* Ego */}
        <div
          onClick={() => selectActor('ego')}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all',
            selection?.kind === 'actor' && selection.id === 'ego'
              ? 'bg-white/20 text-white'
              : 'text-white/50 hover:text-white hover:bg-white/10',
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#22d3ee' }} />
          <span className="flex-1 truncate">Car (ego)</span>
        </div>

        {/* Other actors */}
        {scenario.actors.map(actor => (
          <div
            key={actor.id}
            onClick={() => selectActor(actor.id)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all group',
              selection?.kind === 'actor' && selection.id === actor.id
                ? 'bg-white/20 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/10',
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

        {/* Road blocks */}
        {blocks.map(block => {
          const isOrigin = block.position[0] === 0 && block.position[2] === 0;
          const isSelected = tileId === block.id;
          const label = block.roadType.charAt(0).toUpperCase() + block.roadType.slice(1);
          const pos = `(${block.position[0]}, ${block.position[2]})`;
          return (
            <div
              key={block.id}
              onClick={() => { selectBlock(block.id); selectRoadType(null); setDrawingPath(false); }}
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

        {/* Scenery items */}
        {sceneryItems.map(item => {
          const isSelected = sceneryId === item.id;
          const label = item.sceneryType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const pos = `(${item.position[0]}, ${item.position[2]})`;
          return (
            <div
              key={item.id}
              onClick={() => selectSceneryItem(item.id)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all',
                isSelected ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10',
              )}
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20" />
              <span className="flex-1 truncate">{label}</span>
              <span className="font-mono text-[10px] text-white/30">{pos}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
