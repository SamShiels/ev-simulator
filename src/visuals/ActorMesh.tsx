import type { Actor, ScenarioPose } from '../scenario/types';

interface Props {
  actor: Actor;
  pose: ScenarioPose;
  onSelect?: () => void;
}

export function PedestrianMesh({ color }: { color: string }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1.0, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export function StrollerMesh({ color }: { color: string }) {
  return (
    <group>
      {/* Basket */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Hood */}
      <mesh position={[0, 0.7, -0.25]}>
        <boxGeometry args={[0.5, 0.25, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export function VehicleMesh({ color }: { color: string }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.8, 0.7, 4.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.95, 0.2]}>
        <boxGeometry args={[1.6, 0.65, 2.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export default function ActorMesh({ actor, pose, onSelect }: Props) {
  const [px, py, pz] = pose.position;

  return (
    <group
      position={[px, py, pz]}
      rotation={[0, pose.yaw, 0]}
      onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
    >
      {actor.kind === 'pedestrian' && <PedestrianMesh color={actor.color} />}
      {actor.kind === 'stroller' && <StrollerMesh color={actor.color} />}
      {actor.kind === 'vehicle' && <VehicleMesh color={actor.color} />}
    </group>
  );
}
