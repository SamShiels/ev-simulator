import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RenderPass } from '../App';

export function useDepthPass(renderPass: RenderPass): void {
  const { scene, camera } = useThree();
  const materialRef = useRef<THREE.MeshDepthMaterial | null>(null);

  useEffect(() => {
    if (renderPass === 'depth') {
      materialRef.current ??= new THREE.MeshDepthMaterial();
      scene.overrideMaterial = materialRef.current;
      camera.far = 200;
      camera.updateProjectionMatrix();
    } else {
      scene.overrideMaterial = null;
      camera.far = 2000;
      camera.updateProjectionMatrix();
    }

    return () => {
      scene.overrideMaterial = null;
      camera.far = 2000;
      camera.updateProjectionMatrix();
    };
  }, [renderPass, scene]);
}
