import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import type { Block, RoadType, GizmoMode } from './App';
import type { AppMode } from './ui/Toolbar';
import type { Scenario, ScenarioPose } from './scenario/types';
import Car from './Car';
import RoadTile from './visuals/RoadTile';
import SelectionGizmo from './visuals/SelectionGizmo';
import WaypointMarker from './visuals/WaypointMarker';
import TrackLine from './visuals/TrackLine';
import ActorMesh from './visuals/ActorMesh';
import { evaluateTrack } from './scenario/interpolate';
import { useSceneMouseControls } from './hooks/useSceneMouseControls';
import { useScenarioMouseControls } from './hooks/useScenarioMouseControls';

interface Props {
  appMode: AppMode;
  blocks: Block[];
  selectedRoadType: RoadType | null;
  ghostRotation: number;
  selectedId: string | null;
  gizmoMode: GizmoMode;
  playing: boolean;
  rendering: boolean;
  scenario: Scenario;
  scenarioTime: number;
  scenarioPose: ScenarioPose | null;
  selectedActorId: string;
  selectedWaypointId: string | null;
  onRenderComplete: () => void;
  onPlace: (pos: [number, number, number]) => void;
  onRotate: () => void;
  onSelectBlock: (id: string) => void;
  onDeselect: () => void;
  onCancelPlacement: () => void;
  onMoveBlock: (id: string, newPos: [number, number, number]) => void;
  onRotateBlock: (id: string, delta: 1 | -1) => void;
  onScenarioTimeChange: (t: number) => void;
  onAddWaypoint: (actorId: string, time: number, position: [number, number, number]) => void;
  onMoveWaypoint: (actorId: string, waypointId: string, position: [number, number, number]) => void;
  onSelectWaypoint: (waypointId: string | null) => void;
}

export default function Scene({
  appMode,
  blocks,
  selectedRoadType,
  ghostRotation,
  selectedId,
  gizmoMode,
  playing,
  rendering,
  scenario,
  scenarioTime,
  scenarioPose,
  selectedActorId,
  selectedWaypointId,
  onRenderComplete,
  onPlace,
  onRotate,
  onSelectBlock,
  onDeselect,
  onCancelPlacement,
  onMoveBlock,
  onRotateBlock,
  onScenarioTimeChange,
  onAddWaypoint,
  onMoveWaypoint,
  onSelectWaypoint,
}: Props) {
  const { gl, camera } = useThree();

  const { ghost, isDraggingGizmoRef } = useSceneMouseControls({
    gl,
    camera,
    blocks,
    selectedId,
    selectedRoadType: appMode === 'road' ? selectedRoadType : null,
    onPlace,
    onRotate,
    onSelectBlock,
    onDeselect,
    onCancelPlacement,
  });

  useScenarioMouseControls({
    gl,
    camera,
    enabled: appMode === 'scenario',
    scenarioTime,
    selectedActorId,
    onAddWaypoint,
    onScenarioTimeChange,
  });

  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // ── Time advancement ────────────────────────────────────────────────────────
  // Use refs so the useFrame callback always reads the latest prop values
  // without needing to be recreated each render.
  const playingRef     = useRef(playing);
  const renderingRef   = useRef(rendering);
  const scenarioTimeRef = useRef(scenarioTime);
  const durationRef    = useRef(scenario.duration);

  playingRef.current      = playing;
  renderingRef.current    = rendering;
  scenarioTimeRef.current = scenarioTime;
  durationRef.current     = scenario.duration;

  useFrame((_, delta) => {
    if (!playingRef.current && !renderingRef.current) return;
    const next = scenarioTimeRef.current + delta;
    if (renderingRef.current) {
      if (next >= durationRef.current) {
        onRenderComplete();
      } else {
        onScenarioTimeChange(next);
      }
    } else {
      // playing: loop back to 0 at the end
      onScenarioTimeChange(next % durationRef.current);
    }
  });

  const selectedBlock = selectedId ? blocks.find(b => b.id === selectedId) ?? null : null;

  // All tracks for waypoint marker rendering
  const allTracks = [scenario.egoTrack, ...scenario.tracks];
  const actorColorMap: Record<string, string> = { ego: '#22d3ee' };
  scenario.actors.forEach(a => { actorColorMap[a.id] = a.color; });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <gridHelper args={[30, 30, '#444', '#2a2a2a']} />

      <Car
        scenarioPose={scenarioPose}
        rendering={rendering}
      />

      {/* Road tiles */}
      {ghost && selectedRoadType && appMode === 'road' && (
        <RoadTile
          position={[ghost[0], 0, ghost[2]]}
          roadType={selectedRoadType}
          rotation={ghostRotation}
          ghost
        />
      )}

      {blocks.map(b => (
        <RoadTile
          key={b.id}
          position={[b.position[0], 0, b.position[2]]}
          roadType={b.roadType}
          rotation={b.rotation}
          selected={b.id === selectedId}
        />
      ))}

      {selectedBlock && appMode === 'road' && (
        <SelectionGizmo
          position={selectedBlock.position}
          mode={gizmoMode}
          onMove={(newPos) => onMoveBlock(selectedId!, newPos)}
          onRotate={(delta) => onRotateBlock(selectedId!, delta)}
          isDraggingRef={isDraggingGizmoRef}
        />
      )}

      {/* Scenario mode overlays */}
      {appMode === 'scenario' && allTracks.map(track => {
        const color = actorColorMap[track.actorId] ?? '#ffffff';

        return (
          <group key={track.actorId}>
            <TrackLine track={track} color={color} />
            {track.waypoints.map((wp) => (
              <WaypointMarker
                key={wp.id}
                waypoint={wp}
                color={color}
                selected={selectedWaypointId === wp.id}
                onSelect={() => onSelectWaypoint(wp.id)}
                onMove={(pos) => onMoveWaypoint(track.actorId, wp.id, pos)}
              />
            ))}
          </group>
        );
      })}

      {/* Actor meshes */}
      {appMode === 'scenario' && scenario.actors.map(actor => {
        const track = scenario.tracks.find(t => t.actorId === actor.id);
        if (!track) return null;
        const pose = evaluateTrack(track, scenarioTime);
        if (!pose) return null;
        return <ActorMesh key={actor.id} actor={actor} pose={pose} />;
      })}
    </>
  );
}
