import { useEffect } from 'react';
import * as THREE from 'three';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

interface Options {
  gl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  enabled: boolean;
  scenarioTime: number;
  selectedActorId: string;
  onAddWaypoint: (actorId: string, time: number, position: [number, number, number]) => void;
  onScenarioTimeChange: (t: number) => void;
}

export function useScenarioMouseControls({
  gl,
  camera,
  enabled,
  scenarioTime,
  selectedActorId,
  onAddWaypoint,
  onScenarioTimeChange,
}: Options) {
  // Keep stable refs so the event listeners don't re-register on every render
  const refs = {
    scenarioTime: { current: scenarioTime },
    selectedActorId: { current: selectedActorId },
    onAddWaypoint: { current: onAddWaypoint },
    onScenarioTimeChange: { current: onScenarioTimeChange },
  };
  refs.scenarioTime.current = scenarioTime;
  refs.selectedActorId.current = selectedActorId;
  refs.onAddWaypoint.current = onAddWaypoint;
  refs.onScenarioTimeChange.current = onScenarioTimeChange;

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;
    const rc = new THREE.Raycaster();
    const hit = new THREE.Vector3();
    const prevPtr = { x: 0, y: 0 };
    const rightVec = new THREE.Vector3();
    const screenUpVec = new THREE.Vector3();

    function toWorld(e: MouseEvent | PointerEvent): [number, number, number] | null {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      rc.setFromCamera(ndc, camera);
      return rc.ray.intersectPlane(GROUND, hit)
        ? [hit.x, 0, hit.z]
        : null;
    }

    const onMove = (e: PointerEvent) => {
      const prev = { ...prevPtr };
      prevPtr.x = e.clientX;
      prevPtr.y = e.clientY;

      if (e.altKey && (e.buttons & 1)) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        const speed = 1 / camera.zoom;
        rightVec.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
        screenUpVec.setFromMatrixColumn(camera.matrixWorld, 1).setY(0).normalize();
        camera.position.addScaledVector(rightVec, -dx * speed);
        camera.position.addScaledVector(screenUpVec, dy * speed);
      }
    };

    const onClick = (e: MouseEvent) => {
      if (e.altKey) return;
      const p = toWorld(e);
      if (!p) return;
      refs.onAddWaypoint.current(
        refs.selectedActorId.current,
        refs.scenarioTime.current,
        p,
      );
    };

    const onContext = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      camera.zoom = Math.max(15, Math.min(300, camera.zoom * factor));
      camera.updateProjectionMatrix();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        e.preventDefault();
        canvas.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') canvas.style.cursor = '';
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onContext);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [enabled, gl, camera]);
}
