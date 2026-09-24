"use client"

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { Html } from "@react-three/drei"
import { useThree, type ThreeEvent } from "@react-three/fiber"
import { Lock } from "lucide-react"
import { Color, DoubleSide, type Vector3 } from "three"
import { useI18n } from "@/components/i18n/i18n-provider"
import { TopologyRobot } from "@/components/landing/hero-topology/topology-robot"
import { cn } from "@/lib/utils"
import type { TopologyModuleNode } from "@/lib/landing/topology"
import { useTone, useTopologyDark } from "@/components/landing/hero-topology/topology-theme"

function legOffsets(halfWidth: number): [number, number][] {
  const dx = halfWidth - 0.12
  return [
    [-dx, -0.4],
    [dx, -0.4],
    [-dx, 0.4],
    [dx, 0.4],
  ]
}

export const SEAT_HEIGHT = 0.5
/** 책상 로컬 좌표에서 스툴·로봇이 놓이는 +Z 오프셋 */
export const ROBOT_SEAT_Z = 0.55
const SEAT_THICKNESS = 0.06
const SEAT_RADIUS = 0.22

// 요청사항: "책상에 로봇이 떠있는 모습이 부자연스러우니 등받이 없는 의자 위에
// 서 있게 하자" — 좌석면을 로봇 발 높이(SEAT_HEIGHT)에 맞춰 두고 다리 3개로
// 바닥까지 받친다(등받이 없는 스툴).
function Stool() {
  const tone = useTone()
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
        <meshStandardMaterial color={tone("#8a7a63")} roughness={0.6} />
      </mesh>
      {legs.map(([dx, dz], index) => (
        <mesh key={index} position={[dx, legHeight / 2, dz]}>
          <cylinderGeometry args={[0.035, 0.035, legHeight, 10]} />
          <meshStandardMaterial color={tone("#5b4f3f")} roughness={0.5} />
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

// 모니터 앞(로컬 +Z, 로봇 쪽으로 조금 더 가까운 자리)에 눕혀 두는 키보드+마우스.
// 모듈 변주(variant)와 무관하게 항상 그린다 — 책상마다 빠짐없이 있어야 하는
// 기본 소품이라서.
function KeyboardAndMouse({ color }: { color: string }) {
  const tone = useTone()
  // 책상 상판 박스가 position=[0,0.5,0], height=0.1이라 상판면은 y=0.55다.
  // 이보다 낮게 두면 상판 속에 파묻혀 안 보인다 — 상판면 바로 위에 얹는다.
  return (
    <group position={[0, 0.562, 0.3]}>
      {/* 키보드 본체 */}
      <mesh>
        <boxGeometry args={[0.32, 0.018, 0.1]} />
        <meshStandardMaterial color={tone("#cdc6b8")} roughness={0.6} />
      </mesh>
      {/* 키캡 면 — 살짝 어두운 상판으로 키 배열 느낌만 준다 */}
      <mesh position={[0, 0.011, 0]}>
        <boxGeometry args={[0.29, 0.006, 0.075]} />
        <meshStandardMaterial color={tone("#3a3532")} roughness={0.5} />
      </mesh>
      {/* 마우스 — 키보드 오른쪽 옆 */}
      <group position={[0.22, 0, -0.01]}>
        <mesh>
          <boxGeometry args={[0.055, 0.02, 0.085]} />
          <meshStandardMaterial color={tone("#e8e4da")} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.012, -0.018]}>
          <boxGeometry args={[0.01, 0.005, 0.018]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

const SCREEN_GLOW = new Color("#bcd4ff")

// 다크 모드에서 켜지는 스탠드 조명. 갓 안쪽 발광 + 책상 위 빛 웅덩이 + 실제 포인트 라이트.
// 책상마다 하나씩이라 라이트 수가 책상 수만큼 늘어난다 — 그림자는 끄고 거리를 짧게 잡아
// 옆 책상까지 번지지 않게 한다.
function DeskLamp({ x }: { x: number }) {
  return (
    <group position={[x, 0.55, -0.28]}>
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.024, 16]} />
        <meshStandardMaterial color="#2a2624" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.29, 8]} />
        <meshStandardMaterial color="#2a2624" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* 갓 — 책상 안쪽(+x 방향)을 비스듬히 내려다본다 */}
      <group position={[0.03, 0.3, 0]} rotation={[0, 0, 0.5]}>
        <mesh>
          <coneGeometry args={[0.09, 0.11, 20, 1, true]} />
          <meshStandardMaterial color="#e8dcc4" roughness={0.5} side={DoubleSide} emissive="#ffd9a0" emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, -0.045, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.07, 20]} />
          <meshBasicMaterial color="#fff0cf" />
        </mesh>
      </group>
      <pointLight position={[0.1, 0.24, 0.02]} color="#ffd7a0" intensity={1.3} distance={2.2} decay={2} />
      {/* 책상 위에 번지는 빛 웅덩이 */}
      <mesh position={[0.32, 0.008, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 28]} />
        <meshBasicMaterial color="#ffcf8a" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  )
}

