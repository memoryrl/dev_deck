"use client"

import { useRef, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import { MathUtils, type Group } from "three"
import { useTone, useTopologyDark } from "@/components/landing/hero-topology/topology-theme"

export const DOOR_WIDTH = 0.9
export const DOOR_HEIGHT = 1.72
const FRAME_T = 0.08
const LEAF_T = 0.05
// 바깥(-X)으로 열리는 최대 각도. 로봇이 -X 방향으로 걸어 나가며 미는 모양이 된다.
const OPEN_ANGLE = -1.75
const SWING_SPEED = 6

/**
 * 옆벽(x = 벽면, YZ 평면)에 붙는 출입문. 문짝은 -Z 쪽 모서리를 힌지로 삼아
 * `openRef` 값(0=닫힘, 1=열림)을 향해 매 프레임 감쇠 회전한다 — 안내 로봇이
 * 문 앞에 다가오면 열리고, 나간 뒤 닫힌다. 벽 자체는 씬에서 이 자리를 비워 둔다.
 */
export function TopologyDoor({
  position,
  openRef,
}: {
  position: [number, number, number]
  openRef: MutableRefObject<number>
}) {
  const tone = useTone()
  const dark = useTopologyDark()
  const leafRef = useRef<Group>(null)
  const angle = useRef(0)

  useFrame((_, delta) => {
    const leaf = leafRef.current
    if (!leaf) return
    angle.current = MathUtils.damp(angle.current, openRef.current * OPEN_ANGLE, SWING_SPEED, delta)
    leaf.rotation.y = angle.current
  })

  const half = DOOR_WIDTH / 2
  const frameColor = tone("#8a6a45")
  const leafColor = tone("#c9a173")

  return (
    <group position={position}>
      {/* 문틀 — 양쪽 기둥 + 상인방 */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, DOOR_HEIGHT / 2, side * (half + FRAME_T / 2)]}>
          <boxGeometry args={[FRAME_T + 0.04, DOOR_HEIGHT, FRAME_T]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, DOOR_HEIGHT + FRAME_T / 2, 0]}>
        <boxGeometry args={[FRAME_T + 0.04, FRAME_T, DOOR_WIDTH + FRAME_T * 2]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* 문짝 — 힌지(-Z 모서리)를 원점으로 두고 회전 */}
      <group ref={leafRef} position={[0, 0, -half]}>
        <mesh position={[0, DOOR_HEIGHT / 2, half]}>
          <boxGeometry args={[LEAF_T, DOOR_HEIGHT - 0.02, DOOR_WIDTH - 0.02]} />
          <meshStandardMaterial color={leafColor} roughness={0.55} />
        </mesh>
        {/* 손잡이 — 방 안쪽(+X) 면, 여닫는 모서리 가까이 */}
        <mesh position={[LEAF_T / 2 + 0.02, 0.92, DOOR_WIDTH - 0.14]}>
          <boxGeometry args={[0.04, 0.04, 0.12]} />
          <meshStandardMaterial color="#2a2624" roughness={0.35} metalness={0.5} />
        </mesh>
        <mesh position={[-LEAF_T / 2 - 0.02, 0.92, DOOR_WIDTH - 0.14]}>
          <boxGeometry args={[0.04, 0.04, 0.12]} />
          <meshStandardMaterial color="#2a2624" roughness={0.35} metalness={0.5} />
        </mesh>
      </group>

      {/* 비상구 표지 — 문 위 초록 등 */}
      <mesh position={[0.03, DOOR_HEIGHT + FRAME_T + 0.14, 0]}>
        <boxGeometry args={[0.03, 0.12, 0.34]} />
        <meshStandardMaterial
          color="#2f8f5c"
          emissive="#3dbf78"
          emissiveIntensity={dark ? 1.1 : 0.45}
          roughness={0.4}
        />
      </mesh>

      {/* 발판 — 문 안쪽 바닥 */}
      <mesh position={[0.42, 0.006, 0]}>
        <boxGeometry args={[0.5, 0.012, DOOR_WIDTH - 0.1]} />
        <meshStandardMaterial color={tone("#b58a5a")} roughness={0.9} />
      </mesh>
    </group>
  )
}
