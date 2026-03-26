import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

const GRID_SIZE = 200;
const GRID_DIVISIONS = 80;
const LINE_COLOR = '#2a2a2a';
const ACCENT_COLOR = '#333';
const BG_COLOR = '#111';

function createGridTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  const step = size / GRID_DIVISIONS;

  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_DIVISIONS; i++) {
    const pos = i * step;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  const accentEvery = 10;
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = 2;
  for (let i = 0; i <= GRID_DIVISIONS; i += accentEvery) {
    const pos = i * step;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default function GridSkybox() {
  const { scene } = useThree();

  const materials = useMemo(() => {
    const texture = createGridTexture();
    scene.background = new THREE.Color(BG_COLOR);

    return Array.from({ length: 6 }, () =>
      new THREE.MeshBasicMaterial({
        map: texture.clone(),
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
  }, [scene]);

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <boxGeometry args={[GRID_SIZE, GRID_SIZE, GRID_SIZE]} />
      {materials.map((mat, i) => (
        <primitive key={i} object={mat} attach={`material-${i}`} />
      ))}
    </mesh>
  );
}
