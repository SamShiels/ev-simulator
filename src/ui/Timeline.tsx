import { useRef } from 'react';
import { useEditorStore, selectionActorId } from '../store/useEditorStore';
import { get_waypoint_distances } from '../scenario/interpolate';
import type { WaypointTrack, Waypoint } from '../scenario/types';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function computeWaypointPct(dist: number, trackLength: number): number {
  return clamp(dist / trackLength, 0, 1) * 100;
}

interface WaypointDotProps {
  wp: Waypoint;
  pct: number;
  color: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function WaypointDot({ wp, pct, color, isSelected, onSelect }: WaypointDotProps) {
  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    onSelect(wp.id);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 cursor-pointer"
      style={{
        left: `${pct}%`,
        backgroundColor: isSelected ? '#ffffff' : color,
        border: isSelected ? '2px solid #ffffff' : `2px solid ${color}`,
      }}
    />
  );
}

interface LaneProps {
  actorId: string;
  label: string;
  color: string;
  track: WaypointTrack;
  trackLength: number;
  selectedActorId: string;
  selectedWaypointId: string | null;
  onSelectActor: () => void;
  onSelectWaypoint: (waypointId: string) => void;
}

function Lane({
  actorId,
  label,
  color,
  track,
  trackLength,
  selectedActorId,
  selectedWaypointId,
  onSelectActor,
  onSelectWaypoint,
}: LaneProps) {
  const isSelected = selectedActorId === actorId;
  const wpDistances = trackLength > 0 ? get_waypoint_distances(track) : [];

  return (
    <div
      className={`flex items-center h-8 border-b border-white/5 ${isSelected ? 'bg-white/5' : ''}`}
      onClick={onSelectActor}
    >
      <div className="w-28 shrink-0 px-3 text-xs truncate" style={{ color: isSelected ? '#fff' : '#ffffff80' }}>
        {label}
      </div>

      <div className="flex-1 relative h-full">
        {track.waypoints.map((wp, i) => (
          <WaypointDot
            key={wp.id}
            wp={wp}
            pct={computeWaypointPct(wpDistances[i] ?? 0, trackLength)}
            color={color}
            isSelected={selectedWaypointId === wp.id}
            onSelect={onSelectWaypoint}
          />
        ))}
      </div>
    </div>
  );
}

export default function Timeline() {
  const scenario = useEditorStore(s => s.scenario);
  const scenarioTime = useEditorStore(s => s.scenarioTime);
  const selection = useEditorStore(s => s.selection);
  const setScenarioTime = useEditorStore(s => s.setScenarioTime);
  const selectActor = useEditorStore(s => s.selectActor);
  const selectWaypoint = useEditorStore(s => s.selectWaypoint);
  const scrubRef = useRef<HTMLDivElement>(null);

  const selectedActorId = selectionActorId(selection);
  const selectedWaypointId = useEditorStore(s => s.selectedWaypointId);
  const trackLength = scenario.egoTrack.length;

  function scrubToFrac(frac: number) {
    setScenarioTime(frac * trackLength);
  }

  function startScrub(e: React.PointerEvent) {
    scrub(e.nativeEvent);

    function scrub(ev: PointerEvent) {
      const bar = scrubRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      scrubToFrac(clamp((ev.clientX - rect.left) / rect.width, 0, 1));
    }

    function handleMove(ev: PointerEvent) { scrub(ev); }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  const playheadPct = trackLength > 0 ? clamp(scenarioTime / trackLength, 0, 1) * 100 : 0;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 backdrop-blur-xl bg-black/60 border-t border-white/10 z-10 select-none"
      style={{ maxHeight: '200px' }}
    >
      {/* Scrub bar */}
      <div
        ref={scrubRef}
        className="relative h-2 bg-white/10 cursor-crosshair ml-28"
        onPointerDown={startScrub}
      >
        <div
          className="absolute top-0 h-full bg-white/30 pointer-events-none"
          style={{ width: `${playheadPct}%` }}
        />
        <div
          className="absolute top-0 w-0.5 h-2 bg-white pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      {/* Lanes */}
      <Lane
        actorId="ego"
        label="Car (ego)"
        color="#22d3ee"
        track={scenario.egoTrack}
        trackLength={trackLength}
        selectedActorId={selectedActorId}
        selectedWaypointId={selectedWaypointId}
        onSelectActor={() => selectActor('ego')}
        onSelectWaypoint={(wpId) => selectWaypoint('ego', wpId)}
      />

      {scenario.actors.map(actor => {
        const track = scenario.tracks.find(t => t.actorId === actor.id);
        if (!track) return null;
        return (
          <Lane
            key={actor.id}
            actorId={actor.id}
            label={actor.label}
            color={actor.color}
            track={track}
            trackLength={track.length}
            selectedActorId={selectedActorId}
            selectedWaypointId={selectedWaypointId}
            onSelectActor={() => selectActor(actor.id)}
            onSelectWaypoint={(wpId) => selectWaypoint(actor.id, wpId)}
          />
        );
      })}

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/50 font-mono">
        <span>{scenarioTime.toFixed(1)} m</span>
        <span>/</span>
        <span>{trackLength.toFixed(1)} m</span>
      </div>
    </div>
  );
}
