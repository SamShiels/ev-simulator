import type { GizmoMode } from '../App';

export type AppMode = 'road' | 'scenario';

interface Props {
  appMode: AppMode;
  gizmoMode: GizmoMode;
  playing: boolean;
  rendering: boolean;
  onAppModeChange: (mode: AppMode) => void;
  onGizmoModeChange: (mode: GizmoMode) => void;
  onPlayToggle: () => void;
  onRenderStart: () => void;
}

export default function Toolbar({
  appMode,
  gizmoMode,
  playing,
  rendering,
  onAppModeChange,
  onGizmoModeChange,
  onPlayToggle,
  onRenderStart,
}: Props) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 p-1 z-10">
      {/* Mode tabs */}
      <button
        title="Road Editor"
        onClick={() => onAppModeChange('road')}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${appMode === 'road' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
      >
        Road
      </button>
      <button
        title="Scenario Editor"
        onClick={() => onAppModeChange('scenario')}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${appMode === 'scenario' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
      >
        Scenario
      </button>

      <div className="w-px bg-white/20 mx-0.5" />

      {appMode === 'road' && (
        <>
          <button
            title="Move"
            onClick={() => onGizmoModeChange('translate')}
            className={`p-2 rounded-lg transition-all ${gizmoMode === 'translate' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M12 3v18M3 12h18" />
            </svg>
          </button>
          <button
            title="Rotate"
            onClick={() => onGizmoModeChange('rotate')}
            className={`p-2 rounded-lg transition-all ${gizmoMode === 'rotate' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6" />
              <path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
            </svg>
          </button>

          <div className="w-px bg-white/20 mx-0.5" />
        </>
      )}

      <button
        title={playing ? 'Stop' : 'Play'}
        onClick={onPlayToggle}
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

      {appMode === 'road' && (
        <button
          title="Render"
          onClick={onRenderStart}
          disabled={rendering || playing}
          className="p-2 rounded-lg transition-all text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
        </button>
      )}
    </div>
  );
}
