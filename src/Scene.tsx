import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import Car from './Car';
import RoadTile from './visuals/RoadTile';
import SelectionGizmo from './visuals/SelectionGizmo';
import WaypointMarker from './visuals/WaypointMarker';
import TrackLine from './visuals/TrackLine';
import ActorMesh from './visuals/ActorMesh';
import { evaluateTrack } from './scenario/interpolate';
import { useSceneMouseControls } from './hooks/useSceneMouseControls';
import { useScenarioMouseControls } from './hooks/useScenarioMouseControls';
import { useEditorStore, selectionActorId, selectionTileId, selectionWaypointId } from './store/useEditorStore';

const GHOST_WP_POLE_HEIGHT = 0.6;
const GHOST_WP_SPHERE_RADIUS = 0.18;
const GHOST_WP_POLE_RADIUS = 0.04;

export default function Scene() {
  const blocks = useEditorStore(s => s.blocks);
  const selectedRoadType = useEditorStore(s => s.selectedRoadType);
  const ghostRotation = useEditorStore(s => s.ghostRotation);
  const selection = useEditorStore(s => s.selection);
  const gizmoMode = useEditorStore(s => s.gizmoMode);
  const scenario = useEditorStore(s => s.scenario);
  const scenarioTime = useEditorStore(s => s.scenarioTime);
  const playing = useEditorStore(s => s.playing);
  const renderPass = useEditorStore(s => s.renderPass);

  const placeBlock = useEditorStore(s => s.placeBlock);
  const rotateGhost = useEditorStore(s => s.rotateGhost);
  const selectBlock = useEditorStore(s => s.selectBlock);
  const deselectBlock = useEditorStore(s => s.deselectBlock);
  const selectRoadType = useEditorStore(s => s.selectRoadType);
  const moveBlock = useEditorStore(s => s.moveBlock);
  const rotateBlock = useEditorStore(s => s.rotateBlock);
  const addWaypoint = useEditorStore(s => s.addWaypoint);
  const moveWaypoint = useEditorStore(s => s.moveWaypoint);
  const setScenarioTime = useEditorStore(s => s.setScenarioTime);
  const setRenderPass = useEditorStore(s => s.setRenderPass);
  const selectActor = useEditorStore(s => s.selectActor);
  const selectWaypoint = useEditorStore(s => s.selectWaypoint);

  const drawingPath = useEditorStore(s => s.drawingPath);

  const rendering = renderPass !== 'idle';
  const selectedId = selectionTileId(selection);
  const selectedActorId = selectionActorId(selection);
  const selectedWaypointId = selectionWaypointId(selection);

  const { gl, camera } = useThree();
  const [cursorPos, setCursorPos] = useState<[number, number, number] | null>(null);

  const { ghost, isDraggingGizmoRef } = useSceneMouseControls({
    gl,
    camera,
    blocks,
    selectedId,
    selectedRoadType,
    onPlace: placeBlock,
    onRotate: rotateGhost,
    onSelectBlock: selectBlock,
    onDeselect: deselectBlock,
    onCancelPlacement: () => selectRoadType(null),
  });

  useScenarioMouseControls({
    gl,
    camera,
    enabled: drawingPath,
    scenarioTime,
    selectedActorId,
    onAddWaypoint: addWaypoint,
    onScenarioTimeChange: setScenarioTime,
    onCursorMove: setCursorPos,
  });

  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // ── Time advancement ──────────────────────────────────────────────────────
  const playingRef = useRef(playing);
  const renderingRef = useRef(rendering);
  const scenarioTimeRef = useRef(scenarioTime);
  const durationRef = useRef(scenario.duration);

  playingRef.current = playing;
  renderingRef.current = rendering;
  scenarioTimeRef.current = scenarioTime;
  durationRef.current = scenario.duration;

  useFrame((_, delta) => {
    if (!playingRef.current && !renderingRef.current) return;
    const next = scenarioTimeRef.current + delta;
    if (renderingRef.current) {
      if (next >= durationRef.current) {
        setRenderPass('idle');
      } else {
        setScenarioTime(next);
      }
    } else {
      setScenarioTime(next % durationRef.current);
    }
  });

  const selectedBlock = selectedId ? blocks.find(b => b.id === selectedId) ?? null : null;

  const actorColorMap: Record<string, string> = { ego: '#22d3ee' };
  scenario.actors.forEach(a => { actorColorMap[a.id] = a.color; });

  const selectedTrack = selectedActorId === 'ego'
    ? scenario.egoTrack
    : scenario.tracks.find(t => t.actorId === selectedActorId) ?? null;

  const ghostActor = drawingPath && selectedActorId !== 'ego'
    ? scenario.actors.find(a => a.id === selectedActorId) ?? null
    : null;

  const scenarioPose = evaluateTrack(scenario.egoTrack, scenarioTime);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />

      <Car scenarioPose={scenarioPose} rendering={rendering} />

      {!rendering && (
        <>
          <gridHelper args={[30, 30, '#444', '#2a2a2a']} />

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
              onMove={(newPos) => moveBlock(selectedId!, newPos)}
              onRotate={(delta) => rotateBlock(selectedId!, delta)}
              isDraggingRef={isDraggingGizmoRef}
            />
          )}

          {drawingPath && selectedTrack && (() => {
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
                    onSelect={() => selectWaypoint(selectedTrack.actorId, wp.id)}
                    onMove={(pos) => moveWaypoint(selectedTrack.actorId, wp.id, pos)}
                  />
                ))}
              </group>
            );
          })()}

          {drawingPath && cursorPos && (() => {
            const [cx, , cz] = cursorPos;
            const color = actorColorMap[selectedActorId] ?? '#ffffff';
            return (
              <group position={[cx, 0, cz]}>
                <mesh position={[0, GHOST_WP_POLE_HEIGHT / 2, 0]}>
                  <cylinderGeometry args={[GHOST_WP_POLE_RADIUS, GHOST_WP_POLE_RADIUS, GHOST_WP_POLE_HEIGHT, 6]} />
                  <meshBasicMaterial color={color} transparent opacity={0.4} />
                </mesh>
                <mesh position={[0, GHOST_WP_POLE_HEIGHT + GHOST_WP_SPHERE_RADIUS, 0]}>
                  <sphereGeometry args={[GHOST_WP_SPHERE_RADIUS, 10, 8]} />
                  <meshBasicMaterial color={color} transparent opacity={0.4} />
                </mesh>
                {ghostActor && (
                  <ActorMesh
                    actor={ghostActor}
                    pose={{ position: [0, 0, 0], yaw: 0 }}
                    ghost
                  />
                )}
              </group>
            );
          })()}
        </>
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

      {scenario.actors.map(actor => {
        const track = scenario.tracks.find(t => t.actorId === actor.id);
        if (!track) return null;
        const pose = evaluateTrack(track, scenarioTime);
        if (!pose) return null;
        function handleActorSelect() {
          selectActor(actor.id);
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
