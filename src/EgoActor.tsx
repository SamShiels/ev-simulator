import Car from './Car';
import { useActorAdvance } from './hooks/useActorAdvance';
import type { WaypointTrack, ActorStats } from './scenario/types';

interface Props {
  track: WaypointTrack;
  stats: ActorStats;
  rendering: boolean;
}

export default function EgoActor({ track, stats, rendering }: Props) {
  const poseRef = useActorAdvance(track, stats.accel, stats.brake, stats.topSpeed, 'EgoActor', true);
  return <Car poseRef={poseRef} rendering={rendering} />;
}
