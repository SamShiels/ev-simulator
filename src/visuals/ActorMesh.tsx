import type { Actor, ScenarioPose } from '../scenario/types';

interface Props {
  actor: Actor;
  pose: ScenarioPose;
  ghost?: boolean;
  onSelect?: () => void;
}

export function PedestrianMesh({ color, ghost }: { color: string; ghost?: boolean }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1.0, 8]} />
        <meshStandardMaterial color={color} transparent={ghost} opacity={ghost ? 0.4 : 1} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={color} transparent={ghost} opacity={ghost ? 0.4 : 1} />
      </mesh>
    </group>
  );
}

export function StrollerMesh({ color, ghost }: { color: string; ghost?: boolean }) {
  return (
    <group>
      {/* Basket */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.8]} />
        <meshStandardMaterial color={color} transparent={ghost} opacity={ghost ? 0.4 : 1} />
      </mesh>
      {/* Hood */}
      <mesh position={[0, 0.7, -0.25]}>
        <boxGeometry args={[0.5, 0.25, 0.3]} />
        <meshStandardMaterial color={color} transparent={ghost} opacity={ghost ? 0.4 : 1} />
      </mesh>
    </group>
  );
}

export function VehicleMesh({ color, ghost }: { color: string; ghost?: boolean }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.8, 0.7, 4.2]} />
        <meshStandardMaterial color={color} transparent={ghost} opacity={ghost ? 0.4 : 1} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.95, 0.2]}>
        <boxGeometry args={[1.6, 0.65, 2.2]} />
        <meshStandardMaterial color={color} transparent={ghost} opacity={ghost ? 0.4 : 1} />
      </mesh>
    </group>
  );
}

export default function ActorMesh({ actor, pose, ghost, onSelect }: Props) {
  const [px, py, pz] = pose.position;

  return (
    <group
      position={[px, py, pz]}
      rotation={[0, pose.yaw, 0]}
      onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
    >
      {actor.kind === 'pedestrian' && <PedestrianMesh color={actor.color} ghost={ghost} />}
      {actor.kind === 'stroller' && <StrollerMesh color={actor.color} ghost={ghost} />}
      {actor.kind === 'vehicle' && <VehicleMesh color={actor.color} ghost={ghost} />}
    </group>
  );
}
