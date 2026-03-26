import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import EgoActor from './EgoActor';
import RoadTile from './visuals/RoadTile';
import SceneryMesh from './visuals/SceneryMesh';
import SelectionGizmo from './visuals/SelectionGizmo';
import WaypointMarker from './visuals/WaypointMarker';
import TrackLine from './visuals/TrackLine';
import { PedestrianMesh, StrollerMesh, VehicleMesh } from './visuals/ActorMesh';
import ScenarioActor from './ScenarioActor';
import { useSceneMouseControls } from './hooks/useSceneMouseControls';
import { useScenarioMouseControls } from './hooks/useScenarioMouseControls';
import { useEditorStore, selectionActorId, selectionSceneryId } from './store/useEditorStore';
import { useCanvasRecorder } from './hooks/useCanvasRecorder';
import { useRenderPass } from './hooks/useRenderPass';
import { ROAD_TYPE_MAP } from './App';
import { GRID_SIZE } from './constants';
import type { RoadType } from './App';
import { TILE_SIZE } from './constants';

const GHOST_WP_POLE_HEIGHT = 0.6;
const GHOST_WP_SPHERE_RADIUS = 0.18;
const GHOST_WP_POLE_RADIUS = 0.04;

function gridToWorld(row: number, col: number): [number, number, number] {
  return [(col - Math.floor(GRID_SIZE / 2)) * TILE_SIZE, 0, (row - Math.floor(GRID_SIZE / 2)) * TILE_SIZE];
}

