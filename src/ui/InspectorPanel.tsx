import { cn } from '@/lib/utils';
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
  const selectActor = useEditorStore(s => s.selectActor);
  const selectBlock = useEditorStore(s => s.selectBlock);
  const selectSceneryItem = useEditorStore(s => s.selectSceneryItem);
  const selectRoadType = useEditorStore(s => s.selectRoadType);
  const removeActor = useEditorStore(s => s.removeActor);

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

  return (
    <div className="absolute top-4 left-4 w-48 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 flex flex-col">
      {inspectedObject && (
        <>
          <div className="border-t border-white/10" />
          <div className="p-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2">Inspector</p>
            <Inspector object={inspectedObject} onDelete={onDelete} onStatChange={onStatChange} />
          </div>
        </>
      )}
      <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 px-3 pt-3 pb-2">Scene</p>

      <div className="flex flex-col gap-0.5 px-3 pb-3 overflow-y-auto max-h-64">
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

        {sceneryItems.map(item => {
          const isSelected = selection?.kind === 'scenery' && selection.id === item.id;
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
