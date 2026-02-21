import { useMemo } from 'react'
import * as THREE from 'three'

export default function CurveLine({ curve }: { curve: THREE.CatmullRomCurve3 | null }) {
  const line = useMemo(() => {
    if (!curve) return null
    const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(300))
    const mat = new THREE.LineBasicMaterial({ color: '#00ddff' })
    return new THREE.Line(geom, mat)
  }, [curve])

  return line ? <primitive object={line} position={[0, 0.05, 0]} /> : null
}
