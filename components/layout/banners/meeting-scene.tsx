"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Canvas } from "@/components/three/canvas"
import { ContactShadows, Html, OrbitControls } from "@react-three/drei"
import { CanvasTexture, SRGBColorSpace, type Mesh } from "three"
import { IDLE_CLIP, GREET_CLIP, RobotModel, skinFor } from "@/components/landing/hero-topology/topology-robot"
import type { BannerTeam } from "@/lib/menus/banner-team"

// 제목 배너 스타일 3 — 해당 메뉴의 팀장 로봇과 하위 메뉴 팀원 로봇들이 회의 테이블에 둘러서서 돌아가며 말하는 장면.
// 로봇 모델·피부색은 홈 토폴로지(topology-robot)를 그대로 재사용한다.
const YES_CLIP = "RobotArmature|Robot_Yes"
const THUMBS_CLIP = "RobotArmature|Robot_ThumbsUp"
const TURN_MS = 2800

type Vec3 = [number, number, number]
// 팀장은 테이블 남쪽(카메라 쪽)에서 북쪽(화이트보드)을 바라본다 → 화면에서는 팀장의 뒷모습이 앞에 크게 보인다.
// 팀원은 동·서·북쪽에서 팀장과 테이블 중앙을 바라본다.
const LEADER_SLOT: Vec3 = [0, 0, 1.2]
const MEMBER_SLOTS: Vec3[] = [
  [-1.95, 0, -0.1],
  [1.95, 0, -0.1],
  [-0.85, 0, -1.3],
  [0.85, 0, -1.3],
]

// 로봇의 정면은 로컬 -Z — 테이블 중앙을 바라보도록 yaw를 계산한다(topology-robot의 atan2(-x, -z)와 같은 규칙).
const yawToCenter = ([x, , z]: Vec3) => Math.atan2(x, z)

// 배경 이미지 위에 뜬 장면처럼 보이도록, 바닥은 불투명 원판 대신 가장자리가 사라지는 부드러운 빛 웅덩이로 만든다.
function useGlowTexture() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = size
    const ctx = canvas.getContext("2d")!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    // 밝고 따뜻한 크림색 웅덩이 — 어두운 이미지 위에서도 바닥이 환하게 보이게 한다.
    g.addColorStop(0, "rgba(243,232,212,0.78)")
    g.addColorStop(0.6, "rgba(236,220,192,0.6)")
    g.addColorStop(0.85, "rgba(216,185,138,0.22)")
    g.addColorStop(1, "rgba(216,185,138,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])
}

function Bubble({ text }: { text: string }) {
  return (
    <Html position={[0, 1.85, 0]} center zIndexRange={[20, 0]} className="pointer-events-none select-none">
      <div className="relative w-max max-w-[8.5rem] animate-in fade-in zoom-in-50 duration-300">
        <p className="m-0 rounded-2xl rounded-bl-md border-2 border-foreground bg-[#fffdf8] px-2.5 py-1.5 text-[11px] font-extrabold leading-snug tracking-tight text-[#241a14] shadow-[3px_3px_0_hsl(var(--foreground))] [word-break:keep-all]">
          {text}
        </p>
        <span aria-hidden className="absolute -bottom-1.5 left-3 size-3 rotate-45 border-b-2 border-r-2 border-foreground bg-[#fffdf8]" />
      </div>
    </Html>
  )
}

