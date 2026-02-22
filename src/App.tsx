import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import Toolbar from './ui/Toolbar';
import Sidebar from './ui/Sidebar';
import Timeline from './ui/Timeline';
import HintBar from './ui/HintBar';
import InspectorPanel from './ui/InspectorPanel';
import type { InspectedObject } from './ui/Inspector';
import { defaultScenario, nextActorColor } from './scenario/defaults';
import { evaluateTrack } from './scenario/interpolate';
import { findRoadPath } from './road/pathfinder';
import { getRoadWaypoints } from './road/roadCurve';
import type { Scenario, Waypoint, WaypointTrack, Actor, ActorKind, ScenarioPose } from './scenario/types';

export type RoadType = 'straight' | 'corner';
export type GizmoMode = 'translate' | 'rotate';
export type RenderPass = 'idle' | 'rgb' | 'depth';

export interface Block {
  id: string;
  position: [number, number, number];
  roadType: RoadType;
  rotation: number; // 0–3, each step = 90°
}

export type SelectedObject =
  | { kind: 'tile'; id: string }
  | null;

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function sortByTime(waypoints: Waypoint[]): Waypoint[] {
  return [...waypoints].sort((a, b) => a.time - b.time);
}

export default function App() {
  // ── Road editor state ──────────────────────────────────────────────────────
  const [selectedRoadType, setSelectedRoadType] = useState<RoadType | null>(null);
  const [ghostRotation, setGhostRotation] = useState(1);
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 'default-0', position: [0, 0, 0], roadType: 'straight', rotation: 1 },
  ]);
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [playing, setPlaying] = useState(false);
  const [renderPass, setRenderPass] = useState<RenderPass>('idle');
  const [drawingPath, setDrawingPath] = useState(false);
  const rendering = renderPass !== 'idle';

  // ── Scenario state ─────────────────────────────────────────────────────────
  const [scenario, setScenario] = useState<Scenario>(defaultScenario);
  const [scenarioTime, setScenarioTime] = useState(0);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string>('ego');

  // ── Initial ego track seed (mount only) ───────────────────────────────────
  // Builds the full track from the default road. After this, placements only
  // append; moves/rotates/deletes leave the track untouched so manual edits survive.
  function seedEgoTrack(currentBlocks: Block[]) {
    const path = findRoadPath(currentBlocks);
    if (!path) {
      setScenario(s => ({ ...s, egoTrack: { actorId: 'ego', waypoints: [] } }));
      return;
    }
    const pts = getRoadWaypoints(path);
    const n = pts.length;
    const dur = scenario.duration;
    const waypoints: Waypoint[] = pts.map((pt, i) => ({
      id: uid(),
      time: n === 1 ? 0 : (i / (n - 1)) * dur,
      position: [pt.x, pt.y, pt.z],
    }));
    setScenario(s => ({ ...s, egoTrack: { actorId: 'ego', waypoints } }));
  }

  // ── Road editor handlers ───────────────────────────────────────────────────
  function placeBlock(pos: [number, number, number]) {
    if (!selectedRoadType) return;
    const occupied = blocks.some(b => b.position[0] === pos[0] && b.position[2] === pos[2]);
    if (occupied) return;
    const newBlock: Block = {
      id: `${pos[0]}-${pos[2]}-${Date.now()}`,
      position: pos,
      roadType: selectedRoadType,
      rotation: ghostRotation,
    };
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);

    // Only append waypoints if the new tile actually extends the road path.
    const oldPath = findRoadPath(blocks);
    const oldPathLen = oldPath?.length ?? 0;
    const newPath = findRoadPath(newBlocks);
    if (!newPath || newPath.length <= oldPathLen) return;

    // Diff the old and new point arrays — corner tiles contribute 2 new points.
    const oldPts = oldPath ? getRoadWaypoints(oldPath) : [];
    const newPts = getRoadWaypoints(newPath);
    const addedPts = newPts.slice(oldPts.length);
    if (addedPts.length === 0) return;

    const addedWps: Waypoint[] = addedPts.map(pt => ({
      id: uid(),
      time: 0,
      position: [pt.x, pt.y, pt.z] as [number, number, number],
    }));
    setScenario(s => {
      // Append new waypoints then redistribute all times evenly 0→duration.
      // This preserves waypoint positions while keeping timing predictable.
      const wps = [...s.egoTrack.waypoints, ...addedWps];
      const n = wps.length;
      const dur = s.duration;
      const redistributed = wps.map((wp, i) => ({
        ...wp,
        time: n === 1 ? 0 : (i / (n - 1)) * dur,
      }));
      return { ...s, egoTrack: { ...s.egoTrack, waypoints: redistributed } };
    });
  }

  function rotate() {
    setGhostRotation(r => (r + 1) % 4);
  }

  function handleSelectBlock(id: string) {
    setSelectedObject({ kind: 'tile', id });
  }

  function handleDeselect() {
    setSelectedObject(null);
  }

  function handleMoveBlock(id: string, newPos: [number, number, number]) {
    const occupied = blocks.some(b => b.id !== id && b.position[0] === newPos[0] && b.position[2] === newPos[2]);
    if (occupied) return;
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, position: newPos } : b));
  }

  function handleRotateBlock(id: string, delta: 1 | -1) {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, rotation: ((b.rotation + delta) % 4 + 4) % 4 } : b,
    ));
  }

  function handleDelete() {
    if (!selectedObject) return;
    if (selectedObject.kind === 'tile') {
      const block = blocks.find(b => b.id === selectedObject.id);
      if (block && block.position[0] === 0 && block.position[2] === 0) return;
      setBlocks(prev => prev.filter(b => b.id !== selectedObject.id));
    }
    setSelectedObject(null);
  }

  // ── Scenario: waypoint mutation handlers ───────────────────────────────────
  function setTrack(actorId: string, updater: (track: WaypointTrack) => WaypointTrack) {
    if (actorId === 'ego') {
      setScenario(s => ({ ...s, egoTrack: updater(s.egoTrack) }));
    } else {
      setScenario(s => ({
        ...s,
        tracks: s.tracks.map(t => t.actorId === actorId ? updater(t) : t),
      }));
    }
  }

  function isEvenlyDistributed(waypoints: Waypoint[], duration: number): boolean {
    if (waypoints.length <= 1) return true;
    const n = waypoints.length;
    const tolerance = duration * 0.01;
    return waypoints.every((wp, i) =>
      Math.abs(wp.time - (i / (n - 1)) * duration) <= tolerance,
    );
  }

  function addWaypoint(actorId: string, _time: number, position: [number, number, number]) {
    const id = uid();
    const dur = scenario.duration;
    setTrack(actorId, track => {
      const wps = track.waypoints;
      if (isEvenlyDistributed(wps, dur)) {
        // Fresh/uniform path: append and redistribute all evenly
        const newWps = [...wps, { id, time: dur, position }];
        const n = newWps.length;
        return {
          ...track,
          waypoints: newWps.map((wp, i) => ({
            ...wp,
            time: n === 1 ? 0 : (i / (n - 1)) * dur,
          })),
        };
      } else {
        // User has manual timing: preserve existing, append after last with avg gap
        const lastTime = wps[wps.length - 1].time;
        const avgGap = wps.length > 1
          ? (wps[wps.length - 1].time - wps[0].time) / (wps.length - 1)
          : dur * 0.25;
        const newTime = Math.min(dur, lastTime + avgGap);
        return {
          ...track,
          waypoints: sortByTime([...wps, { id, time: newTime, position }]),
        };
      }
    });
    setSelectedWaypointId(id);
  }

  function moveWaypoint(actorId: string, waypointId: string, position: [number, number, number]) {
    setTrack(actorId, track => ({
      ...track,
      waypoints: track.waypoints.map(w => w.id === waypointId ? { ...w, position } : w),
    }));
  }

  function setWaypointTime(actorId: string, waypointId: string, time: number) {
    setTrack(actorId, track => ({
      ...track,
      waypoints: sortByTime(track.waypoints.map(w => w.id === waypointId ? { ...w, time } : w)),
    }));
  }

  function deleteWaypoint(actorId: string, waypointId: string) {
    setTrack(actorId, track => ({
      ...track,
      waypoints: track.waypoints.filter(w => w.id !== waypointId),
    }));
    if (selectedWaypointId === waypointId) setSelectedWaypointId(null);
  }

  // Delete selected waypoint on Backspace/Delete key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWaypointId) {
        deleteWaypoint(selectedActorId, selectedWaypointId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedActorId, selectedWaypointId]);

  function addActor(kind: ActorKind) {
    const id = uid();
    const count = scenario.actors.length;
    const kindLabels: Record<ActorKind, string> = {
      pedestrian: 'Pedestrian',
      stroller: 'Stroller',
      vehicle: 'Vehicle',
    };
    const actor: Actor = {
      id,
      kind,
      label: `${kindLabels[kind]} ${count + 1}`,
      color: nextActorColor(count),
    };
    const track: WaypointTrack = { actorId: id, waypoints: [] };
    setScenario(s => ({
      ...s,
      actors: [...s.actors, actor],
      tracks: [...s.tracks, track],
    }));
    setSelectedActorId(id);
  }

  function handleSelectActor(actorId: string) {
    setSelectedActorId(actorId);
    setSelectedWaypointId(null);
  }

  function removeActor(actorId: string) {
    setScenario(s => ({
      ...s,
      actors: s.actors.filter(a => a.id !== actorId),
      tracks: s.tracks.filter(t => t.actorId !== actorId),
    }));
    if (selectedActorId === actorId) setSelectedActorId('ego');
  }

  function setDuration(duration: number) {
    const newDur = Math.max(1, duration);
    setScenario(s => {
      const scale = newDur / s.duration;
      const rescaleTrack = (track: WaypointTrack) => ({
        ...track,
        waypoints: track.waypoints.map(wp => ({ ...wp, time: wp.time * scale })),
      });
      return {
        ...s,
        duration: newDur,
        egoTrack: rescaleTrack(s.egoTrack),
        tracks: s.tracks.map(rescaleTrack),
      };
    });
  }

  // ── Derived: ego car pose (always — car follows waypoints in both modes) ────
  const scenarioPose: ScenarioPose | null = useMemo(() => {
    return evaluateTrack(scenario.egoTrack, scenarioTime);
  }, [scenario.egoTrack, scenarioTime]);

  // ── Inspector ──────────────────────────────────────────────────────────────
  const inspectedObject: InspectedObject | null = useMemo(() => {
    if (selectedObject?.kind === 'tile') {
      const block = blocks.find(b => b.id === selectedObject.id);
      if (!block) return null;
      return {
        kind: 'tile',
        id: block.id,
        position: block.position,
        roadType: block.roadType,
        rotation: block.rotation,
      };
    }
    if (selectedActorId && selectedActorId !== 'ego') {
      const actor = scenario.actors.find(a => a.id === selectedActorId);
      if (!actor) return null;
      return {
        kind: 'actor',
        id: actor.id,
        label: actor.label,
        actorKind: actor.kind,
        color: actor.color,
      };
    }
    return null;
  }, [selectedObject, blocks, selectedActorId, scenario.actors]);

  // ── Seed ego track from initial road on mount ─────────────────────────────
  useEffect(() => {
    seedEgoTrack(blocks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRenderStart() {
    setScenarioTime(0);
    setPlaying(false);
    setRenderPass('rgb');
  }

  function handleRenderComplete() {
    setRenderPass('idle');
  }

  function handleRgbFinished() {
    setScenarioTime(0);
    setRenderPass('depth');
  }

  function handleDepthFinished() {
    // both passes done; renderPass already 'idle'
  }

  function handleSelectRoadType(type: RoadType | null) {
    setSelectedRoadType(type);
    if (type !== null) setDrawingPath(false);
  }

  return (
    <div className="dark relative w-screen h-screen bg-[#111]">
      <Canvas
        orthographic
        camera={{ position: [10, 10, 10], zoom: 60, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          roadEditor={{
            blocks,
            selectedRoadType,
            ghostRotation,
            selectedId: selectedObject?.kind === 'tile' ? selectedObject.id : null,
            gizmoMode,
            onPlace: placeBlock,
            onRotate: rotate,
            onSelectBlock: handleSelectBlock,
            onDeselect: handleDeselect,
            onCancelPlacement: () => setSelectedRoadType(null),
            onMoveBlock: handleMoveBlock,
            onRotateBlock: handleRotateBlock,
          }}
          scenarioEditor={{
            scenario,
            scenarioTime,
            scenarioPose,
            selectedActorId,
            selectedWaypointId,
            playing,
            renderPass,
            drawingPath,
            onRenderComplete: handleRenderComplete,
            onRgbFinished: handleRgbFinished,
            onDepthFinished: handleDepthFinished,
            onScenarioTimeChange: setScenarioTime,
            onAddWaypoint: addWaypoint,
            onMoveWaypoint: moveWaypoint,
            onSelectWaypoint: setSelectedWaypointId,
            onSelectActor: handleSelectActor,
          }}
        />
      </Canvas>

      <Toolbar
        gizmoMode={gizmoMode}
        playing={playing}
        rendering={rendering}
        drawingPath={drawingPath}
        onGizmoModeChange={setGizmoMode}
        onPlayToggle={() => setPlaying(p => !p)}
        onRenderStart={handleRenderStart}
        onDrawingPathToggle={() => setDrawingPath(d => !d)}
      />

      <InspectorPanel inspectedObject={inspectedObject} onDelete={handleDelete} />

      <Sidebar
        selectedRoadType={selectedRoadType}
        onSelect={handleSelectRoadType}
        scenario={scenario}
        selectedActorId={selectedActorId}
        selectedWaypointId={selectedWaypointId}
        onSelectActor={handleSelectActor}
        onAddActor={addActor}
        onRemoveActor={removeActor}
      />

      <HintBar selectedRoadType={selectedRoadType} drawingPath={drawingPath} />

      <Timeline
        scenario={scenario}
        scenarioTime={scenarioTime}
        playing={playing}
        selectedActorId={selectedActorId}
        selectedWaypointId={selectedWaypointId}
        onScrub={setScenarioTime}
        onSetDuration={setDuration}
        onSelectActor={handleSelectActor}
        onSelectWaypoint={(actorId: string, waypointId: string) => {
          setSelectedActorId(actorId);
          setSelectedWaypointId(waypointId);
        }}
        onWaypointTimeChange={setWaypointTime}
      />
    </div>
  );
}
