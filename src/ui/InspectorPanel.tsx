import Inspector, { type InspectedObject } from './Inspector';

interface Props {
  inspectedObject: InspectedObject | null;
  onDelete: () => void;
}

export default function InspectorPanel({ inspectedObject, onDelete }: Props) {
  if (!inspectedObject) return null;

  return (
    <div className="absolute top-4 left-4 w-48 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 p-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2">Inspector</p>
      <Inspector object={inspectedObject} onDelete={onDelete} />
    </div>
  );
}
