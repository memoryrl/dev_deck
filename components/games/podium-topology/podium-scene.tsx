"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import { useRouter } from "next/navigation"
import * as THREE from "three"
import { TopologyRobot } from "@/components/landing/hero-topology/topology-robot"
import { TOPOLOGY_PALETTE, useTopologyDark } from "@/components/landing/hero-topology/topology-theme"
import { SteamCover } from "@/components/steam/steam-cover"
import { steamCoverSources } from "@/lib/steam/images"
import type { PodiumEntry } from "@/lib/steam/top"


const MEDAL = {
  1: { metal: "#f4c430", ribbon: "#c1121f", badge: "#f5c542", label: "금" },
  2: { metal: "#d7dde6", ribbon: "#4c6b8a", badge: "#c5ccd6", label: "은" },
  3: { metal: "#cd7f32", ribbon: "#6b3a1f", badge: "#c47a3a", label: "동" },
} as const

const PODIUM = [
  { rank: 2, x: -1.12, height: 0.78, color: "#9aa3b0", skin: 1 },
  { rank: 1, x: 0, height: 1.08, color: "#d4af37", skin: 5 },
  { rank: 3, x: 1.12, height: 0.58, color: "#b87333", skin: 7 },
] as const

const CLAPPER_SLOTS: { rank: number; x: number; z: number; skin: number }[] = [
  { rank: 4, x: 2.62, z: -0.08, skin: 2 },
  { rank: 5, x: 3.48, z: 0.18, skin: 3 },
  { rank: 6, x: 4.34, z: 0.44, skin: 4 },
  { rank: 7, x: 2.88, z: 1.12, skin: 6 },
  { rank: 8, x: 3.74, z: 1.38, skin: 8 },
  { rank: 9, x: 4.6, z: 1.64, skin: 9 },
  { rank: 10, x: 5.22, z: 0.88, skin: 0 },
]

const CAMERA_POS: [number, number, number] = [6.2, 5.2, 7.2]
const CAMERA_TARGET: [number, number, number] = [1.4, 0.82, 0.35]
const CAMERA_ZOOM = 88

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden)
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener("visibilitychange", onChange)
    return () => document.removeEventListener("visibilitychange", onChange)
  }, [])
  return visible
}

function Medal({ rank }: { rank: 1 | 2 | 3 }) {
  const { metal, ribbon } = MEDAL[rank]
  return (
    <group position={[0, 0.58, 0.12]}>
      <mesh position={[-0.045, 0.08, 0]} rotation={[0.28, 0, 0.24]}>
        <boxGeometry args={[0.038, 0.2, 0.012]} />
        <meshStandardMaterial color={ribbon} roughness={0.45} />
      </mesh>
      <mesh position={[0.045, 0.08, 0]} rotation={[0.28, 0, -0.24]}>
        <boxGeometry args={[0.038, 0.2, 0.012]} />
        <meshStandardMaterial color={ribbon} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.04, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.078, 0.078, 0.018, 28]} />
        <meshStandardMaterial color={metal} metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, -0.04, 0.042]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 0.01, 28]} />
        <meshStandardMaterial color="#fff6d8" metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  )
}

function RankBadge({ rank, appId, headerImageUrl }: { rank: number; appId: number; headerImageUrl: string }) {
  const medal = rank <= 3 ? MEDAL[rank as 1 | 2 | 3] : null
  return (
    <Html
      position={[0, 1.5, 0]}
      center
      occlude={false}
      zIndexRange={[40, 0]}
      className="pointer-events-none select-none"
    >
      <div className="flex flex-col items-center gap-1">
        <div
          className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 px-1.5 font-display text-sm font-black shadow-md"
          style={{
            background: medal?.badge ?? "#1a1614",
            borderColor: medal ? "#1a1614" : "#f6f1e9",
            color: medal ? "#1a1614" : "#f6f1e9",
          }}
        >
          {rank}
        </div>
        <SteamCover
          src={steamCoverSources(appId, headerImageUrl)}
          appId={appId}
          alt=""
          className="h-[55px] w-[118px] rounded border-2 border-[#1a1614] shadow-md"
        />
      </div>
    </Html>
  )
}

