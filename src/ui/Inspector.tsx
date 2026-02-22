import type { RoadType } from '../App';
import type { ActorKind } from '../scenario/types';

// ── Inspected object types ──────────────────────────────────────────────────
// Each variant carries all the data the inspector needs to display.
// Add new variants here as new object kinds are introduced.

export interface InspectedTile {
  kind: 'tile';
  id: string;
  position: [number, number, number]; // grid-snapped, y=0
  roadType: RoadType;
  rotation: number; // 0–3, each step = 90°
}

export interface InspectedActor {
  kind: 'actor';
  id: string;
  label: string;
  actorKind: ActorKind;
  color: string;
}

export type InspectedObject = InspectedTile | InspectedActor;

// ── Sub-components ──────────────────────────────────────────────────────────

function KindBadge({ label }: { label: string }) {
  return (
    <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-widest uppercase bg-white/10 text-white/60">
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-[11px] text-white/80 font-mono">{value}</span>
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/35 hover:text-red-300 transition-colors"
    >
      Delete
    </button>
  );
}

// ── Per-kind panels ─────────────────────────────────────────────────────────

function TileInspector({ obj, onDelete }: { obj: InspectedTile; onDelete: () => void }) {
  const [x, , z] = obj.position;
  const rotationDeg = obj.rotation * 90;
  const isOrigin = x === 0 && z === 0;

  return (
    <div>
      <KindBadge label="Road Tile" />
      <Field label="Type" value={obj.roadType} />
      <Field label="X" value={x} />
      <Field label="Z" value={z} />
      <Field label="Rotation" value={`${rotationDeg}°`} />
      {isOrigin
        ? <p className="mt-3 text-[11px] text-white/30 italic text-center">Origin tile cannot be deleted</p>
        : <DeleteButton onDelete={onDelete} />
      }
    </div>
  );
}

function ActorInspector({ obj }: { obj: InspectedActor }) {
  const kindLabels: Record<ActorKind, string> = {
    pedestrian: 'Pedestrian',
    stroller: 'Stroller',
    vehicle: 'Vehicle',
  };

  return (
    <div>
      <KindBadge label="Actor" />
      <Field label="Name" value={obj.label} />
      <Field label="Kind" value={kindLabels[obj.actorKind]} />
      <div className="flex justify-between items-center py-0.5">
        <span className="text-[11px] text-white/40">Color</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: obj.color }} />
          <span className="text-[11px] text-white/80 font-mono">{obj.color}</span>
        </span>
      </div>
    </div>
  );
}

// ── Main Inspector ──────────────────────────────────────────────────────────

interface Props {
  object: InspectedObject | null;
  onDelete: () => void;
}

export default function Inspector({ object, onDelete }: Props) {
  if (!object) {
    return <p className="text-xs text-white/40 italic">Nothing selected</p>;
  }

  if (object.kind === 'tile') {
    return <TileInspector obj={object} onDelete={onDelete} />;
  }

  if (object.kind === 'actor') {
    return <ActorInspector obj={object} />;
  }

  return null;
}
