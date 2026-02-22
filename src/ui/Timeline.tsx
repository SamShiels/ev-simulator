import { useRef } from 'react';
import type { Scenario } from '../scenario/types';

interface Props {
  scenario: Scenario;
  scenarioTime: number;
  playing: boolean;
  selectedActorId: string;
  selectedWaypointId: string | null;
  onScrub: (t: number) => void;
  onSetDuration: (d: number) => void;
  onSelectActor: (actorId: string) => void;
  onSelectWaypoint: (actorId: string, waypointId: string) => void;
  onWaypointTimeChange: (actorId: string, waypointId: string, time: number) => void;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

interface LaneProps {
  actorId: string;
  label: string;
  color: string;
  waypoints: Array<{ id: string; time: number }>;
  duration: number;
  selectedActorId: string;
  selectedWaypointId: string | null;
  onSelectActor: () => void;
  onSelectWaypoint: (waypointId: string) => void;
  onWaypointTimeChange: (waypointId: string, time: number) => void;
}

function Lane({
  actorId,
  label,
  color,
  waypoints,
  duration,
  selectedActorId,
  selectedWaypointId,
  onSelectActor,
  onSelectWaypoint,
  onWaypointTimeChange,
}: LaneProps) {
  const laneRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedActorId === actorId;

  function startDragWaypoint(waypointId: string, e: React.PointerEvent) {
    e.stopPropagation();
    onSelectWaypoint(waypointId);

    function handleMove(ev: PointerEvent) {
      const lane = laneRef.current;
      if (!lane) return;
      const rect = lane.getBoundingClientRect();
      const frac = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      onWaypointTimeChange(waypointId, frac * duration);
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  return (
    <div
      className={`flex items-center h-8 border-b border-white/5 ${isSelected ? 'bg-white/5' : ''}`}
      onClick={onSelectActor}
    >
      {/* Label */}
      <div className="w-28 shrink-0 px-3 text-xs truncate" style={{ color: isSelected ? '#fff' : '#ffffff80' }}>
        {label}
      </div>

      {/* Waypoint diamonds */}
      <div ref={laneRef} className="flex-1 relative h-full">
        {waypoints.map(wp => {
          const pct = clamp(wp.time / duration, 0, 1) * 100;
          const isWpSelected = selectedWaypointId === wp.id;
          return (
            <div
              key={wp.id}
              onPointerDown={(e) => startDragWaypoint(wp.id, e)}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 cursor-ew-resize"
              style={{
                left: `${pct}%`,
                backgroundColor: isWpSelected ? '#ffffff' : color,
                border: isWpSelected ? '2px solid #ffffff' : `2px solid ${color}`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Timeline({
  scenario,
  scenarioTime,
  selectedActorId,
  selectedWaypointId,
  onScrub,
  onSetDuration,
  onSelectActor,
  onSelectWaypoint,
  onWaypointTimeChange,
}: Props) {
  const scrubRef = useRef<HTMLDivElement>(null);

  function startScrub(e: React.PointerEvent) {
    scrub(e.nativeEvent);

    function scrub(ev: PointerEvent) {
      const bar = scrubRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const frac = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      onScrub(frac * scenario.duration);
    }

    function handleMove(ev: PointerEvent) { scrub(ev); }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  const egoWaypoints = scenario.egoTrack.waypoints.map(w => ({ id: w.id, time: w.time }));

  const playheadPct = clamp(scenarioTime / scenario.duration, 0, 1) * 100;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 backdrop-blur-xl bg-black/60 border-t border-white/10 z-10 select-none"
      style={{ maxHeight: '200px' }}
    >
      {/* Scrub bar */}
      <div
        ref={scrubRef}
        className="relative h-2 bg-white/10 cursor-crosshair mx-28"
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
        waypoints={egoWaypoints}
        duration={scenario.duration}
        selectedActorId={selectedActorId}
        selectedWaypointId={selectedWaypointId}
        onSelectActor={() => onSelectActor('ego')}
        onSelectWaypoint={(wpId) => onSelectWaypoint('ego', wpId)}
        onWaypointTimeChange={(wpId, t) => onWaypointTimeChange('ego', wpId, t)}
      />

      {scenario.actors.map(actor => {
        const track = scenario.tracks.find(t => t.actorId === actor.id);
        const wps = track ? track.waypoints.map(w => ({ id: w.id, time: w.time })) : [];
        return (
          <Lane
            key={actor.id}
            actorId={actor.id}
            label={actor.label}
            color={actor.color}
            waypoints={wps}
            duration={scenario.duration}
            selectedActorId={selectedActorId}
            selectedWaypointId={selectedWaypointId}
            onSelectActor={() => onSelectActor(actor.id)}
            onSelectWaypoint={(wpId) => onSelectWaypoint(actor.id, wpId)}
            onWaypointTimeChange={(wpId, t) => onWaypointTimeChange(actor.id, wpId, t)}
          />
        );
      })}

      {/* Footer */}
      <div className="flex items-center gap-4 px-3 py-1.5 text-xs text-white/50">
        <span className="font-mono">{scenarioTime.toFixed(2)}s</span>
        <span>/</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={300}
            value={scenario.duration}
            onChange={e => onSetDuration(Number(e.target.value))}
            className="w-14 bg-white/10 rounded px-1.5 py-0.5 text-white text-xs font-mono"
          />
          <span>s</span>
        </div>
      </div>
    </div>
  );
}