// 요청사항: "책상 위에는 모니터들이 있어야 한다" — 모듈 종류와 무관하게 모니터는
// 공통으로 두고, 소품 하나를 더 얹어 책상마다 약간의 변주를 준다.
function DeskProp({ moduleId, color, vacant }: { moduleId: string; color: string; vacant: boolean }) {
  const tone = useTone()
  const dark = useTopologyDark()
  // 다크: 자리를 지키는 책상의 모니터만 켜져 있다 — 모듈 색에 차가운 화이트를 섞어 화면이 밝게 보이게 한다.
  const screenOn = dark && !vacant
  const screenGlow = screenOn ? `#${new Color(color).lerp(SCREEN_GLOW, 0.4).getHexString()}` : color
  const variant = hashIndex(moduleId, 3)
  return (
    <group>
      <group position={[0, 0.5, -0.2]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.22, 0.06, 0.14]} />
          <meshStandardMaterial color={tone("#3a3532")} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[0.46, 0.28, 0.03]} />
          <meshStandardMaterial
            color={screenOn ? screenGlow : color}
            roughness={0.35}
            emissive={screenOn ? screenGlow : color}
            emissiveIntensity={screenOn ? 0.75 : 0.12}
          />
        </mesh>
      </group>
      <KeyboardAndMouse color={color} />
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
          <meshStandardMaterial color={tone("#3a3532")} />
        </mesh>
      ) : null}
    </group>
  )
}

