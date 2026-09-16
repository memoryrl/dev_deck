"use client"

import { Html } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { Lock } from "lucide-react"
import type { Vector3 } from "three"
import { useI18n } from "@/components/i18n/i18n-provider"
import { TopologyRobot } from "@/components/landing/hero-topology/topology-robot"
import type { TopologyModuleNode } from "@/lib/landing/topology"

function legOffsets(halfWidth: number): [number, number][] {
  const dx = halfWidth - 0.12
  return [
    [-dx, -0.4],
    [dx, -0.4],
    [-dx, 0.4],
    [dx, 0.4],
  ]
}

const SEAT_HEIGHT = 0.5
const SEAT_THICKNESS = 0.06
const SEAT_RADIUS = 0.22

// 요청사항: "책상에 로봇이 떠있는 모습이 부자연스러우니 등받이 없는 의자 위에
// 서 있게 하자" — 좌석면을 로봇 발 높이(SEAT_HEIGHT)에 맞춰 두고 다리 3개로
// 바닥까지 받친다(등받이 없는 스툴).
function Stool() {
  const legHeight = SEAT_HEIGHT - SEAT_THICKNESS / 2
  const legRadius = SEAT_RADIUS - 0.05
  const legs: [number, number][] = [
    [0, -legRadius],
    [legRadius * 0.87, legRadius * 0.5],
    [-legRadius * 0.87, legRadius * 0.5],
  ]

  return (
    <group>
      <mesh position={[0, SEAT_HEIGHT - SEAT_THICKNESS / 2, 0]}>
        <cylinderGeometry args={[SEAT_RADIUS, SEAT_RADIUS, SEAT_THICKNESS, 20]} />
        <meshStandardMaterial color="#8a7a63" roughness={0.6} />
      </mesh>
      {legs.map(([dx, dz], index) => (
        <mesh key={index} position={[dx, legHeight / 2, dz]}>
          <cylinderGeometry args={[0.035, 0.035, legHeight, 10]} />
          <meshStandardMaterial color="#5b4f3f" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// 모듈 id가 이제 실제 메뉴 UUID라 "promptkit"/"careerlog"/"steam" 같은 고정 문자열
// 매칭을 쓸 수 없다 — id를 해시해 소품 종류를 결정론적으로(같은 메뉴는 항상 같은
// 소품) 고르되, 메뉴 개수가 동적이어도 자연스럽게 동작하게 한다.
function hashIndex(id: string, mod: number) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash % mod
}

// 요청사항: "책상 위에는 모니터들이 있어야 한다" — 모듈 종류와 무관하게 모니터는
// 공통으로 두고, 소품 하나를 더 얹어 책상마다 약간의 변주를 준다.
function DeskProp({ moduleId, color }: { moduleId: string; color: string }) {
  const variant = hashIndex(moduleId, 3)
  return (
    <group>
      <group position={[0, 0.5, -0.2]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.22, 0.06, 0.14]} />
          <meshStandardMaterial color="#3a3532" />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[0.46, 0.28, 0.03]} />
          <meshStandardMaterial color={color} roughness={0.35} emissive={color} emissiveIntensity={0.12} />
        </mesh>
      </group>
      {variant === 0 ? (
        <mesh position={[0.42, 0.56, -0.05]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.22, 0.16, 0.02]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      ) : null}
      {variant === 1 ? (
        <mesh position={[0.42, 0.58, -0.02]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.2, 0.12, 0.1]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ) : null}
      {variant === 2 ? (
        <mesh position={[0, 0.03, 0.15]}>
          <boxGeometry args={[0.3, 0.06, 0.16]} />
          <meshStandardMaterial color="#3a3532" />
        </mesh>
      ) : null}
    </group>
  )
}

type TopologyDeskProps = {
  module: TopologyModuleNode
  color: string
  position: Vector3
  rotationY?: number
  wide?: boolean
  active: boolean
  skinIndex?: number
  onSelect: () => void
}

export function TopologyDesk({
  module,
  color,
  position,
  rotationY = 0,
  wide = false,
  active,
  skinIndex = 0,
  onSelect,
}: TopologyDeskProps) {
  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    onSelect()
  }

  const { t } = useI18n()
  const width = wide ? 2.3 : 1.7

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[width, 0.1, 0.95]} />
        <meshStandardMaterial color="#e6d6ba" roughness={0.5} />
      </mesh>
      {legOffsets(width / 2).map(([dx, dz], index) => (
        <mesh key={index} position={[dx, 0.25, dz]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshStandardMaterial color="#cab89a" />
        </mesh>
      ))}

      <DeskProp moduleId={module.id} color={color} />

      <group position={[0, 0, 0.55]}>
        <Stool />
      </group>
      <group position={[0, SEAT_HEIGHT, 0.55]}>
        <TopologyRobot skinIndex={skinIndex} active={active} guideText={t("landing.robotGuide")} />
      </group>

      {/* 클릭 판정을 넓히기 위한 투명 히트박스 — 개별 부품마다 핸들러를 붙이는 대신
          이 하나만 클릭을 받는다(three.js는 visible=false여도 레이캐스트는 통과시킨다). */}
      <mesh position={[0, 0.7, 0]} onClick={handleClick} visible={false}>
        <boxGeometry args={[width + 0.2, 1.6, 1.5]} />
      </mesh>

      {active ? null : (
        <Html
          position={[0, 1.85, 0]}
          center
          occlude={false}
          zIndexRange={[20, 0]}
          className="pointer-events-none select-none"
        >
          <div
            className="flex items-center gap-1 whitespace-nowrap rounded-full bg-background/80 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm ring-1 ring-foreground/10"
            title={module.restricted ? t("landing.restrictedItems") : undefined}
          >
            {module.restricted ? <Lock className="size-3 text-muted-foreground" /> : null}
            {module.label}
          </div>
        </Html>
      )}
    </group>
  )
}
