import { Suspense, useRef, useMemo, useEffect } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as THREE from 'three';
import type { ScenarioPose } from './scenario/types';

const MTL = '/assets/car/sedan-sports.mtl';
const OBJ = '/assets/car/sedan-sports.obj';

// Suspension tuning
const ROLL_SMOOTHING  = 2.5;
const PITCH_STRENGTH  = 0.3;
const PITCH_SMOOTHING = 2.0;

// Dashcam height above the car's world origin
const DASHCAM_HEIGHT = 0.5;

// Multi-sine road-noise for the vertical (Y) axis
function roadNoiseY(t: number): number {
  return (
    Math.sin(t * 23.7) * 0.0030 +
    Math.sin(t * 47.3) * 0.0018 +
    Math.sin(t * 11.3) * 0.0015 +
    Math.sin(t * 97.1) * 0.0008
  );
}

interface Props {
  scenarioPose: ScenarioPose | null;
  rendering: boolean;
}

function Model({ scenarioPose, rendering }: Props) {
  const materials = useLoader(MTLLoader, MTL);
  const obj = useLoader(OBJLoader, OBJ, loader => {
    materials.preload();
    loader.setMaterials(materials);
  });

  const clone = useMemo(() => obj.clone(), [obj]);

  const groupRef = useRef<THREE.Group>(null);
  const bodyRef  = useRef<THREE.Group>(null);

  const timeRef    = useRef(0);
  const rollRef    = useRef(0);
  const pitchRef   = useRef(0);
  const prevPosRef = useRef<THREE.Vector3 | null>(null);

  // ── Dashcam camera ─────────────────────────────────────────────────────────
  const { set, get, size } = useThree();

  const dashCam = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(85, size.width / size.height, 0.1, 1000);
    cam.rotation.order = 'YXZ';
    return cam;
  }, []);

  useEffect(() => {
    dashCam.aspect = size.width / size.height;
    dashCam.updateProjectionMatrix();
  }, [size.width, size.height]);

  const prevCameraRef = useRef<THREE.Camera | null>(null);

  useEffect(() => {
    if (rendering) {
      timeRef.current = 0;
      prevCameraRef.current = get().camera;
      set({ camera: dashCam });
    } else {
      if (prevCameraRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set({ camera: prevCameraRef.current as any });
        prevCameraRef.current = null;
      }
    }
  }, [rendering]);

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;
    if (!scenarioPose) return;

    timeRef.current += delta;
    const time = timeRef.current;

    const [px, py, pz] = scenarioPose.position;
    const pos = new THREE.Vector3(px, py, pz);

    // Derive tangent from frame-to-frame displacement for suspension
    const prev = prevPosRef.current;
    const tangent = prev && pos.distanceTo(prev) > 0.0001
      ? pos.clone().sub(prev).normalize()
      : new THREE.Vector3(0, 0, 1);
    prevPosRef.current = pos.clone();

    groupRef.current.position.copy(pos);
    groupRef.current.rotation.y = scenarioPose.yaw;

    const targetPitch = -Math.asin(THREE.MathUtils.clamp(tangent.y, -1, 1)) * PITCH_STRENGTH;
    pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, targetPitch, delta * PITCH_SMOOTHING);
    rollRef.current  = THREE.MathUtils.lerp(rollRef.current, 0, delta * ROLL_SMOOTHING);

    const noiseY = roadNoiseY(time);
    bodyRef.current.rotation.x = pitchRef.current;
    bodyRef.current.rotation.z = rollRef.current;
    bodyRef.current.position.y = noiseY;

    if (rendering) {
      dashCam.position.set(px, py + DASHCAM_HEIGHT + noiseY, pz);
      dashCam.rotation.y = scenarioPose.yaw + Math.PI;
      dashCam.rotation.x = pitchRef.current;
      dashCam.rotation.z = -rollRef.current;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        <primitive object={clone} scale={0.3} />
      </group>
    </group>
  );
}

export default function Car({ scenarioPose, rendering }: Props) {
  return (
    <Suspense fallback={null}>
      <Model scenarioPose={scenarioPose} rendering={rendering} />
    </Suspense>
  );
}