function AwaySign({ label }: { label: string }) {
  const tone = useTone()
  // 팀장 자리는 yaw=π라 로컬 -Z가 카메라(팀원) 쪽이다. 팻말은 모니터 옆, 객석을 향해 세운다.
  return (
    <group position={[-0.58, 0.55, -0.08]}>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.12]} />
        <meshStandardMaterial color={tone("#8a6a45")} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.11, 0.055]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[0.56, 0.24, 0.018]} />
        <meshStandardMaterial color={tone("#d4c09a")} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.11, -0.055]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[0.56, 0.24, 0.018]} />
        <meshStandardMaterial color={tone("#f3e6cc")} roughness={0.55} />
      </mesh>
      <Html
        position={[0, 0.17, -0.12]}
        center
        occlude={false}
        zIndexRange={[15, 0]}
        className="pointer-events-none select-none"
      >
        <div className="whitespace-nowrap rounded-[2px] bg-[#f6ead2] px-2 py-[3px] text-[10px] font-bold tracking-wide text-[#5a4632] shadow-sm ring-1 ring-[#cbb48a] dark:bg-[#3a322a] dark:text-[#eadfc8] dark:ring-[#6b5a44]">
          {label}
        </div>
      </Html>
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
  /** 안내 로봇이 이 자리에서 일어나 걸어 나가는 동안 true — 좌석의 로봇을 비운다 */
  robotHidden?: boolean
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
  robotHidden = false,
  onSelect,
}: TopologyDeskProps) {
  const tone = useTone()
  const dark = useTopologyDark()
  const { gl } = useThree()
  const { t } = useI18n()
  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<number | null>(null)
  const width = wide ? 2.3 : 1.7
  const lit = hovered || active

  function enterHover() {
    if (module.vacant) return
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    setHovered(true)
  }

  function leaveHover() {
    if (leaveTimer.current != null) window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = null
      setHovered(false)
    }, 50)
  }

  // 클릭해서 확대되는 동안은 마우스가 그대로 있고 3D 콘텐츠만 카메라를 따라 움직인다.
  // 포인터가 실제로 움직이지 않으면 r3f가 pointerout을 쏘지 않아, 패널을 닫아도 글로우
  // 링이 남는 경우가 있었다 — active가 꺼지는 순간 hover도 강제로 같이 꺼준다.
  useEffect(() => {
    if (!active) setHovered(false)
  }, [active])

  useEffect(() => {
    const el = gl.domElement
    el.style.cursor = hovered ? "pointer" : "grab"
    return () => {
      el.style.cursor = "grab"
      if (leaveTimer.current != null) window.clearTimeout(leaveTimer.current)
    }
  }, [gl, hovered])

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    if (module.vacant) return
    onSelect()
  }

  function handleTagClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    onSelect()
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[width, 0.1, 0.95]} />
        <meshStandardMaterial color={tone("#e6d6ba")} roughness={0.5} />
      </mesh>
      {legOffsets(width / 2).map(([dx, dz], index) => (
        <mesh key={index} position={[dx, 0.25, dz]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshStandardMaterial color={tone("#cab89a")} />
        </mesh>
      ))}

      {lit ? (
        <>
          <mesh position={[0, 0.562, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width + 0.08, 1.02]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={active ? 0.16 : 0.28}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.02, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.72, 0.98, 48]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={active ? 0.18 : 0.32}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : null}

      <DeskProp moduleId={module.id} color={color} vacant={Boolean(module.vacant)} />
      {dark && !module.vacant ? <DeskLamp x={-(width / 2 - 0.22)} /> : null}

      <group position={[0, 0, ROBOT_SEAT_Z]}>
        <Stool />
      </group>

      {module.vacant ? <AwaySign label={t("landing.awaySign")} /> : null}

      {/* 클릭/호버 판정을 책상 전체가 아니라 로봇 몸통 주변으로만 좁힌다 — 책상 표면이나
          모니터 위로 마우스가 지나가도 선택되지 않고, 로봇 실루엣 근처에서만 반응한다.
          외근(vacant) 좌석은 로봇·히트박스를 빼고 책상·모니터·팻말만 둔다. */}
      {module.vacant ? null : (
        <group
          position={[0, SEAT_HEIGHT, ROBOT_SEAT_Z]}
          onClick={handleClick}
          onPointerOver={(event) => {
            event.stopPropagation()
            enterHover()
          }}
          onPointerOut={(event) => {
            event.stopPropagation()
            leaveHover()
          }}
        >
          {robotHidden ? null : (
            <TopologyRobot
              skinIndex={skinIndex}
              active={active}
              hovered={hovered}
              guideTitle={t("landing.robotGuideTitle", { label: module.label })}
              guideDescription={module.guideDescription}
            />
          )}
          {/* visible=false여도 레이캐스트는 통과한다 — 로봇 실루엣보다 살짝 넉넉한 정도.
              모바일 탭 오차를 감안해 데스크톱 전용이던 시절보다 조금 더 넉넉하게 잡는다
              (페어 간격 1.62보다 한참 작아 옆 책상 히트박스와는 안 겹친다). */}
          <mesh position={[0, 0.6, -0.05]} visible={false}>
            <boxGeometry args={[1.05, 1.7, 1.1]} />
          </mesh>
        </group>
      )}

      {active || module.vacant ? null : (
        <Html
          position={[0, 1.85, 0.55]}
          center
          occlude={false}
          zIndexRange={[20, 0]}
          className="select-none"
        >
          <button
            type="button"
            className={cn(
              "flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm ring-1 transition duration-200",
              hovered
                ? "bg-background ring-2 ring-foreground/35 shadow-md scale-[1.06]"
                : "bg-background/80 ring-foreground/10"
            )}
            title={module.restricted ? t("landing.restrictedItems") : undefined}
            onPointerEnter={enterHover}
            onPointerLeave={leaveHover}
            onClick={handleTagClick}
          >
            {module.restricted ? <Lock className="size-3 text-muted-foreground" /> : null}
            {module.label}
          </button>
        </Html>
      )}
    </group>
  )
}
