import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import type { RoadType } from './App';
import { RoadTileModel } from './visuals/RoadTile';
import Inspector, { type InspectedObject } from './Inspector';

interface Props {
  selectedRoadType: RoadType | null;
  onSelect: (type: RoadType | null) => void;
  inspectedObject: InspectedObject | null;
  onDelete: () => void;
}

const ROAD_TYPES: { type: RoadType; label: string }[] = [
  { type: 'straight', label: 'Straight' },
  { type: 'corner', label: 'Corner' },
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

export default function Sidebar({ selectedRoadType, onSelect, inspectedObject, onDelete }: Props) {
  function handleTileClick(type: RoadType) {
    onSelect(selectedRoadType === type ? null : type);
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
