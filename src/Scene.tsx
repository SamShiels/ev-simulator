import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import type { Block, RoadType, GizmoMode, RenderPass } from './App';
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

export interface RoadEditorProps {
  blocks: Block[];
  selectedRoadType: RoadType | null;
  ghostRotation: number;
  selectedId: string | null;
  gizmoMode: GizmoMode;
  onPlace: (pos: [number, number, number]) => void;
  onRotate: () => void;
  onSelectBlock: (id: string) => void;
  onDeselect: () => void;
  onCancelPlacement: () => void;
  onMoveBlock: (id: string, newPos: [number, number, number]) => void;
  onRotateBlock: (id: string, delta: 1 | -1) => void;
}

export interface ScenarioEditorProps {
  scenario: Scenario;
  scenarioTime: number;
  scenarioPose: ScenarioPose | null;
  selectedActorId: string;
  selectedWaypointId: string | null;
  playing: boolean;
  renderPass: RenderPass;
  drawingPath: boolean;
  onRenderComplete: () => void;
  onRgbFinished: () => void;
  onDepthFinished: () => void;
  onScenarioTimeChange: (t: number) => void;
  onAddWaypoint: (actorId: string, time: number, position: [number, number, number]) => void;
  onMoveWaypoint: (actorId: string, waypointId: string, position: [number, number, number]) => void;
  onSelectWaypoint: (waypointId: string | null) => void;
  onSelectActor: (actorId: string) => void;
}

interface Props {
  roadEditor: RoadEditorProps;
  scenarioEditor: ScenarioEditorProps;
}

export default function Scene({ roadEditor, scenarioEditor }: Props) {
  const {
    blocks, selectedRoadType, ghostRotation, selectedId, gizmoMode,
    onPlace, onRotate, onSelectBlock, onDeselect, onCancelPlacement,
    onMoveBlock, onRotateBlock,
  } = roadEditor;
  const {
    scenario, scenarioTime, scenarioPose, selectedActorId, selectedWaypointId,
    playing, renderPass, drawingPath,
    onRenderComplete, onRgbFinished, onDepthFinished,
    onScenarioTimeChange, onAddWaypoint, onMoveWaypoint, onSelectWaypoint,
    onSelectActor,
  } = scenarioEditor;
  const rendering = renderPass !== 'idle';
  const { gl, camera } = useThree();

  const { ghost, isDraggingGizmoRef } = useSceneMouseControls({
    gl,
    camera,
    blocks,
    selectedId,
    selectedRoadType,
    drawingPath,
    onPlace,
    onRotate,
    onSelectBlock,
    onDeselect,
    onCancelPlacement,
  });

  useScenarioMouseControls({
    gl,
    camera,
    enabled: drawingPath && !selectedRoadType,
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

  const actorColorMap: Record<string, string> = { ego: '#22d3ee' };
  scenario.actors.forEach(a => { actorColorMap[a.id] = a.color; });

  const selectedTrack = selectedActorId === 'ego'
    ? scenario.egoTrack
    : scenario.tracks.find(t => t.actorId === selectedActorId) ?? null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />

      <Car
        scenarioPose={scenarioPose}
        rendering={rendering}
      />

      {!rendering && 
        <>
          <gridHelper args={[30, 30, '#444', '#2a2a2a']} />
          {/* Road tiles */}
          {ghost && selectedRoadType && (
            <RoadTile
              position={[ghost[0], 0, ghost[2]]}
              roadType={selectedRoadType}
              rotation={ghostRotation}
              ghost
            />
          )}

          {selectedBlock && (
            <SelectionGizmo
              position={selectedBlock.position}
              mode={gizmoMode}
              onMove={(newPos) => onMoveBlock(selectedId!, newPos)}
              onRotate={(delta) => onRotateBlock(selectedId!, delta)}
              isDraggingRef={isDraggingGizmoRef}
            />
          )}

          {/* Selected actor's track + waypoints */}
          {!selectedRoadType && selectedTrack && (() => {
            const color = actorColorMap[selectedTrack.actorId] ?? '#ffffff';
            return (
              <group key={selectedTrack.actorId}>
                <TrackLine track={selectedTrack} color={color} />
                {selectedTrack.waypoints.map((wp) => (
                  <WaypointMarker
                    key={wp.id}
                    waypoint={wp}
                    color={color}
                    selected={selectedWaypointId === wp.id}
                    onSelect={() => onSelectWaypoint(wp.id)}
                    onMove={(pos) => onMoveWaypoint(selectedTrack.actorId, wp.id, pos)}
                  />
                ))}
              </group>
            );
          })()}
        </>
      }

      {blocks.map(b => (
        <RoadTile
          key={b.id}
          position={[b.position[0], 0, b.position[2]]}
          roadType={b.roadType}
          rotation={b.rotation}
          selected={b.id === selectedId}
        />
      ))}

      {/* Actor meshes */}
      {scenario.actors.map(actor => {
        const track = scenario.tracks.find(t => t.actorId === actor.id);
        if (!track) return null;
        const pose = evaluateTrack(track, scenarioTime);
        if (!pose) return null;
        function handleActorSelect() {
          if (drawingPath) return;
          onSelectActor(actor.id);
        }
        return (
          <ActorMesh
            key={actor.id}
            actor={actor}
            pose={pose}
            onSelect={handleActorSelect}
          />
        );
      })}
    </>
  );
}
