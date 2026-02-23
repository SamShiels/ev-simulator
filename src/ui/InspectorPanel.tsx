import { useEditorStore } from '../store/useEditorStore';
import Inspector, { type InspectedObject } from './Inspector';

export default function InspectorPanel() {
  const selectedObject = useEditorStore(s => s.selectedObject);
  const blocks = useEditorStore(s => s.blocks);
  const selectedActorId = useEditorStore(s => s.selectedActorId);
  const scenario = useEditorStore(s => s.scenario);
  const deleteSelectedBlock = useEditorStore(s => s.deleteSelectedBlock);

  let inspectedObject: InspectedObject | null = null;

  if (selectedObject?.kind === 'tile') {
    const block = blocks.find(b => b.id === selectedObject.id);
    if (block) {
      inspectedObject = {
        kind: 'tile',
        id: block.id,
        position: block.position,
        roadType: block.roadType,
        rotation: block.rotation,
      };
    }
  } else if (selectedActorId && selectedActorId !== 'ego') {
    const actor = scenario.actors.find(a => a.id === selectedActorId);
    if (actor) {
      inspectedObject = {
        kind: 'actor',
        id: actor.id,
        label: actor.label,
        actorKind: actor.kind,
        color: actor.color,
      };
    }
  }

  if (!inspectedObject) return null;

  return (
    <div className="absolute top-4 left-4 w-48 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 p-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2">Inspector</p>
      <Inspector object={inspectedObject} onDelete={deleteSelectedBlock} />
    </div>
  );
}