function ClappingHands({ phase }: { phase: number }) {
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const swing = Math.sin(clock.elapsedTime * 11 + phase) * 0.42
    if (left.current) left.current.rotation.z = 0.55 + swing
    if (right.current) right.current.rotation.z = -0.55 - swing
  })

  return (
    <group position={[0, 0.72, -0.18]}>
      <group ref={left} position={[-0.2, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.07, 0.11, 0.035]} />
          <meshStandardMaterial color="#e8dfd2" roughness={0.6} />
        </mesh>
      </group>
      <group ref={right} position={[0.2, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.07, 0.11, 0.035]} />
          <meshStandardMaterial color="#e8dfd2" roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

function CelebrateHop({ children, strength }: { children: ReactNode; strength: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 3.2)) * strength
  })
  return <group ref={ref}>{children}</group>
}

function PodiumBlock({
  x,
  height,
  color,
  rank,
}: {
  x: number
  height: number
  color: string
  rank: number
}) {
  const steps = 3
  const stepH = height / steps
  return (
    <group position={[x, 0, 0]}>
      {Array.from({ length: steps }, (_, index) => {
        const w = 1.05 - index * 0.06
        const d = 0.95 - index * 0.1
        return (
          <mesh key={index} position={[0, stepH * (index + 0.5), (steps - 1 - index) * 0.05]}>
            <boxGeometry args={[w, stepH, d]} />
            <meshStandardMaterial color={color} roughness={0.42} metalness={0.18} />
          </mesh>
        )
      })}
      <mesh position={[0, height / 2, 0.48]}>
        <boxGeometry args={[0.42, 0.28, 0.04]} />
        <meshStandardMaterial color="#1a1614" roughness={0.5} />
      </mesh>
      <Html position={[0, height / 2, 0.52]} center occlude={false} className="pointer-events-none select-none">
        <span className="font-display text-xl font-black text-[#f6f1e9]">{rank}</span>
      </Html>
    </group>
  )
}

function RankedRobot({
  entry,
  celebrate,
  facePodium,
  skinIndex,
}: {
  entry: PodiumEntry
  celebrate: boolean
  facePodium: boolean
  skinIndex: number
}) {
  const router = useRouter()
  const yaw = facePodium ? Math.PI / 2 : 0
  const medalRank = entry.rank <= 3 ? (entry.rank as 1 | 2 | 3) : null

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto"
    }
  }, [])

  return (
    <group
      rotation={[0, yaw, 0]}
      onPointerOver={(event) => {
        event.stopPropagation()
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto"
      }}
      onClick={(event) => {
        event.stopPropagation()
        router.push(`/games/${entry.appId}`)
      }}
    >
      <TopologyRobot
        skinIndex={skinIndex}
        active={celebrate}
        hovered={false}
        showSpeech={false}
        guideTitle={`${entry.rank}. ${entry.name}`}
        guideDescription={entry.playtimeLabel}
      />
      {medalRank ? <Medal rank={medalRank} /> : <ClappingHands phase={entry.rank} />}
      <RankBadge rank={entry.rank} appId={entry.appId} headerImageUrl={entry.headerImageUrl} />
    </group>
  )
}