export default function Scene() {
  const roadGrid = useEditorStore(s => s.roadGrid);
  const selectedRoadId = useEditorStore(s => s.selectedRoadId);
  const ghostRotation = useEditorStore(s => s.ghostRotation);
  const selection = useEditorStore(s => s.selection);
  const gizmoMode = useEditorStore(s => s.gizmoMode);
  const scenario = useEditorStore(s => s.scenario);
  const scenarioProgress = useEditorStore(s => s.scenarioProgress);
  const playing = useEditorStore(s => s.playing);
  const renderPass = useEditorStore(s => s.renderPass);

  const sceneryItems = useEditorStore(s => s.sceneryItems);
  const selectedSceneryType = useEditorStore(s => s.selectedSceneryType);
  const sceneryGhostRotation = useEditorStore(s => s.sceneryGhostRotation);

  const rotateGhost = useEditorStore(s => s.rotateGhost);
  const paintCell = useEditorStore(s => s.paintCell);
  const selectRoadId = useEditorStore(s => s.selectRoadId);
  const addWaypoint = useEditorStore(s => s.addWaypoint);
  const moveWaypoint = useEditorStore(s => s.moveWaypoint);
  const setScenarioProgress = useEditorStore(s => s.setScenarioProgress);

  const selectActor = useEditorStore(s => s.selectActor);
  const selectWaypoint = useEditorStore(s => s.selectWaypoint);
  const setWaypointPopupPos = useEditorStore(s => s.setWaypointPopupPos);
  const placeSceneryItem = useEditorStore(s => s.placeSceneryItem);
  const rotateSceneryGhost = useEditorStore(s => s.rotateSceneryGhost);
  const selectSceneryItem = useEditorStore(s => s.selectSceneryItem);
  const selectSceneryType = useEditorStore(s => s.selectSceneryType);
  const moveSceneryItem = useEditorStore(s => s.moveSceneryItem);
  const rotateSceneryItem = useEditorStore(s => s.rotateSceneryItem);

  const drawingPath = useEditorStore(s => s.drawingPath);
  const selectedActorKind = useEditorStore(s => s.selectedActorKind);
  const placeActor = useEditorStore(s => s.placeActor);
  const selectActorKind = useEditorStore(s => s.selectActorKind);

  const rendering = renderPass !== 'idle';
  const selectedSceneryId = selectionSceneryId(selection);
  const selectedActorId = selectionActorId(selection);
  const selectedWaypointId = useEditorStore(s => s.selectedWaypointId);

  const { gl, camera } = useThree();

  useCanvasRecorder(renderPass);
  useRenderPass(renderPass);
  const [cursorPos, setCursorPos] = useState<[number, number, number] | null>(null);

  const deselectToEgo = useEditorStore(s => s.selectActor);

  const { ghost, isDraggingGizmoRef } = useSceneMouseControls({
    gl,
    camera,
    roadGrid,
    sceneryItems,
    selectedRoadId,
    selectedSceneryType,
    selectedActorKind,
    onPaintCell: paintCell,
    onRotate: rotateGhost,
    onDeselect: () => deselectToEgo('ego'),
    onPlaceScenery: placeSceneryItem,
    onRotateScenery: rotateSceneryGhost,
    onSelectSceneryItem: selectSceneryItem,
    onCancelScenery: () => selectSceneryType(null),
    onPlaceActor: placeActor,
    onCancelActor: () => selectActorKind(null),
    onCancelRoad: () => selectRoadId(null),
  });

  useScenarioMouseControls({
    gl,
    camera,
    enabled: drawingPath,
    scenarioProgress,
    selectedActorId,
    onAddWaypoint: addWaypoint,
    onScenarioProgressChange: setScenarioProgress,
    onCursorMove: setCursorPos,
  });

  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // ── Playback loop ─────────────────────────────────────────────────────────
  const playingRef = useRef(playing);
  const scenarioTimeRef = useRef(scenarioProgress);
  const egoTrackLengthRef = useRef(scenario.egoTrack.length);

  playingRef.current = playing;
  scenarioTimeRef.current = scenarioProgress;
  egoTrackLengthRef.current = scenario.egoTrack.length;

  useFrame(() => {
    if (!playingRef.current) return;
    const length = egoTrackLengthRef.current;
    if (length > 0 && scenarioTimeRef.current >= length) {
      setScenarioProgress(0);
    }
  });

  const selectedSceneryItem = selectedSceneryId ? sceneryItems.find(s => s.id === selectedSceneryId) ?? null : null;

  const actorColorMap: Record<string, string> = { ego: '#22d3ee' };
  scenario.actors.forEach(a => { actorColorMap[a.id] = a.color; });

  const selectedTrack = selectedActorId === 'ego'
    ? scenario.egoTrack
    : scenario.tracks.find(t => t.actorId === selectedActorId) ?? null;

  // Build flat list of grid tiles for rendering
  const gridTiles = useMemo(() => {
    const tiles: { row: number; col: number; roadType: RoadType; rotation: number; position: [number, number, number] }[] = [];
    roadGrid.forEach((rowArr, ri) => {
      rowArr.forEach((cell, ci) => {
        const roadType = ROAD_TYPE_MAP[cell.type];
        if (roadType) {
          tiles.push({ row: ri, col: ci, roadType, rotation: cell.rotation, position: gridToWorld(ri, ci) });
        }
      });
    });
    return tiles;
  }, [roadGrid]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />

      <EgoActor track={scenario.egoTrack} stats={scenario.egoStats} rendering={rendering} />

      {!rendering && (
        <>
          <gridHelper args={[30, 30, '#444', '#2a2a2a']} />

          {ghost && selectedRoadId !== null && (
            <RoadTile
              position={[ghost[0], 0, ghost[2]]}
              roadType={ROAD_TYPE_MAP[selectedRoadId] ?? 'pavement'}
              rotation={ghostRotation}
              ghost
            />
          )}

          {ghost && selectedSceneryType && (
            <SceneryMesh
              position={[ghost[0], 0, ghost[2]]}
              sceneryType={selectedSceneryType}
              rotation={sceneryGhostRotation}
              ghost
            />
          )}

          {ghost && selectedActorKind && (
            <group position={[ghost[0], 0, ghost[2]]}>
              {selectedActorKind === 'pedestrian' && <PedestrianMesh color="#9ca3af" ghost />}
              {selectedActorKind === 'stroller' && <StrollerMesh color="#9ca3af" ghost />}
              {selectedActorKind === 'vehicle' && <VehicleMesh color="#9ca3af" ghost />}
            </group>
          )}

          {selectedSceneryItem && (
            <SelectionGizmo
              position={selectedSceneryItem.position}
              mode={gizmoMode}
              onMove={(newPos) => moveSceneryItem(selectedSceneryId!, newPos)}
              onRotate={(delta) => rotateSceneryItem(selectedSceneryId!, delta)}
              isDraggingRef={isDraggingGizmoRef}
            />
          )}

          {selectedTrack && (() => {
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
                    onPress={() => selectWaypoint(selectedTrack.actorId, wp.id)}
                    onSelect={(screenX, screenY) => setWaypointPopupPos({ x: screenX, y: screenY })}
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
              </group>
            );
          })()}
        </>
      )}

      {gridTiles.map(({ row, col, roadType, rotation, position }) => (
        <RoadTile
          key={`${row}-${col}`}
          position={position}
          roadType={roadType}
          rotation={rotation}
        />
      ))}

      {sceneryItems.map(s => (
        <SceneryMesh
          key={s.id}
          position={[s.position[0], 0, s.position[2]]}
          sceneryType={s.sceneryType}
          rotation={s.rotation}
          selected={s.id === selectedSceneryId}
        />
      ))}

      {scenario.actors.map(actor => {
        const track = scenario.tracks.find(t => t.actorId === actor.id);
        if (!track) return null;
        return (
          <ScenarioActor
            key={actor.id}
            actor={actor}
            track={track}
            onSelect={() => selectActor(actor.id)}
          />
        );
      })}
    </>
  );
}
