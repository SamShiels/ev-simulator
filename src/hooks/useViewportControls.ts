import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

interface ViewportControlOptions {
  gl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  enabled?: boolean;
  onGroundClick?: (worldPos: THREE.Vector3, e: MouseEvent) => void;
  onGroundMove?: (worldPos: THREE.Vector3 | null, e: PointerEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
}

export function useViewportControls({
  gl,
  camera,
  enabled = true,
  onGroundClick,
  onGroundMove,
  onContextMenu,
  onKeyDown,
  onKeyUp,
}: ViewportControlOptions) {
  // Use refs for callbacks so event listeners don't need re-binding
  const callbacks = useRef({ onGroundClick, onGroundMove, onContextMenu, onKeyDown, onKeyUp });
  callbacks.current = { onGroundClick, onGroundMove, onContextMenu, onKeyDown, onKeyUp };

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;
    const rc = new THREE.Raycaster();
    const hit = new THREE.Vector3();
    
    // Panning state
    const prevPtr = { x: 0, y: 0 };
    const downPtr = { x: 0, y: 0 };
    const rightVec = new THREE.Vector3();
    const screenUpVec = new THREE.Vector3();

    function getGroundIntersection(e: MouseEvent | PointerEvent): THREE.Vector3 | null {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      rc.setFromCamera(ndc, camera);
      return rc.ray.intersectPlane(GROUND, hit) ? hit : null;
    }

    const onPointerDown = (e: PointerEvent) => {
      downPtr.x = e.clientX;
      downPtr.y = e.clientY;
      prevPtr.x = e.clientX;
      prevPtr.y = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.altKey && (e.buttons & 1)) {
        // Handle Camera Panning
        const dx = e.clientX - prevPtr.x;
        const dy = e.clientY - prevPtr.y;
        const speed = 1 / camera.zoom;
        rightVec.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
        screenUpVec.setFromMatrixColumn(camera.matrixWorld, 1).setY(0).normalize();
        camera.position.addScaledVector(rightVec, -dx * speed);
        camera.position.addScaledVector(screenUpVec, dy * speed);
        
        if (callbacks.current.onGroundMove) callbacks.current.onGroundMove(null, e);
      } else {
        // Handle Normal Pointer Move
        const intersection = getGroundIntersection(e);
        if (callbacks.current.onGroundMove) callbacks.current.onGroundMove(intersection, e);
      }
      
      prevPtr.x = e.clientX;
      prevPtr.y = e.clientY;
    };

    const onClick = (e: MouseEvent) => {
      if (e.altKey) return;
      
      // Prevent click if we were dragging
      const dx = e.clientX - downPtr.x;
      const dy = e.clientY - downPtr.y;
      if (dx * dx + dy * dy > 25) return; 

      const intersection = getGroundIntersection(e);
      if (intersection && callbacks.current.onGroundClick) {
        callbacks.current.onGroundClick(intersection, e);
      }
    };

    const onContext = (e: MouseEvent) => {
      if (callbacks.current.onContextMenu) callbacks.current.onContextMenu(e);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      camera.zoom = Math.max(15, Math.min(300, camera.zoom * factor));
      camera.updateProjectionMatrix();
    };

    const onKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        e.preventDefault();
        canvas.style.cursor = 'grab';
        if (callbacks.current.onGroundMove) callbacks.current.onGroundMove(null, new PointerEvent('pointermove'));
      }
      if (callbacks.current.onKeyDown) callbacks.current.onKeyDown(e);
    };

    const onKeyUpGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Alt') canvas.style.cursor = '';
      if (callbacks.current.onKeyUp) callbacks.current.onKeyUp(e);
    };

    const onPointerLeave = (e: PointerEvent) => {
      if (callbacks.current.onGroundMove) callbacks.current.onGroundMove(null, e);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onContext);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDownGlobal);
    window.addEventListener('keyup', onKeyUpGlobal);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDownGlobal);
      window.removeEventListener('keyup', onKeyUpGlobal);
    };
  }, [enabled, gl, camera]);
}