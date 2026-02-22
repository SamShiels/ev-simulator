import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import Toolbar from './ui/Toolbar';
import type { AppMode } from './ui/Toolbar';
import Sidebar from './ui/Sidebar';
import Timeline from './ui/Timeline';
import type { InspectedObject } from './ui/Inspector';
import { defaultScenario, nextActorColor } from './scenario/defaults';
import { evaluateTrack } from './scenario/interpolate';
import type { Scenario, Waypoint, WaypointTrack, Actor, ActorKind, ScenarioPose } from './scenario/types';

export type RoadType = 'straight' | 'corner';
export type GizmoMode = 'translate' | 'rotate';

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
  const [rendering, setRendering] = useState(false);

  // ── App mode ───────────────────────────────────────────────────────────────
  const [appMode, setAppMode] = useState<AppMode>('road');

  // ── Scenario state ─────────────────────────────────────────────────────────
  const [scenario, setScenario] = useState<Scenario>(defaultScenario);
  const [scenarioTime, setScenarioTime] = useState(0);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string>('ego');

  // ── Road editor handlers ───────────────────────────────────────────────────
  function placeBlock(pos: [number, number, number]) {
    if (!selectedRoadType) return;
    const occupied = blocks.some(b => b.position[0] === pos[0] && b.position[2] === pos[2]);
    if (occupied) return;
    setBlocks(prev => [
      ...prev,
      {
        id: `${pos[0]}-${pos[2]}-${Date.now()}`,
        position: pos,
        roadType: selectedRoadType,
        rotation: ghostRotation,
      },
    ]);
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

  function addWaypoint(actorId: string, time: number, position: [number, number, number]) {
    const id = uid();
    setTrack(actorId, track => ({
      ...track,
      waypoints: sortByTime([...track.waypoints, { id, time, position }]),
    }));
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

  // Delete selected waypoint on Backspace/Delete key in scenario mode
  useEffect(() => {
    if (appMode !== 'scenario') return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWaypointId) {
        deleteWaypoint(selectedActorId, selectedWaypointId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appMode, selectedActorId, selectedWaypointId]);

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

  function removeActor(actorId: string) {
    setScenario(s => ({
      ...s,
      actors: s.actors.filter(a => a.id !== actorId),
      tracks: s.tracks.filter(t => t.actorId !== actorId),
    }));
    if (selectedActorId === actorId) setSelectedActorId('ego');
  }

  function setDuration(duration: number) {
    setScenario(s => ({ ...s, duration: Math.max(1, duration) }));
  }

  // ── Derived: ego car pose in scenario mode ─────────────────────────────────
  const scenarioPose: ScenarioPose | null = useMemo(() => {
    if (appMode !== 'scenario') return null;
    return evaluateTrack(scenario.egoTrack, scenarioTime);
  }, [appMode, scenario.egoTrack, scenarioTime]);

  // ── Road inspector ─────────────────────────────────────────────────────────
  const inspectedObject: InspectedObject | null = useMemo(() => {
    if (!selectedObject) return null;
    if (selectedObject.kind === 'tile') {
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
    return null;
  }, [selectedObject, blocks]);

  // ── Mode change: stop playback on switch ───────────────────────────────────
  function handleAppModeChange(mode: AppMode) {
    setPlaying(false);
    setAppMode(mode);
  }

  return (
    <div className="dark relative w-screen h-screen bg-[#111]">
      <Canvas
        orthographic
        camera={{ position: [10, 10, 10], zoom: 60, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          appMode={appMode}
          blocks={blocks}
          selectedRoadType={selectedRoadType}
          ghostRotation={ghostRotation}
          selectedId={selectedObject?.kind === 'tile' ? selectedObject.id : null}
          gizmoMode={gizmoMode}
          playing={playing}
          rendering={rendering}
          scenario={scenario}
          scenarioTime={scenarioTime}
          scenarioPose={scenarioPose}
          selectedActorId={selectedActorId}
          selectedWaypointId={selectedWaypointId}
          onRenderComplete={() => setRendering(false)}
          onPlace={placeBlock}
          onRotate={rotate}
          onSelectBlock={handleSelectBlock}
          onDeselect={handleDeselect}
          onCancelPlacement={() => setSelectedRoadType(null)}
          onMoveBlock={handleMoveBlock}
          onRotateBlock={handleRotateBlock}
          onScenarioTimeChange={setScenarioTime}
          onAddWaypoint={addWaypoint}
          onMoveWaypoint={moveWaypoint}
          onSelectWaypoint={setSelectedWaypointId}
        />
      </Canvas>

      <Toolbar
        appMode={appMode}
        gizmoMode={gizmoMode}
        playing={playing}
        rendering={rendering}
        onAppModeChange={handleAppModeChange}
        onGizmoModeChange={setGizmoMode}
        onPlayToggle={() => setPlaying(p => !p)}
        onRenderStart={() => setRendering(true)}
      />

      <Sidebar
        appMode={appMode}
        selectedRoadType={selectedRoadType}
        onSelect={setSelectedRoadType}
        inspectedObject={inspectedObject}
        onDelete={handleDelete}
        scenario={scenario}
        selectedActorId={selectedActorId}
        selectedWaypointId={selectedWaypointId}
        onSelectActor={setSelectedActorId}
        onAddActor={addActor}
        onRemoveActor={removeActor}
      />

      {appMode === 'scenario' && (
        <Timeline
          scenario={scenario}
          scenarioTime={scenarioTime}
          playing={playing}
          selectedActorId={selectedActorId}
          selectedWaypointId={selectedWaypointId}
          onScrub={setScenarioTime}
          onSetDuration={setDuration}
          onSelectActor={setSelectedActorId}
          onSelectWaypoint={(actorId: string, waypointId: string) => {
            setSelectedActorId(actorId);
            setSelectedWaypointId(waypointId);
          }}
          onWaypointTimeChange={setWaypointTime}
        />
      )}
    </div>
  );
}
