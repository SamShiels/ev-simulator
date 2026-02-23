import { useEditorStore } from '../store/useEditorStore';

export default function HintBar() {
  const selectedRoadType = useEditorStore(s => s.selectedRoadType);
  const drawingPath = useEditorStore(s => s.drawingPath);

  let hint: string;
  if (selectedRoadType) {
    hint = 'Click to place · R to rotate · Right-click to cancel';
  } else if (drawingPath) {
    hint = 'Click to add waypoint · Drag to move · Backspace to delete';
  } else {
    hint = 'Alt+drag to pan · Scroll to zoom';
  }

  return (
    <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 pointer-events-none z-20">
      <span className="text-xs text-white/40 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 whitespace-nowrap">
        {hint}
      </span>
    </div>
  );
}
