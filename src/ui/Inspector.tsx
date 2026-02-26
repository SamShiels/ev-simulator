import type { RoadType, SceneryType } from '../App';
import type { ActorKind, ActorStats } from '../scenario/types';

// ── Inspected object types ──────────────────────────────────────────────────

export interface InspectedTile {
  kind: 'tile';
  id: string;
  position: [number, number, number];
  roadType: RoadType;
  rotation: number;
}

export interface InspectedActor {
  kind: 'actor';
  id: string;
  label: string;
  actorKind: ActorKind;
  color: string;
  accel: number;
  brake: number;
  topSpeed: number;
}

export interface InspectedEgo {
  kind: 'ego';
  accel: number;
  brake: number;
  topSpeed: number;
}

export interface InspectedScenery {
  kind: 'scenery';
  id: string;
  position: [number, number, number];
  sceneryType: SceneryType;
  rotation: number;
}

export type InspectedObject = InspectedTile | InspectedActor | InspectedEgo | InspectedScenery;

type StatField = keyof ActorStats;

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

function EditableField({ label, value, unit, min, step, onChange }: {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[11px] text-white/40">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min ?? 0}
          step={step ?? 0.1}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= (min ?? 0)) onChange(v);
          }}
          className="w-14 text-[11px] text-white/80 font-mono bg-white/10 border border-white/10 rounded px-1 py-0.5 text-right"
        />
        {unit && <span className="text-[10px] text-white/30">{unit}</span>}
      </div>
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

function StatsSection({ accel, brake, topSpeed, onChange }: {
  accel: number;
  brake: number;
  topSpeed: number;
  onChange: (field: StatField, value: number) => void;
}) {
  return (
    <div className="mt-2 pt-2 border-t border-white/10">
      <EditableField label="Accel"     value={accel}    unit="m/s²" min={0.1} step={0.1} onChange={v => onChange('accel', v)} />
      <EditableField label="Brake"     value={brake}    unit="m/s²" min={0.1} step={0.1} onChange={v => onChange('brake', v)} />
      <EditableField label="Top Speed" value={topSpeed} unit="m/s"  min={0}   step={0.5} onChange={v => onChange('topSpeed', v)} />
    </div>
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

function ActorInspector({ obj, onStatChange }: {
  obj: InspectedActor;
  onStatChange: (field: StatField, value: number) => void;
}) {
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
      <StatsSection accel={obj.accel} brake={obj.brake} topSpeed={obj.topSpeed} onChange={onStatChange} />
    </div>
  );
}

function EgoInspector({ obj, onStatChange }: {
  obj: InspectedEgo;
  onStatChange: (field: StatField, value: number) => void;
}) {
  return (
    <div>
      <KindBadge label="Ego Vehicle" />
      <StatsSection accel={obj.accel} brake={obj.brake} topSpeed={obj.topSpeed} onChange={onStatChange} />
    </div>
  );
}

function SceneryInspector({ obj, onDelete }: { obj: InspectedScenery; onDelete: () => void }) {
  const [x, , z] = obj.position;
  const rotationDeg = obj.rotation * 90;

  return (
    <div>
      <KindBadge label="Scenery" />
      <Field label="Type" value={obj.sceneryType} />
      <Field label="X" value={x} />
      <Field label="Z" value={z} />
      <Field label="Rotation" value={`${rotationDeg}°`} />
      <DeleteButton onDelete={onDelete} />
    </div>
  );
}

// ── Main Inspector ──────────────────────────────────────────────────────────

interface Props {
  object: InspectedObject | null;
  onDelete: () => void;
  onStatChange: (field: StatField, value: number) => void;
}

export default function Inspector({ object, onDelete, onStatChange }: Props) {
  if (!object) {
    return <p className="text-xs text-white/40 italic">Nothing selected</p>;
  }

  if (object.kind === 'tile') {
    return <TileInspector obj={object} onDelete={onDelete} />;
  }

  if (object.kind === 'actor') {
    return <ActorInspector obj={object} onStatChange={onStatChange} />;
  }

  if (object.kind === 'ego') {
    return <EgoInspector obj={object} onStatChange={onStatChange} />;
  }

  if (object.kind === 'scenery') {
    return <SceneryInspector obj={object} onDelete={onDelete} />;
  }

  return null;
}