function CeremonyStage({ entries }: { entries: PodiumEntry[] }) {
  // 바닥·벽 색은 랜딩 토폴로지와 같은 라이트/다크 팔레트를 쓴다.
  const palette = useTopologyDark() ? TOPOLOGY_PALETTE.dark : TOPOLOGY_PALETTE.light
  const byRank = useMemo(() => {
    const map = new Map<number, PodiumEntry>()
    for (const entry of entries) map.set(entry.rank, entry)
    return map
  }, [entries])

  return (
    <>
      <mesh position={[1.1, -0.09, 0.35]}>
        <boxGeometry args={[10.4, 0.14, 6.2]} />
        <meshStandardMaterial color={palette.floorBase} roughness={0.9} />
      </mesh>
      <mesh position={[1.1, -0.02, 0.35]}>
        <boxGeometry args={[10, 0.08, 5.8]} />
        <meshStandardMaterial color={palette.floorTop} roughness={0.85} />
      </mesh>

      <mesh position={[0, 1.15, -2.05]}>
        <boxGeometry args={[6.4, 2.3, 0.08]} />
        <meshStandardMaterial color={palette.wall} transparent opacity={palette.wallOpacity + 0.04} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.015, 1.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 3.4]} />
        <meshStandardMaterial color="#8b1e2d" roughness={0.7} />
      </mesh>

      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.016, 1.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 3.4]} />
          <meshStandardMaterial color="#f6f1e9" roughness={0.6} />
        </mesh>
      ))}

      <Html position={[0, 2.15, -1.98]} center occlude={false} className="pointer-events-none select-none">
        <div className="rounded-full bg-[#1a1614]/80 px-4 py-1 font-display text-sm font-black tracking-[0.28em] text-[#f6f1e9]">
          TOP 10
        </div>
      </Html>

      {PODIUM.map((block) => (
        <PodiumBlock key={block.rank} x={block.x} height={block.height} color={block.color} rank={block.rank} />
      ))}

      {PODIUM.map((block) => {
        const entry = byRank.get(block.rank)
        if (!entry) return null
        return (
          <group key={entry.appId} position={[block.x, block.height, 0.04]}>
            <CelebrateHop strength={0.05}>
              <RankedRobot entry={entry} celebrate skinIndex={block.skin} facePodium={false} />
            </CelebrateHop>
          </group>
        )
      })}

      <mesh position={[3.55, 0.08, 0.58]}>
        <boxGeometry args={[2.9, 0.16, 1.7]} />
        <meshStandardMaterial color="#d7c4a6" roughness={0.8} />
      </mesh>

      {CLAPPER_SLOTS.map((slot) => {
        const entry = byRank.get(slot.rank)
        if (!entry) return null
        return (
          <group key={entry.appId} position={[slot.x, 0.16, slot.z]}>
            <CelebrateHop strength={0.03}>
              <RankedRobot entry={entry} celebrate={false} skinIndex={slot.skin} facePodium />
            </CelebrateHop>
          </group>
        )
      })}
    </>
  )
}

export function PodiumScene({ entries }: { entries: PodiumEntry[] }) {
  const visible = useDocumentVisible()
  const dark = useTopologyDark()
  const palette = dark ? TOPOLOGY_PALETTE.dark : TOPOLOGY_PALETTE.light

  return (
    <Canvas
      orthographic
      frameloop={visible ? "always" : "never"}
      camera={{ position: CAMERA_POS, zoom: CAMERA_ZOOM, near: 0.1, far: 200, up: [0, 1, 0] }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      style={{ width: "100%", height: "100%", display: "block", background: palette.background, touchAction: "none" }}
      onCreated={({ camera }) => {
        camera.lookAt(...CAMERA_TARGET)
        camera.updateProjectionMatrix()
      }}
    >
      <color attach="background" args={[palette.background]} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan
        target={CAMERA_TARGET}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2 - 0.06}
        minZoom={36}
        maxZoom={120}
      />

      {dark ? (
        <>
          <hemisphereLight args={["#9fb2d8", "#2a231d", 0.75]} />
          <directionalLight position={[7, 10, 5]} intensity={0.55} color="#b8c6ee" />
          <directionalLight position={[-6, 3, -4]} intensity={0.14} color="#8fa0d0" />
        </>
      ) : (
        <>
          <hemisphereLight args={["#fff8ee", "#cbbba4", 1]} />
          <directionalLight position={[7, 10, 5]} intensity={1.05} />
          <directionalLight position={[-6, 3, -4]} intensity={0.22} />
        </>
      )}
      <spotLight position={[-1.1, 4.2, 1.6]} angle={0.32} penumbra={0.45} intensity={2.1} color="#e8eef6" />
      <spotLight position={[0, 4.6, 1.6]} angle={0.28} penumbra={0.4} intensity={3.1} color="#ffe9a0" />
      <spotLight position={[1.1, 3.9, 1.6]} angle={0.34} penumbra={0.5} intensity={1.7} color="#ffc48a" />

      <CeremonyStage entries={entries} />
    </Canvas>
  )
}
