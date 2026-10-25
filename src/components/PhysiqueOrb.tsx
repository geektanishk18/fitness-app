import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere } from '@react-three/drei'
import { useRef } from 'react'
import type { Mesh } from 'three'

function Orb() {
  const ref = useRef<Mesh>(null)
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.12 })
  return (
    <group ref={ref}>
      <Sphere args={[1.5, 32, 32]} scale={[0.78, 1.18, 0.5]}>
        <meshStandardMaterial color="#c9f36a" roughness={0.55} metalness={0.12} wireframe />
      </Sphere>
      <Sphere args={[0.8, 24, 24]} scale={[1.35, 0.52, 0.65]} position={[0, 0.38, 0]}>
        <meshStandardMaterial color="#d9ff8f" roughness={0.55} metalness={0.1} wireframe />
      </Sphere>
    </group>
  )
}

export function PhysiqueOrb() {
  return <div className="orb-wrap" aria-label="Abstract physique focus visual"><Canvas camera={{ position: [0, 0, 5] }} dpr={[1, 1.5]}><ambientLight intensity={1.6} /><pointLight position={[3, 2, 4]} intensity={8} color="#d7ff77" /><Orb /><OrbitControls enableZoom={false} enablePan={false} autoRotate={false} /></Canvas></div>
}