// 팀장 발밑의 맥동하는 스포트 링 — 이 로봇이 "이 메뉴의 로봇"임을 눈에 띄게 한다(topology-robot의 하이라이트와 같은 연출).
function LeaderSpot({ color }: { color: string }) {
  const ring = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.06
    ring.current?.scale.set(pulse, pulse, 1)
  })
  return (
    <group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.62, 0.78, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <circleGeometry args={[0.95, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={2.2} distance={3.2} position={[0, 1.1, 0.4]} />
    </group>
  )
}

function Chip({ text, color, leader }: { text: string; color?: string; leader?: boolean }) {
  if (!text) return null
  return (
    <Html position={[0, 0.02, 0.35]} center zIndexRange={[10, 0]} className="pointer-events-none select-none">
      <span
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2 font-extrabold shadow-md ${leader ? "px-3 py-1 text-xs text-white" : "border-white/30 bg-black/55 px-2 py-0.5 text-[10px] text-white/90"}`}
        style={leader ? { backgroundColor: color, borderColor: "#fffdf8" } : undefined}
      >
        {leader ? <span aria-hidden>👑</span> : null}
        {text}
      </span>
    </Html>
  )
}

function Robot({ pos, skin, clip, speech, tag, leader = false }: { pos: Vec3; skin: number; clip: string; speech: string | null; tag: string; leader?: boolean }) {
  const color = skinFor(skin).main
  return (
    <group position={pos} rotation={[0, yawToCenter(pos), 0]}>
      {leader ? <LeaderSpot color={color} /> : null}
      {/* 팀장은 조금 더 크게, 팀원은 살짝 작게 — 위계가 한눈에 보이게 */}
      <group scale={leader ? 1.12 : 0.92}>
        <RobotModel skin={skinFor(skin)} clip={clip} />
        {speech ? <Bubble text={speech} /> : null}
      </group>
      <Chip text={tag} color={color} leader={leader} />
    </group>
  )
}

// 캔버스 크기에 맞춰 장면 배율을 정한다 — 높이(h/232)뿐 아니라 폭(w/330)도 봐서, 좁은 모바일 캔버스에서도
// 팀원이 옆으로 잘리지 않고 가능한 한 크게 들어오게 한다.
function Framing() {
  const camera = useThree((state) => state.camera)
  const { width, height } = useThree((state) => state.size)
  useEffect(() => {
    camera.zoom = Math.min(1.5, Math.max(0.6, Math.min(height / 232, width / 330)))
    camera.updateProjectionMatrix()
  }, [camera, width, height])
  return null
}

function Room({ team, animate }: { team: BannerTeam; animate: boolean }) {
  const glow = useGlowTexture()
  const [turn, setTurn] = useState(0)
  const seats = team.members.slice(0, MEMBER_SLOTS.length)
  const speakers = seats.length + 1

  useEffect(() => {
    if (!animate) return
    const id = window.setInterval(() => setTurn((t) => (t + 1) % speakers), TURN_MS)
    return () => window.clearInterval(id)
  }, [animate, speakers])

  // 배경은 항상 어두운 스크림 위의 이미지라 팔레트를 하나로 고정한다(따뜻한 톤으로 이미지와 맞춤).
  const wood = "#a97c50"
  const board = "#efe5d3"
  // 의자가 없으니 팀장은 서서 말한다 — 말할 차례에만 손을 흔든다.
  const leaderClip = turn === 0 ? GREET_CLIP : IDLE_CLIP

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 4]} intensity={2.2} color="#fff1d8" />
      <hemisphereLight args={["#fff4e0", "#6d5c48", 0.45]} />
      {/* 뒤쪽 림 라이트 — 로봇 윤곽이 어두운 배경에서 떠 보이게 한다 */}
      <pointLight position={[0, 2.8, -3.2]} intensity={28} color="#d8b98a" />

      {/* 바닥: 빛 웅덩이 + 가는 샴페인 링 + 접촉 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[3.9, 64]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[3.05, 3.1, 96]} />
        <meshBasicMaterial color="#f1dfbc" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={9} blur={2.6} far={2.6} resolution={256} color="#3a2a1a" />

      {/* 화이트보드 + 스티커 메모(팀원 색) */}
      <group position={[0, 1.75, -2.55]}>
        <mesh>
          <boxGeometry args={[3.2, 1.5, 0.06]} />
          <meshStandardMaterial color={board} />
        </mesh>
        {seats.map((m, i) => (
          <mesh key={i} position={[-1.1 + i * 0.75, 0.25 - (i % 2) * 0.4, 0.05]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.06]}>
            <boxGeometry args={[0.5, 0.5, 0.02]} />
            <meshStandardMaterial color={skinFor(m.skin).main} />
          </mesh>
        ))}
        <mesh position={[0.9, -0.45, 0.04]}>
          <boxGeometry args={[1.1, 0.04, 0.01]} />
          <meshStandardMaterial color={skinFor(team.leader.skin).main} />
        </mesh>
      </group>

      {/* 회의 테이블 */}
      <group>
        <mesh position={[0, 0.72, 0]} scale={[1.6, 1, 0.9]}>
          <cylinderGeometry args={[1, 1, 0.08, 48]} />
          <meshStandardMaterial color={wood} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.18, 0.3, 0.72, 24]} />
          <meshStandardMaterial color="#8d6a46" />
        </mesh>
        {/* 노트북·머그잔 */}
        {[LEADER_SLOT, ...MEMBER_SLOTS.slice(0, seats.length)].map((slot, i) => (
          <group key={i} position={[slot[0] * 0.5, 0.77, slot[2] * 0.45]} rotation={[0, yawToCenter(slot) + Math.PI, 0]}>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.38, 0.02, 0.26]} />
              <meshStandardMaterial color="#c9ced6" />
            </mesh>
            <mesh position={[0, 0.13, -0.12]} rotation={[-0.25, 0, 0]}>
              <boxGeometry args={[0.38, 0.24, 0.015]} />
              <meshStandardMaterial color="#2e3440" />
            </mesh>
            <mesh position={[0.3, 0.05, 0.05]}>
              <cylinderGeometry args={[0.05, 0.045, 0.1, 16]} />
              <meshStandardMaterial color="#fffdf8" />
            </mesh>
          </group>
        ))}
      </group>

      {/* 로봇들 — 팀장은 회의 시작 때 손을 흔들고, 팀원은 말할 차례에 끄덕이거나 엄지를 든다 */}
      <Robot leader pos={LEADER_SLOT} skin={team.leader.skin} clip={leaderClip} speech={turn === 0 ? team.leader.speech : null} tag={team.leader.tag} />
      {seats.map((m, i) => {
        const speaking = turn === i + 1
        return <Robot key={i} pos={MEMBER_SLOTS[i]} skin={m.skin} clip={speaking ? (i % 2 ? THUMBS_CLIP : YES_CLIP) : IDLE_CLIP} speech={speaking ? m.speech : null} tag={m.tag} />
      })}
    </>
  )
}

export default function MeetingScene({ team, active }: { team: BannerTeam; active: boolean }) {
  const [animate, setAnimate] = useState(true)
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    setAnimate(!mql.matches)
  }, [])
  return (
    // 화면 밖이면(active=false) 렌더 루프를 멈춰 GPU를 아낀다.
    <Canvas dpr={[1, 1.5]} frameloop={active ? "always" : "never"} camera={{ position: [0, 3.7, 7.2], fov: 30 }} gl={{ alpha: true, antialias: true }}>
      <Suspense fallback={null}>
        <Room team={team} animate={animate} />
      </Suspense>
      {/* 홈 토폴로지처럼 드래그/터치로 돌려 볼 수 있다. 터치도 한 손가락으로 상하좌우 모두 회전(OrbitControls 기본 touch-action:none) — 이 장면 위에서는 페이지가 스크롤되지 않는다. 줌·이동은 막고 각도는 제한해 팀장 뒷모습과 화이트보드가 늘 보이게 한다. */}
      <Framing />
      <OrbitControls
        makeDefault
        rotateSpeed={1.1}
        enableZoom={false}
        enablePan={false}
        enableDamping
        target={[0, 0.85, 0]}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.15}
      />
    </Canvas>
  )
}
