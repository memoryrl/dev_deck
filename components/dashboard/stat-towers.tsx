"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Html, OrbitControls, RoundedBox, Sparkles } from "@react-three/drei"
import type { Group } from "three"

export type TowerItem = { label: string; value: number }

// 사이트 팔레트(champagne·cognac) + 차트와 맞춘 보조색
const COLORS = ["#d8b98a", "#9a7550", "#7d9a8c", "#6b86a8", "#b9805f"]

function Tower({ item, index, count, max }: { item: TowerItem; index: number; count: number; max: number }) {
  const grow = useRef<Group>(null)
  // 값이 0이어도 바닥 받침은 보이게 최소 높이를 둔다. 제곱근 스케일로 큰 값이 작은 값을 지우지 않게.
  const height = 0.35 + 2.4 * Math.sqrt(item.value / max)
  const angle = (index / count) * Math.PI * 2
  const x = Math.cos(angle) * 2.5
  const z = Math.sin(angle) * 2.5

  useFrame(({ clock }, dt) => {
    const g = grow.current
    if (!g) return
    // 마운트 후 index 순서로 하나씩 솟아오른다.
    const start = 0.15 * index
    if (clock.elapsedTime < start) return
    g.scale.y += (1 - g.scale.y) * Math.min(1, dt * 3)
  })

  return (
    <group position={[x, 0, z]}>
      <group ref={grow} scale={[1, 0.001, 1]}>
        <RoundedBox args={[0.9, height, 0.9]} radius={0.12} smoothness={4} position={[0, height / 2, 0]}>
          <meshStandardMaterial color={COLORS[index % COLORS.length]} metalness={0.55} roughness={0.28} />
        </RoundedBox>
      </group>
      <Html position={[0, height + 0.55, 0]} center distanceFactor={9} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap text-center font-display leading-tight text-white drop-shadow">
          <div className="text-lg font-bold tabular-nums">{item.value.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/70">{item.label}</div>
        </div>
      </Html>
    </group>
  )
}

function Stage({ items }: { items: TowerItem[] }) {
  const max = useMemo(() => Math.max(1, ...items.map((i) => i.value)), [items])
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={2.2} />
      <pointLight position={[-4, 3, -4]} intensity={30} color="#d8b98a" />
      {items.map((item, i) => (
        <Tower key={item.label} item={item} index={i} count={items.length} max={max} />
      ))}
      {/* 바닥 링 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[1.4, 3.6, 96]} />
        <meshBasicMaterial color="#d8b98a" transparent opacity={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[3.55, 3.6, 96]} />
        <meshBasicMaterial color="#d8b98a" transparent opacity={0.5} />
      </mesh>
      {/* 중앙 보석 */}
      <mesh position={[0, 1.2, 0]}>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color="#f3ead9" metalness={0.8} roughness={0.15} wireframe />
      </mesh>
      <Sparkles count={60} scale={[9, 4, 9]} position={[0, 1.8, 0]} size={2.4} speed={0.35} color="#f3ead9" />
    </>
  )
}

export default function StatTowers({ items }: { items: TowerItem[] }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 4.2, 8.2], fov: 38 }} gl={{ alpha: true, antialias: true }}>
      <Stage items={items} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!window.matchMedia("(prefers-reduced-motion: reduce)").matches}
        autoRotateSpeed={0.8}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 1, 0]}
      />
    </Canvas>
  )
}
