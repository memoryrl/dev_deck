"use client"

import { Suspense, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { Canvas } from "@/components/three/canvas"
import { ContactShadows } from "@react-three/drei"
import type { Group, Mesh } from "three"
import { RobotModel, skinFor, WALK_CLIP } from "@/components/landing/hero-topology/topology-robot"

// 안내 로봇이 문을 나간 뒤, 페이지가 열릴 때까지 보이는 전환 화면의 장면:
// 양쪽에 산더미처럼 쌓인 서류 사이를 오가며 필요한 서류를 뒤지는 로봇.
// (오른쪽 더미 → 왼쪽 더미를 반복. 뒤지는 동안은 고개를 가로젓고 서류가 튀어 오른다.)
const NO_CLIP = "RobotArmature|Robot_No"
const PILE_X = 2.6
const STAND_X = 1.5
const WALK_S = 1.7
const SEARCH_S = 3
const PAPER_COUNT = 12

// 시드 고정 난수 — 서류 더미 모양이 렌더마다 흔들리지 않게 한다.
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FOLDER_TABS = ["#d8b98a", "#9a7550", "#7d9a8c", "#b9805f"]

function Pile({ x, seed }: { x: number; seed: number }) {
  const sheets = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: 26 }, (_, i) => ({
      y: 0.04 + i * 0.065,
      ox: (r() - 0.5) * 0.3,
      oz: (r() - 0.5) * 0.25,
      rot: (r() - 0.5) * 0.55,
      w: 1 + r() * 0.25,
      d: 1.25 + r() * 0.25,
      tone: 0.9 + r() * 0.1,
      tab: i % 6 === 3 ? FOLDER_TABS[Math.floor(r() * FOLDER_TABS.length)] : null,
    }))
  }, [seed])
  return (
    <group position={[x, 0, 0]}>
      {sheets.map((s, i) => (
        <group key={i} position={[s.ox, s.y, s.oz]} rotation={[0, s.rot, 0]}>
          <mesh>
            <boxGeometry args={[s.w, 0.05, s.d]} />
            <meshStandardMaterial color={`rgb(${Math.round(255 * s.tone)},${Math.round(252 * s.tone)},${Math.round(244 * s.tone)})`} />
          </mesh>
          {s.tab ? (
            <mesh position={[s.w / 2 + 0.04, 0, 0]}>
              <boxGeometry args={[0.12, 0.052, 0.4]} />
              <meshStandardMaterial color={s.tab} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  )
}

type Shared = { side: number } // 지금 서류를 뒤지는 쪽(-1 왼쪽 · 1 오른쪽 · 0 이동 중)

function FlyingPapers({ shared }: { shared: React.MutableRefObject<Shared> }) {
  const refs = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const side = shared.current.side
    refs.current.forEach((mesh, i) => {
      if (!mesh) return
      if (side === 0) {
        mesh.visible = false
        return
      }
      const t = (clock.elapsedTime * 0.8 + i / PAPER_COUNT) % 1
      mesh.visible = true
      // 더미 꼭대기에서 로봇 쪽으로 포물선을 그리며 날아올랐다 떨어진다
      mesh.position.set(side * PILE_X - side * (0.35 + (i % 4) * 0.28) * t, 1.7 + 1.9 * t - 2.2 * t * t, Math.sin(i * 2.1) * 0.45)
      mesh.rotation.set(t * 6 + i, t * 5, t * 4 + i * 0.5)
    })
  })
  return (
    <>
      {Array.from({ length: PAPER_COUNT }, (_, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m }} visible={false}>
          <planeGeometry args={[0.3, 0.4]} />
          <meshStandardMaterial color="#fffdf8" side={2} />
        </mesh>
      ))}
    </>
  )
}

function SearchingRobot({ skinIndex, shared }: { skinIndex: number; shared: React.MutableRefObject<Shared> }) {
  const group = useRef<Group>(null)
  const yaw = useRef<Group>(null)
  const [clip, setClip] = useState(WALK_CLIP)
  const clipRef = useRef(WALK_CLIP)
  const skin = useMemo(() => skinFor(skinIndex), [skinIndex])
  const period = 2 * (WALK_S + SEARCH_S)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime % period
    let x: number
    let facing: number // +1: 오른쪽을 본다
    let side = 0
    if (t < WALK_S) {
      x = -STAND_X + ((2 * STAND_X) * t) / WALK_S
      facing = 1
    } else if (t < WALK_S + SEARCH_S) {
      x = STAND_X
      facing = 1
      side = 1
    } else if (t < 2 * WALK_S + SEARCH_S) {
      x = STAND_X - ((2 * STAND_X) * (t - WALK_S - SEARCH_S)) / WALK_S
      facing = -1
    } else {
      x = -STAND_X
      facing = -1
      side = -1
    }
    shared.current.side = side
    if (group.current) group.current.position.x = x
    // 로봇의 정면은 로컬 -Z — 오른쪽(+X)을 보려면 yaw=-π/2, 왼쪽이면 +π/2
    if (yaw.current) yaw.current.rotation.y = facing === 1 ? -Math.PI / 2 : Math.PI / 2
    const next = side === 0 ? WALK_CLIP : NO_CLIP
    if (next !== clipRef.current) {
      clipRef.current = next
      setClip(next)
    }
  })

  return (
    <group ref={group} position={[-STAND_X, 0, 0.2]}>
      <group ref={yaw} scale={1.35}>
        <RobotModel skin={skin} clip={clip} />
      </group>
    </group>
  )
}

function Stage({ skinIndex }: { skinIndex: number }) {
  const shared = useRef<Shared>({ side: 0 })
  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 6, 5]} intensity={2.2} color="#fff1d8" />
      <Pile x={-PILE_X} seed={7} />
      <Pile x={PILE_X} seed={19} />
      <FlyingPapers shared={shared} />
      <SearchingRobot skinIndex={skinIndex} shared={shared} />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.35} scale={12} blur={2.6} far={2.6} resolution={256} color="#3a2a1a" />
    </>
  )
}

export default function EscortSearch({ skinIndex }: { skinIndex: number }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 2.7, 7.4], fov: 32 }} gl={{ alpha: true, antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 1.2, 0)}>
      <Suspense fallback={null}>
        <Stage skinIndex={skinIndex} />
      </Suspense>
    </Canvas>
  )
}
