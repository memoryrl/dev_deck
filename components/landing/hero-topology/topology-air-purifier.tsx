"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { DoubleSide, MathUtils, type Group, type Mesh, type MeshBasicMaterial } from "three"
import { useTone } from "@/components/landing/hero-topology/topology-theme"

// LG 퓨리케어 360 — 흰색 원통 타워 위에 검정 팬 헤드(회전 그릴+블레이드)가 얹힌
// 실루엣. 바디는 고정, 헤드만 useFrame으로 계속 회전시켜 "위쪽만 돈다"를
// 표현하고, 헤드 위로는 바람이 퍼지며 올라가는 원형 파동을 얹어 송풍 중임을
// 보여준다.
const FOOT_H = 0.05
const FOOT_R = 0.145
const BODY_H = 0.56
const BODY_R_TOP = 0.125
const BODY_R_BOTTOM = 0.145
const HEAD_R = 0.155
const HEAD_H = 0.075
const BLADE_COUNT = 5
const HEAD_SPIN_SPEED = 0.6 // rad/s

const RING_COUNT = 3
const RING_RISE = 0.32
const RING_START_SCALE = 0.34
const RING_END_SCALE = 1.2
const RING_CYCLE = 2.4 // 링 하나가 한 바퀴 도는 데 걸리는 시간(초)
const RING_MAX_OPACITY = 0.38

function FanBlades() {
  const tone = useTone()
  const angles = useMemo(
    () => Array.from({ length: BLADE_COUNT }, (_, i) => (i / BLADE_COUNT) * Math.PI * 2),
    []
  )
  return (
    <>
      {angles.map((angle, i) => (
        <group key={i} rotation={[0, angle, 0]}>
          <mesh position={[HEAD_R * 0.5, HEAD_H * 0.4, 0]} rotation={[0.22, 0, 0.2]}>
            <boxGeometry args={[HEAD_R * 0.8, 0.01, 0.045]} />
            <meshStandardMaterial color={tone("#0c0c0e")} roughness={0.35} metalness={0.35} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// 헤드 위로 퍼지며 올라가는 바람 파동 — 위치·스케일·투명도를 매 프레임 직접
// 갱신한다(리액트 state로 하면 프레임마다 리렌더가 걸려 훨씬 비싸다).
function AirflowRings({ baseY }: { baseY: number }) {
  const tone = useTone()
  const refs = useRef<(Mesh | null)[]>([])

  useFrame(({ clock }) => {
    for (let i = 0; i < RING_COUNT; i++) {
      const mesh = refs.current[i]
      if (!mesh) continue
      const offset = (i / RING_COUNT) * RING_CYCLE
      const phase = ((clock.elapsedTime + offset) % RING_CYCLE) / RING_CYCLE
      const scale = MathUtils.lerp(RING_START_SCALE, RING_END_SCALE, phase)
      mesh.position.y = baseY + phase * RING_RISE
      mesh.scale.set(scale, scale, scale)
      const mat = mesh.material as MeshBasicMaterial
      mat.opacity = RING_MAX_OPACITY * (1 - phase)
    }
  })

  return (
    <>
      {Array.from({ length: RING_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, baseY, 0]}
        >
          <ringGeometry args={[HEAD_R * 0.55, HEAD_R * 0.74, 28]} />
          <meshBasicMaterial color={tone("#eaf6ff")} transparent opacity={0} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </>
  )
}

export function TopologyAirPurifier({ position }: { position: [number, number, number] }) {
  const tone = useTone()
  const headRef = useRef<Group>(null)
  const bodyTopY = FOOT_H + BODY_H
  const headCenterY = bodyTopY + HEAD_H / 2

  useFrame((_, delta) => {
    if (headRef.current) headRef.current.rotation.y += HEAD_SPIN_SPEED * delta
  })

  return (
    <group position={position}>
      {/* 바닥 받침 링 */}
      <mesh position={[0, FOOT_H / 2, 0]}>
        <cylinderGeometry args={[FOOT_R, FOOT_R + 0.01, FOOT_H, 24]} />
        <meshStandardMaterial color={tone("#2a2a2c")} roughness={0.5} />
      </mesh>
      {/* 흰색 타워 바디 */}
      <mesh position={[0, FOOT_H + BODY_H / 2, 0]}>
        <cylinderGeometry args={[BODY_R_TOP, BODY_R_BOTTOM, BODY_H, 28]} />
        <meshStandardMaterial color={tone("#f4f2ec")} roughness={0.3} metalness={0.03} />
      </mesh>
      {/* 목 트림 — 바디와 헤드 경계선 */}
      <mesh position={[0, bodyTopY, 0]}>
        <cylinderGeometry args={[BODY_R_TOP + 0.004, BODY_R_TOP + 0.004, 0.012, 28]} />
        <meshStandardMaterial color={tone("#1c1c1e")} roughness={0.4} />
      </mesh>

      {/* 회전 헤드 — 원반 그릴 + 팬 블레이드 + 중심 허브 */}
      <group ref={headRef} position={[0, headCenterY, 0]}>
        <mesh>
          <cylinderGeometry args={[HEAD_R, HEAD_R * 0.94, HEAD_H, 28]} />
          <meshStandardMaterial color={tone("#17171a")} roughness={0.32} metalness={0.25} />
        </mesh>
        {/* 그릴 홈 — 상판을 살짝 파인 것처럼 보이게 */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HEAD_H / 2 + 0.001, 0]}>
          <ringGeometry args={[HEAD_R * 0.3, HEAD_R * 0.92, 32]} />
          <meshStandardMaterial color={tone("#0a0a0b")} roughness={0.5} side={DoubleSide} />
        </mesh>
        <FanBlades />
        {/* 중심 허브 */}
        <mesh position={[0, HEAD_H / 2 + 0.006, 0]}>
          <cylinderGeometry args={[HEAD_R * 0.16, HEAD_R * 0.16, 0.02, 16]} />
          <meshStandardMaterial color={tone("#2a2a2d")} roughness={0.25} metalness={0.4} />
        </mesh>
      </group>

      <AirflowRings baseY={headCenterY + HEAD_H / 2 + 0.02} />
    </group>
  )
}
