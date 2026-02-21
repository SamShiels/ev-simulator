import { Suspense, useRef, useMemo, useEffect } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as THREE from 'three';

const MTL = '/assets/car/sedan-sports.mtl';
const OBJ = '/assets/car/sedan-sports.obj';

// World units per second along the curve
const SPEED = 6;

// 1. Suspension roll / pitch tuning
const ROLL_STRENGTH = 0.001;   // radians of body roll per unit of signed curvature
const ROLL_SMOOTHING = 2.5;   // lerp rate — lower = heavier, slower suspension lag
const PITCH_STRENGTH = 0.3;   // fraction of road gradient expressed as body pitch
const PITCH_SMOOTHING = 2.0;

// 2. Lateral lane-wander tuning
const DRIFT_AMPLITUDE = 0.1; // max lateral offset in world units
const DRIFT_FREQUENCY = 0.28; // cycles per second of the wander sine wave

// 3. Corner speed tuning
const LOOK_AHEAD      = 0.01;  // fraction of curve to look ahead when anticipating corners
const CORNER_SLOWDOWN = 0.02;  // speed reduction per unit of curvature magnitude
const MIN_SPEED_FACTOR = 0.35; // never drop below this fraction of SPEED
const SPEED_BRAKE     = 5.0;   // lerp rate when decelerating (fast — commit to the corner)
const SPEED_ACCEL     = 1.8;   // lerp rate when accelerating (slow — gradual power-on)

// Dashcam height above the car's world origin
const DASHCAM_HEIGHT = 0.5;

// Reused across frames to avoid per-frame allocation
const _cross = new THREE.Vector3();

interface Props {
  curve: THREE.Curve<THREE.Vector3> | null;
  playing: boolean;
  rendering: boolean;
  onRenderComplete: () => void;
}

/**
 * Multi-sine road-noise for the vertical (Y) axis.
 * Incommensurate frequencies prevent any visible periodicity.
 * Amplitude is barely perceptible — just enough for a natural "buzz".
 */
function roadNoiseY(t: number): number {
  return (
    Math.sin(t * 23.7) * 0.0030 +
    Math.sin(t * 47.3) * 0.0018 +
    Math.sin(t * 11.3) * 0.0015 +
    Math.sin(t * 97.1) * 0.0008
  );
}

