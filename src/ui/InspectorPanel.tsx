import { useEditorStore, selectionActorId, selectionTileId, selectionSceneryId } from '../store/useEditorStore';
import Inspector, { type InspectedObject } from './Inspector';
import type { ActorStats } from '../scenario/types';

type StatField = keyof ActorStats;

export default function InspectorPanel() {
  const selection = useEditorStore(s => s.selection);
  const blocks = useEditorStore(s => s.blocks);
  const sceneryItems = useEditorStore(s => s.sceneryItems);
  const scenario = useEditorStore(s => s.scenario);
  const deleteSelectedBlock = useEditorStore(s => s.deleteSelectedBlock);
  const deleteSelectedScenery = useEditorStore(s => s.deleteSelectedScenery);
  const setActorStats = useEditorStore(s => s.setActorStats);
  const setEgoStats = useEditorStore(s => s.setEgoStats);

  let inspectedObject: InspectedObject | null = null;
  let onStatChange: (field: StatField, value: number) => void = () => {};
  let onDelete: () => void = () => {};

  const tileId = selectionTileId(selection);
  const sceneryId = selectionSceneryId(selection);

  if (tileId) {
    const block = blocks.find(b => b.id === tileId);
    if (block) {
      inspectedObject = {
        kind: 'tile',
        id: block.id,
        position: block.position,
        roadType: block.roadType,
        rotation: block.rotation,
      };
      onDelete = deleteSelectedBlock;
    }
  } else if (sceneryId) {
    const item = sceneryItems.find(s => s.id === sceneryId);
    if (item) {
      inspectedObject = {
        kind: 'scenery',
        id: item.id,
        position: item.position,
        sceneryType: item.sceneryType,
        rotation: item.rotation,
      };
      onDelete = deleteSelectedScenery;
    }
  } else if (selection?.kind === 'actor' && selection.id === 'ego') {
    inspectedObject = {
      kind: 'ego',
      accel: scenario.egoStats.accel,
      brake: scenario.egoStats.brake,
      topSpeed: scenario.egoStats.topSpeed,
    };
    onStatChange = (field, value) => setEgoStats({ [field]: value });
  } else if (selection?.kind === 'actor') {
    const actor = scenario.actors.find(a => a.id === selectionActorId(selection));
    if (actor) {
      inspectedObject = {
        kind: 'actor',
        id: actor.id,
        label: actor.label,
        actorKind: actor.kind,
        color: actor.color,
        accel: actor.accel,
        brake: actor.brake,
        topSpeed: actor.topSpeed,
      };
      onStatChange = (field, value) => setActorStats(actor.id, { [field]: value });
    }
  }

  if (!inspectedObject) return null;

  return (
    <div className="absolute top-4 left-4 w-48 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 p-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2">Inspector</p>
      <Inspector object={inspectedObject} onDelete={onDelete} onStatChange={onStatChange} />
    </div>
  );
}
