"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type { Group, Object3D, SpotLight } from "three"
import { useTone, useTopologyDark } from "@/components/landing/hero-topology/topology-theme"

// 로보락 S10 MaxV류 — 낮고 넓은 원반형 바디 + 앞쪽 가장자리에 살짝 튀어나온
// 라이다 터렛. 실사 모델 대신 저폴리 프리미티브 조합으로, 이 씬의 다른 오브젝트와
// 같은 톤(무광 플라스틱)을 맞춘다.
const BODY_RADIUS = 0.16
const BODY_HEIGHT = 0.075
const TURRET_RADIUS = 0.036
const TURRET_HEIGHT = 0.045
const PATROL_INSET = 0.5
const SPEED = 0.5 // 월드 유닛/초 — 방 둘레를 도는 속도
const AVOID_CLEARANCE = 0.1 // 장애물 반경 밖으로 추가로 더 확보하는 여유 간격

export type VacuumObstacle = { x: number; z: number; radius: number }

export function TopologyRobotVacuum({
  floorMinX,
  floorWidth,
  floorMinZ,
  floorDepth,
  obstacles = [],
}: {
  floorMinX: number
  floorWidth: number
  floorMinZ: number
  floorDepth: number
  obstacles?: VacuumObstacle[]
}) {
  const tone = useTone()
  const dark = useTopologyDark()
  const groupRef = useRef<Group>(null)
  const headlightRef = useRef<SpotLight>(null)
  const headlightTarget = useRef<Object3D>(null)

  // 스포트라이트의 target은 기본이 월드 원점이라, 청소기 그룹 안의 빈 오브젝트로 바꿔 줘야
  // 진행방향을 따라 빛이 같이 돈다.
  useEffect(() => {
    const light = headlightRef.current
    const target = headlightTarget.current
    if (light && target) light.target = target
  }, [dark])
  const prevPos = useRef<{ x: number; z: number } | null>(null)

  // 벽 안쪽 테두리를 따라 도는 사각 순찰 경로 — 방 크기(모듈 수)에 맞춰 매번
  // 다시 계산된다. 바닥 벽 두께(PATROL_INSET)만큼 안쪽으로 들어와 있어서 책상
  // 구역(ROOM_MARGIN=1.8)과는 절대 겹치지 않는다.
  const bounds = useMemo(() => {
    const x0 = floorMinX + PATROL_INSET
    const x1 = floorMinX + floorWidth - PATROL_INSET
    const z0 = floorMinZ + PATROL_INSET
    const z1 = floorMinZ + floorDepth - PATROL_INSET
    return { x0, x1, z0, z1, dx: Math.max(x1 - x0, 0.01), dz: Math.max(z1 - z0, 0.01) }
  }, [floorMinX, floorWidth, floorMinZ, floorDepth])

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const { x0, x1, z0, z1, dx, dz } = bounds
    const perimeter = 2 * (dx + dz)
    const t = ((clock.elapsedTime * SPEED) % perimeter + perimeter) % perimeter

    let x: number
    let z: number
    let dirX: number
    let dirZ: number
    if (t < dx) {
      x = x0 + t
      z = z0
      dirX = 1
      dirZ = 0
    } else if (t < dx + dz) {
      const s = t - dx
      x = x1
      z = z0 + s
      dirX = 0
      dirZ = 1
    } else if (t < dx + dz + dx) {
      const s = t - dx - dz
      x = x1 - s
      z = z1
      dirX = -1
      dirZ = 0
    } else {
      const s = t - dx - dz - dx
      x = x0
      z = z1 - s
      dirX = 0
      dirZ = -1
    }

    // 장애물 회피 — 순찰 경로상의 이상적인 지점이 장애물(공기청정기·식물·책장 등)
    // 반경 안으로 들어오면 그만큼 바깥으로 밀어내서 살짝 우회하는 곡선을 그린다.
    // 여러 장애물이 겹치면 밀어내는 벡터를 누적한다.
    for (const obs of obstacles) {
      const ox = x - obs.x
      const oz = z - obs.z
      const dist = Math.hypot(ox, oz)
      const desired = obs.radius + BODY_RADIUS + AVOID_CLEARANCE
      if (dist > 0 && dist < desired) {
        const push = desired - dist
        x += (ox / dist) * push
        z += (oz / dist) * push
      }
    }

    group.position.set(x, BODY_HEIGHT / 2 + 0.01, z)

    // 회피로 곡선을 그릴 때도 자연스럽게 돌도록, 이상 경로 방향 대신 실제
    // 이동 벡터(전 프레임 위치와의 차)로 진행방향을 구한다. 첫 프레임이나 거의
    // 정지 상태일 때만 이상 경로 방향으로 대체한다.
    let rotationY = Math.atan2(dirX, dirZ)
    if (prevPos.current) {
      const vx = x - prevPos.current.x
      const vz = z - prevPos.current.z
      if (vx * vx + vz * vz > 1e-7) rotationY = Math.atan2(vx, vz)
    }
    prevPos.current = { x, z }
    group.rotation.y = rotationY
  })

  return (
    <group ref={groupRef}>
      {/* 바디 */}
      <mesh>
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS, BODY_HEIGHT, 32]} />
        <meshStandardMaterial color={tone("#2a2a2e")} roughness={0.38} metalness={0.12} />
      </mesh>
      {/* 범퍼 하단 림 */}
      <mesh position={[0, -BODY_HEIGHT / 2 - 0.008, 0]}>
        <cylinderGeometry args={[BODY_RADIUS + 0.006, BODY_RADIUS + 0.006, 0.014, 32]} />
        <meshStandardMaterial color={tone("#151517")} roughness={0.6} />
      </mesh>
      {/* 상판 광택 림 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, BODY_HEIGHT / 2 + 0.001, 0]}>
        <ringGeometry args={[BODY_RADIUS - 0.012, BODY_RADIUS - 0.002, 32]} />
        <meshStandardMaterial color={tone("#57575e")} roughness={0.2} metalness={0.6} />
      </mesh>
      {/* 라이다 터렛 — 진행방향(+Z) 쪽에 살짝 치우쳐 배치 */}
      <mesh position={[0, BODY_HEIGHT / 2 + TURRET_HEIGHT / 2, BODY_RADIUS * 0.45]}>
        <cylinderGeometry args={[TURRET_RADIUS, TURRET_RADIUS, TURRET_HEIGHT, 20]} />
        <meshStandardMaterial color={tone("#141416")} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* 카메라 렌즈 포인트 */}
      <mesh position={[0, BODY_HEIGHT / 2 + TURRET_HEIGHT / 2, BODY_RADIUS * 0.45 + TURRET_RADIUS + 0.001]}>
        <circleGeometry args={[0.012, 12]} />
        <meshStandardMaterial color="#2ee6ff" emissive="#2ee6ff" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>
      {/* 상태등 — 위에서 보이도록 상판에 눕혀 배치 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BODY_HEIGHT / 2 + 0.002, -BODY_RADIUS * 0.4]}>
        <circleGeometry args={[0.016, 12]} />
        <meshStandardMaterial color="#43e08a" emissive="#43e08a" emissiveIntensity={0.7} />
      </mesh>
      {/* 다크 모드 전조등 — 진행방향(+Z) 바닥을 비스듬히 비춘다 */}
      {dark ? (
        <>
          <mesh position={[-0.055, 0, BODY_RADIUS - 0.004]} rotation={[0, 0, 0]}>
            <circleGeometry args={[0.014, 12]} />
            <meshBasicMaterial color="#fff6dc" />
          </mesh>
          <mesh position={[0.055, 0, BODY_RADIUS - 0.004]}>
            <circleGeometry args={[0.014, 12]} />
            <meshBasicMaterial color="#fff6dc" />
          </mesh>
          <spotLight
            ref={headlightRef}
            position={[0, 0.02, BODY_RADIUS]}
            color="#fff1cf"
            intensity={4}
            distance={3}
            angle={0.55}
            penumbra={0.85}
            decay={1.6}
          />
          <object3D ref={headlightTarget} position={[0, -0.06, 1.4]} />
        </>
      ) : null}
    </group>
  )
}