function Model({ curve, playing, rendering, onRenderComplete }: Props) {
  const materials = useLoader(MTLLoader, MTL);
  const obj = useLoader(OBJLoader, OBJ, loader => {
    materials.preload();
    loader.setMaterials(materials);
  });

  // Clone once so the cached loader object isn't mutated by the scene graph
  const clone = useMemo(() => obj.clone(), [obj]);

  const groupRef = useRef<THREE.Group>(null); // world position + Y yaw
  const bodyRef  = useRef<THREE.Group>(null); // local pitch / roll / noise-Y

  const tRef     = useRef(0);
  const timeRef  = useRef(0);
  const rollRef  = useRef(0);
  const pitchRef = useRef(0);
  const speedRef = useRef(SPEED);

  // ── Dashcam camera ─────────────────────────────────────────────────────────
  const { set, get, size } = useThree();

  const dashCam = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(85, size.width / size.height, 0.1, 1000);
    // 'YXZ' order: yaw first, then pitch, then roll — standard for a vehicle camera
    cam.rotation.order = 'YXZ';
    return cam;
  }, []);

  // Keep aspect ratio in sync with canvas size
  useEffect(() => {
    dashCam.aspect = size.width / size.height;
    dashCam.updateProjectionMatrix();
  }, [size.width, size.height]);

  const prevCameraRef = useRef<THREE.Camera | null>(null);

  useEffect(() => {
    if (rendering) {
      tRef.current  = 0;
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
    if (!curve || !groupRef.current || !bodyRef.current) return;

    const isActive = playing || rendering;
    if (!isActive) {
      tRef.current = 0;
      return;
    }

    const len = curve.getLength();

    // ── Corner speed: sample curvature at look-ahead before advancing t ──────
    const eps = 0.002;
    const tLook      = (tRef.current + LOOK_AHEAD) % 1;
    const tanLook    = curve.getTangent(tLook);
    const tanLookFwd = curve.getTangent((tLook + eps) % 1);
    _cross.crossVectors(tanLook, tanLookFwd);
    const lookCurvature  = Math.abs(_cross.y) / eps;
    const targetSpeedFactor = Math.max(MIN_SPEED_FACTOR, 1 - lookCurvature * CORNER_SLOWDOWN);
    const targetSpeed = SPEED * targetSpeedFactor;
    const lerpRate = targetSpeed < speedRef.current ? SPEED_BRAKE : SPEED_ACCEL;
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, targetSpeed, delta * lerpRate);

    // Advance t — rendering stops at the end of the road instead of looping
    const step = (speedRef.current / len) * delta;

    if (rendering) {
      if (tRef.current + step >= 1) {
        onRenderComplete();
        return;
      }
      tRef.current += step;
    } else {
      tRef.current = (tRef.current + step) % 1;
    }

    timeRef.current += delta;

    const t    = tRef.current;
    const time = timeRef.current;

    // ── Position & heading ──────────────────────────────────────────────────
    const pos     = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    // Right vector perpendicular to travel direction in the XZ plane
    // Equivalent to worldUp × tangent (normalized since tangent is a unit vector)
    const right = new THREE.Vector3(tangent.z, 0, -tangent.x);

    // 3. Imperfect steering — slow sine wave lateral drift within the lane
    const lateralDrift = Math.sin(time * Math.PI * 2 * DRIFT_FREQUENCY) * DRIFT_AMPLITUDE;
    pos.addScaledVector(right, lateralDrift);

    groupRef.current.position.copy(pos);
    // atan2(x, z) gives the Y rotation for a model that faces +Z by default
    groupRef.current.rotation.y = Math.atan2(tangent.x, tangent.z);

    // ── 1. Suspension roll from spline curvature ────────────────────────────
    const nextTangent = curve.getTangent((t + eps) % 1);
    _cross.crossVectors(tangent, nextTangent);

    // cross.y is positive for a left turn, negative for a right turn.
    // Dividing by eps converts the raw cross product magnitude to an angular rate.
    const signedCurvature = _cross.y / eps;

    // The body leans opposite to centripetal acceleration (suspension inertia).
    const targetRoll = signedCurvature * ROLL_STRENGTH;
    rollRef.current = THREE.MathUtils.lerp(rollRef.current, targetRoll, delta * ROLL_SMOOTHING);

    // Pitch from road gradient (zero on the flat demo track; ready for elevation)
    const targetPitch = -Math.asin(THREE.MathUtils.clamp(tangent.y, -1, 1)) * PITCH_STRENGTH;
    pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, targetPitch, delta * PITCH_SMOOTHING);

    // ── 2. Road-noise micro-vibration on the vertical axis ──────────────────
    const noiseY = roadNoiseY(time);

    // Apply pitch, roll, and noise to the inner body group (car-local frame)
    bodyRef.current.rotation.x = pitchRef.current;
    bodyRef.current.rotation.z = rollRef.current;
    bodyRef.current.position.y = noiseY;

    // ── Dashcam: position and orient in world space ─────────────────────────
    if (rendering) {
      dashCam.position.set(pos.x, pos.y + DASHCAM_HEIGHT + noiseY, pos.z);
      // +π flips the default -Z look direction to +Z (car forward)
      dashCam.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI;
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

export default function Car({ curve, playing, rendering, onRenderComplete }: Props) {
  return (
    <Suspense fallback={null}>
      <Model curve={curve} playing={playing} rendering={rendering} onRenderComplete={onRenderComplete} />
    </Suspense>
  );
}
