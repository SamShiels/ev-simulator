import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RenderPass } from '../App';

export function useDepthPass(renderPass: RenderPass): void {
  const { scene } = useThree();
  const materialRef = useRef<THREE.MeshDepthMaterial | null>(null);

  useEffect(() => {
    if (renderPass === 'depth') {
      materialRef.current ??= new THREE.MeshDepthMaterial();
      scene.overrideMaterial = materialRef.current;
    } else {
      scene.overrideMaterial = null;
    }

    return () => { scene.overrideMaterial = null; };
  }, [renderPass, scene]);
}
