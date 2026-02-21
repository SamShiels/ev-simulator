import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { Block, RoadType, GizmoMode } from './App';
import Car from './Car';
import CurveLine from './visuals/CurveLine';
import RoadTile from './visuals/RoadTile';
import SelectionGizmo from './visuals/SelectionGizmo';
import { findRoadPath } from './road/pathfinder';
import { buildRoadCurve } from './road/roadCurve';
import { useSceneMouseControls } from './hooks/useSceneMouseControls';

interface Props {
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

export default function Scene({
  blocks,
  selectedRoadType,
  ghostRotation,
  selectedId,
  gizmoMode,
  onPlace,
  onRotate,
  onSelectBlock,
  onDeselect,
  onCancelPlacement,
  onMoveBlock,
  onRotateBlock,
}: Props) {
  const { gl, camera } = useThree();

  const { ghost, isDraggingGizmoRef } = useSceneMouseControls({
    gl,
    camera,
    blocks,
    selectedId,
    selectedRoadType,
    onPlace,
    onRotate,
    onSelectBlock,
    onDeselect,
    onCancelPlacement,
  });

  const roadCurve = useMemo(() => {
    const result = findRoadPath(blocks);
    return result ? buildRoadCurve(result) : null;
  }, [blocks]);

  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const selectedBlock = selectedId ? blocks.find(b => b.id === selectedId) ?? null : null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <gridHelper args={[30, 30, '#444', '#2a2a2a']} />
      <CurveLine curve={roadCurve} />
      <Car curve={roadCurve} />

      {ghost && selectedRoadType && (
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

      {selectedBlock && (
        <SelectionGizmo
          position={selectedBlock.position}
          mode={gizmoMode}
          onMove={(newPos) => onMoveBlock(selectedId!, newPos)}
          onRotate={(delta) => onRotateBlock(selectedId!, delta)}
          isDraggingRef={isDraggingGizmoRef}
        />
      )}
    </>
  );
}
