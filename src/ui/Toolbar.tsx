import { useEditorStore } from '../store/useEditorStore';

export default function Toolbar() {
  const gizmoMode = useEditorStore(s => s.gizmoMode);
  const playing = useEditorStore(s => s.playing);
  const renderPass = useEditorStore(s => s.renderPass);
  const drawingPath = useEditorStore(s => s.drawingPath);
  const setGizmoMode = useEditorStore(s => s.setGizmoMode);
  const togglePlaying = useEditorStore(s => s.togglePlaying);
  const startRender = useEditorStore(s => s.startRender);
  const toggleDrawingPath = useEditorStore(s => s.toggleDrawingPath);

  const rendering = renderPass !== 'idle';

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 p-1 z-10">
      <button
        title="Move"
        onClick={() => setGizmoMode('translate')}
        className={`p-2 rounded-lg transition-all ${gizmoMode === 'translate' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M12 3v18M3 12h18" />
        </svg>
      </button>
      <button
        title="Rotate"
        onClick={() => setGizmoMode('rotate')}
        className={`p-2 rounded-lg transition-all ${gizmoMode === 'rotate' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6" />
          <path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
        </svg>
      </button>

      <div className="w-px bg-white/20 mx-0.5" />

      <button
        title={drawingPath ? 'Stop drawing path' : 'Draw path'}
        onClick={toggleDrawingPath}
        disabled={rendering || playing}
        className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none ${drawingPath ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="6" r="2.5" fill="currentColor" stroke="none" />
          <polyline points="5,12 12,6 19,12" strokeDasharray="2 2" />
        </svg>
      </button>

      <div className="w-px bg-white/20 mx-0.5" />

      <button
        title={playing ? 'Stop' : 'Play'}
        onClick={togglePlaying}
        disabled={rendering}
        className="p-2 rounded-lg transition-all text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="5" y="5" width="14" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      <button
        title="Render"
        onClick={startRender}
        disabled={rendering || playing}
        className="p-2 rounded-lg transition-all text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      </button>
    </div>
  );
}
