import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import type { RoadType } from '../App';
import type { AppMode } from './Toolbar';
import type { Scenario, ActorKind } from '../scenario/types';
import { RoadTileModel } from '../visuals/RoadTile';
import Inspector, { type InspectedObject } from './Inspector';

interface Props {
  appMode: AppMode;
  selectedRoadType: RoadType | null;
  onSelect: (type: RoadType | null) => void;
  inspectedObject: InspectedObject | null;
  onDelete: () => void;
  scenario: Scenario;
  selectedActorId: string;
  selectedWaypointId: string | null;
  onSelectActor: (id: string) => void;
  onAddActor: (kind: ActorKind) => void;
  onRemoveActor: (id: string) => void;
}

const ROAD_TYPES: { type: RoadType; label: string }[] = [
  { type: 'straight', label: 'Straight' },
  { type: 'corner', label: 'Corner' },
];

const ACTOR_KINDS: { kind: ActorKind; label: string }[] = [
  { kind: 'pedestrian', label: 'Pedestrian' },
  { kind: 'stroller', label: 'Stroller' },
  { kind: 'vehicle', label: 'Vehicle' },
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

function Divider() {
  return <div className="border-t border-white/10 mx-3" />;
}

export default function Sidebar({
  appMode,
  selectedRoadType,
  onSelect,
  inspectedObject,
  onDelete,
  scenario,
  selectedActorId,
  onSelectActor,
  onAddActor,
  onRemoveActor,
}: Props) {
  function handleTileClick(type: RoadType) {
    onSelect(selectedRoadType === type ? null : type);
  }

  if (appMode === 'scenario') {
    return (
      <div className="absolute top-4 right-4 w-52 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 py-1 flex flex-col gap-0">
        <Section title="Actors" defaultOpen={true}>
          {/* Ego car row */}
          <div
            onClick={() => onSelectActor('ego')}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all',
              selectedActorId === 'ego' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10',
            )}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: '#22d3ee' }}
            />
            <span className="flex-1 truncate">Car (ego)</span>
          </div>

          {/* Actor rows */}
          {scenario.actors.map(actor => (
            <div
              key={actor.id}
              onClick={() => onSelectActor(actor.id)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all group',
                selectedActorId === actor.id ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10',
              )}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: actor.color }}
              />
              <span className="flex-1 truncate">{actor.label}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveActor(actor.id); }}
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

          {/* Add actor buttons */}
          <div className="mt-2 flex flex-wrap gap-1">
            {ACTOR_KINDS.map(({ kind, label }) => (
              <button
                key={kind}
                onClick={() => onAddActor(kind)}
                className="text-xs px-2 py-1 rounded-md bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-all"
              >
                + {label}
              </button>
            ))}
          </div>
        </Section>

        <Divider />

        <Section title="How to use" defaultOpen={false}>
          <p className="text-xs text-white/40 leading-relaxed">
            Click ground to add a waypoint at the current time.<br />
            Drag waypoints to reposition.<br />
            Drag diamonds on the timeline to change timing.<br />
            Select a waypoint and press Delete to remove it.
          </p>
        </Section>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 w-52 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 py-1 flex flex-col gap-0">

      <Section title="Inspector" defaultOpen={true}>
        <Inspector object={inspectedObject} onDelete={onDelete} />
      </Section>

      <Divider />

      <Section title="Place" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2 mt-1">
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
        <p className="mt-3 text-xs text-white/40 text-center leading-tight">
          R to rotate · right-click to cancel
        </p>
      </Section>

    </div>
  );
}
