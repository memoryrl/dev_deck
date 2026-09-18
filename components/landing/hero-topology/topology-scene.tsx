"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import { TopologyDesk } from "@/components/landing/hero-topology/topology-desk"
import { TopologyRobotVacuum, type VacuumObstacle } from "@/components/landing/hero-topology/topology-robot-vacuum"
import { TopologyAirPurifier } from "@/components/landing/hero-topology/topology-air-purifier"
import { TopologyBookshelf } from "@/components/landing/hero-topology/topology-bookshelf"
import { PANTRY_PURIFIER_OFFSET, TopologyPantry } from "@/components/landing/hero-topology/topology-pantry"
import { FOCUS_WORLD_OFFSET } from "@/components/landing/hero-topology/topology-camera"
import type { TopologyData, TopologyModuleNode, TopologyTint } from "@/lib/landing/topology"

// 문서가 백그라운드 탭으로 가려지면(document.hidden) 씬이 보이지 않아도
// requestAnimationFrame 자체는 계속 돌 수 있다 — frameloop를 꺼서 완전히 멈춘다.
function useDocumentVisible() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden)
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener("visibilitychange", onChange)
    return () => document.removeEventListener("visibilitychange", onChange)
  }, [])
  return visible
}

const TINT_COLOR: Record<TopologyTint, string> = {
  champagne: "#c4a574",
  cognac: "#6b4f3a",
  espresso: "#1a1614",
}

// 동적 오피스 배치.
// - 팀장(isLead): TV를 등지고, 팀원 쪽 파티션을 바라본다 (rotationY = π).
// - 팀원: 한 행에 4석 = 마주보는 페어 2개. 페어 사이(모니터끼리)에 파티션.
//   왼쪽 좌석 yaw = -π/2 (파트너를 향해 +X), 오른쪽 yaw = +π/2 (파트너를 향해 -X).
// - 남는 인원은 다음 행으로 넘어가고, 페어가 둘 다 채워졌을 때만 가운데 파티션을 둔다.
const SEATS_PER_ROW = 4
const PAIR_GAP = 1.62
const CLUSTER_X = 2.42
const PAIR_CENTERS = [-CLUSTER_X, CLUSTER_X] as const
const ROW_SPACING = 2.5
const LEAD_WIDTH = 2.3
const ROOM_MARGIN = 1.8
const MIN_ROOM_WIDTH = 9.2
const MIN_ROOM_DEPTH = 7.4
const REFERENCE_ROOM_WIDTH = 9.2
const REFERENCE_ROOM_DEPTH = 7.4
const LEAD_Z = -2.45
const MEMBER_Z_START = 0.95
const FACE_LEFT = -Math.PI / 2
const FACE_RIGHT = Math.PI / 2
const FACE_TEAM = Math.PI

const BASE_ZOOM_AT_REFERENCE = 78
const MIN_BASE_ZOOM = 40
const FOCUS_ZOOM = 124
const LERP_FACTOR = 0.28
const FOCUS_ARRIVE = 0.05
const ROBOT_LOCAL = new THREE.Vector3(0, 1.05, 0.55)
const Y_AXIS = new THREE.Vector3(0, 1, 0)

function memberSeatPose(col: number): { x: number; rotationY: number } {
  const pair = Math.floor(col / 2)
  const isLeft = col % 2 === 0
  return {
    x: PAIR_CENTERS[pair] + (isLeft ? -PAIR_GAP / 2 : PAIR_GAP / 2),
    rotationY: isLeft ? FACE_LEFT : FACE_RIGHT,
  }
}

const FLOOR_BASE_COLOR = "#cbb28f"
const FLOOR_TOP_COLOR = "#f3ead9"
const WALL_COLOR = "#d7e6ea"
const PARTITION_COLOR = "#a9c9bb"

type Seat = { position: [number, number, number]; rotationY: number; wide: boolean }
type RowPartition = { x: number; z: number }

function computeLayout(modules: TopologyModuleNode[]) {
  const leadIndex = modules.findIndex((module) => module.isLead)
  const hasLead = leadIndex >= 0
  const memberModules = hasLead ? modules.filter((_, index) => index !== leadIndex) : modules
  const memberCount = memberModules.length
  const numRows = memberCount > 0 ? Math.ceil(memberCount / SEATS_PER_ROW) : 0

  const seats = new Map<string, Seat>()
  if (hasLead) {
    seats.set(modules[leadIndex].id, { position: [0, 0, LEAD_Z], rotationY: FACE_TEAM, wide: true })
  }

  const partitions: RowPartition[] = []
  for (let row = 0; row < numRows; row++) {
    const colsInRow = Math.min(SEATS_PER_ROW, memberCount - row * SEATS_PER_ROW)
    const z = MEMBER_Z_START + row * ROW_SPACING
    for (let col = 0; col < colsInRow; col++) {
      const seatModule = memberModules[row * SEATS_PER_ROW + col]
      const pose = memberSeatPose(col)
      seats.set(seatModule.id, { position: [pose.x, 0, z], rotationY: pose.rotationY, wide: false })
    }
    for (let pair = 0; pair < PAIR_CENTERS.length; pair++) {
      const rightCol = pair * 2 + 1
      if (rightCol < colsInRow) partitions.push({ x: PAIR_CENTERS[pair], z })
    }
  }

  const outerDeskX = CLUSTER_X + PAIR_GAP / 2
  const memberSpan = memberCount > 0 ? outerDeskX * 2 + 1.1 : 0
  const roomWidth = Math.max(memberSpan + ROOM_MARGIN, hasLead ? LEAD_WIDTH + ROOM_MARGIN : 0, MIN_ROOM_WIDTH)
  const roomDepth = Math.max(numRows > 0 ? (numRows - 1) * ROW_SPACING + 4.2 : 4.2, MIN_ROOM_DEPTH)

  const memberCenterZ = numRows > 0 ? MEMBER_Z_START + ((numRows - 1) * ROW_SPACING) / 2 : MEMBER_Z_START
  const roomTarget: [number, number, number] = [
    0,
    0.5,
    hasLead ? (LEAD_Z + memberCenterZ) / 2 - 0.3 : memberCenterZ - 0.3,
  ]
  const zoom = Math.max(
    BASE_ZOOM_AT_REFERENCE * Math.min(REFERENCE_ROOM_WIDTH / roomWidth, REFERENCE_ROOM_DEPTH / roomDepth),
    MIN_BASE_ZOOM
  )

  return { seats, hasLead, memberCount, numRows, roomWidth, roomDepth, roomTarget, zoom, partitions }
}

type Props = {
  data: TopologyData
  activeModuleId: string | null
  onSelectModule: (id: string | null) => void
  panPixels?: number
  /** 히어로 캐러셀이 클래식 슬라이드에 있거나 탭이 백그라운드면 false — 렌더 루프 자체를 끈다 */
  active?: boolean
}

function CameraFocus({
  focusKey,
  layout,
  roomTarget,
  cameraOffset,
  baseZoom,
  controlsRef,
}: {
  focusKey: string | null
  layout: { position: THREE.Vector3; rotationY: number } | null
  roomTarget: [number, number, number]
  cameraOffset: THREE.Vector3
  baseZoom: number
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()
  const lastKey = useRef<string>("__init__")
  const animating = useRef(true)
  const desiredCam = useRef(cameraOffset.clone())
  const desiredTarget = useRef(new THREE.Vector3(...roomTarget))
  const desiredZoom = useRef(baseZoom)
  const scratch = useRef(new THREE.Vector3())

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return

    const key = focusKey ?? "__home__"
    if (lastKey.current !== key) {
      lastKey.current = key
      animating.current = true
      if (layout) {
        scratch.current.copy(ROBOT_LOCAL).applyAxisAngle(Y_AXIS, layout.rotationY).add(layout.position)
        desiredTarget.current.copy(scratch.current)
        desiredTarget.current.y += 0.22
        desiredCam.current.copy(scratch.current).add(FOCUS_WORLD_OFFSET)
        desiredZoom.current = FOCUS_ZOOM
      } else {
        desiredTarget.current.set(...roomTarget)
        desiredCam.current.copy(cameraOffset)
        desiredZoom.current = baseZoom
      }
    }

    const hold = Boolean(layout)
    if (!hold && !animating.current) {
      controls.enabled = true
      controls.enableDamping = true
      return
    }

    controls.enabled = false
    controls.enableDamping = false
    const delta = (controls as OrbitControlsImpl & { sphericalDelta?: THREE.Spherical }).sphericalDelta
    delta?.set(0, 0, 0)

    const k = animating.current ? LERP_FACTOR : 1
    controls.target.lerp(desiredTarget.current, k)
    camera.position.lerp(desiredCam.current, k)
    const ortho = camera as THREE.OrthographicCamera
    if (ortho.isOrthographicCamera) {
      ortho.zoom = THREE.MathUtils.lerp(ortho.zoom, desiredZoom.current, k)
      ortho.updateProjectionMatrix()
    }
    camera.lookAt(controls.target)

    const arrived =
      camera.position.distanceTo(desiredCam.current) < FOCUS_ARRIVE &&
      controls.target.distanceTo(desiredTarget.current) < FOCUS_ARRIVE &&
      Math.abs(ortho.zoom - desiredZoom.current) < 1.2
    if (arrived) {
      camera.position.copy(desiredCam.current)
      controls.target.copy(desiredTarget.current)
      ortho.zoom = desiredZoom.current
      ortho.updateProjectionMatrix()
      camera.lookAt(controls.target)
      animating.current = false
    }
  })
  // 주의: useFrame(fn, 1)처럼 두 번째 인자에 0보다 큰 값을 주면 r3f가 "수동 렌더 모드"로
  // 전환되어 매 프레임 자동으로 하던 gl.render() 호출을 멈춘다 — 절대 우선순위 인자를
  // 주지 않는다(자세한 이유는 git 이력 참고, 한 번 이걸로 캔버스가 완전히 비어 보인 적 있음).

  return null
}

// 회전 중심(OrbitControls target)은 항상 방의 진짜 중심이어야 자연스럽게 도는데,
// roomTarget 자체를 옮겨서 화면을 밀면 회전 중심도 같이 밀려 드래그가 어색해진다.
// 대신 카메라의 위치·타깃은 그대로 두고 setViewOffset으로 "렌더링되는 창"만 옆으로
// 밀어 화면상 위치만 이동시킨다 — 회전 중심은 항상 중앙에 남는다.
function ViewportPan({ panPixels }: { panPixels: number }) {
  const { camera, size } = useThree()

  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera
    if (!ortho.isOrthographicCamera) return
    if (panPixels === 0) {
      ortho.clearViewOffset()
    } else {
      ortho.setViewOffset(size.width, size.height, -panPixels, 0, size.width, size.height)
    }
    ortho.updateProjectionMatrix()
    return () => {
      ortho.clearViewOffset()
    }
  }, [camera, size.width, size.height, panPixels])

  return null
}

function OfficePlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.34, 12]} />
        <meshStandardMaterial color="#c17a4f" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial color="#6f9a5e" roughness={0.8} />
      </mesh>
      <mesh position={[0.14, 0.62, 0.05]}>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color="#7fac6c" roughness={0.8} />
      </mesh>
      <mesh position={[-0.13, 0.58, -0.08]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color="#5e8a50" roughness={0.8} />
      </mesh>
    </group>
  )
}

export function TopologyScene({ data, activeModuleId, onSelectModule, panPixels = 0, active = true }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const dragging = useRef(false)
  const documentVisible = useDocumentVisible()
  const frameloop = active && documentVisible ? "always" : "never"

  const layout = useMemo(() => computeLayout(data.modules), [data.modules])
  const deskLayout = layout.seats
  const roomTarget = layout.roomTarget

  const cameraOffset = useMemo(
    () => new THREE.Vector3(roomTarget[0] + 8.4, roomTarget[1] + 6.8, roomTarget[2] + 8.4),
    [roomTarget]
  )

  const activeSeat = activeModuleId ? deskLayout.get(activeModuleId) ?? null : null
  const activeLayout = activeSeat
    ? { position: new THREE.Vector3(...activeSeat.position), rotationY: activeSeat.rotationY }
    : null

  // 방 프레임은 바닥 상판을 단일 기준 박스로 둔다.
  // 뒷벽(TV)·옆벽(차트)은 그 테두리에 맞춰 붙이고, 두께만큼 안쪽에서 맞대어
  // 꼭짓점이 벌어지거나 어긋나지 않게 한다.
  const WALL_T = 0.06
  const WALL_H = 2.2
  const FLOOR_OVERHANG = 0.2
  const floorWidth = layout.roomWidth
  const floorDepth = layout.roomDepth
  const floorMinZ = LEAD_Z - 1.1
  const floorCenterZ = floorMinZ + floorDepth / 2
  const floorMinX = -floorWidth / 2
  const backWallZ = floorMinZ + WALL_T / 2
  const sideWallX = floorMinX + WALL_T / 2
  const sideWallDepth = floorDepth - WALL_T
  const sideWallCenterZ = floorMinZ + WALL_T + sideWallDepth / 2

  // 로봇청소기가 실제로 우회해야 할 고정 소품들의 위치 — 아래 JSX에 그대로 쓰는
  // 좌표와 같은 값이어야 하므로 여기서 한 번만 정의해서 같이 쓴다.
  const plantPos: [number, number, number] = [floorWidth / 2 - 0.5, 0, LEAD_Z - 0.1]
  // 로봇청소기 순찰 경로(inset 0.5)와 정확히 겹치지 않도록 네 모서리 모두
  // 그보다 살짝 더 깊은 inset(0.4)을 쓴다 — 거리 0이 되는 특이점을 피한다.
  const purifierPositions: [number, number, number][] = [
    [floorMinX + 0.4, 0, floorMinZ + 0.4],
    [floorMinX + floorWidth - 0.4, 0, floorMinZ + 0.4],
    [floorMinX + 0.4, 0, floorMinZ + floorDepth - 0.4],
    [floorMinX + floorWidth - 0.4, 0, floorMinZ + floorDepth - 0.4],
  ]
  // 팀장 자리(LEAD_Z) 옆, TV에서 봤을 때 왼쪽 벽(sideWallX)에 붙는 4단 책장
  const bookshelfPos: [number, number, number] = [sideWallX + WALL_T / 2 + 0.14, 0, LEAD_Z]
  // 팀장 로봇 우측 — 뒷벽에 붙인 탕비 카운터. 책상 끝(1.15)과 식물 사이.
  const pantryPos: [number, number, number] = [2.22, 0, backWallZ + WALL_T / 2 + 0.26]

  const vacuumObstacles: VacuumObstacle[] = [
    { x: plantPos[0], z: plantPos[2], radius: 0.28 },
    ...purifierPositions.map(([x, , z]) => ({ x, z, radius: 0.22 })),
    { x: bookshelfPos[0], z: bookshelfPos[2], radius: 0.32 },
    { x: pantryPos[0], z: pantryPos[2], radius: 0.42 },
    {
      x: pantryPos[0] + PANTRY_PURIFIER_OFFSET.x,
      z: pantryPos[2] + PANTRY_PURIFIER_OFFSET.z,
      radius: 0.24,
    },
  ]

  return (
    <Canvas
      orthographic
      frameloop={frameloop}
      camera={{
        position: cameraOffset.toArray(),
        zoom: layout.zoom,
        near: 0.1,
        far: 200,
        up: [0, 1, 0],
      }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: FLOOR_TOP_COLOR,
        cursor: "grab",
        touchAction: "none",
      }}
      onPointerDown={() => {
        dragging.current = false
      }}
      onPointerMove={(event) => {
        if (event.buttons) dragging.current = true
      }}
      onPointerMissed={() => {
        if (!dragging.current) onSelectModule(null)
      }}
      onCreated={({ camera }) => {
        camera.position.copy(cameraOffset)
        camera.lookAt(...roomTarget)
        camera.updateProjectionMatrix()
      }}
    >
      <color attach="background" args={[FLOOR_TOP_COLOR]} />
      <ViewportPan panPixels={panPixels} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan
        minPolarAngle={0.28}
        maxPolarAngle={Math.PI / 2 - 0.04}
        minZoom={40}
        maxZoom={180}
      />
      <CameraFocus
        focusKey={activeModuleId}
        layout={activeLayout}
        roomTarget={roomTarget}
        cameraOffset={cameraOffset}
        baseZoom={layout.zoom}
        controlsRef={controlsRef}
      />

      <hemisphereLight args={["#fff8ee", "#cbbba4", 1]} />
      <directionalLight position={[7, 10, 5]} intensity={1.05} />
      <directionalLight position={[-6, 3, -4]} intensity={0.22} />

      {/* 바닥 — 끝없는 평면 대신 두께가 있는 플랫폼으로 경계를 뚜렷하게 준다.
          아이소메트릭 카메라에서 이 사각 플랫폼은 마름모(다이아몬드) 형태로 보인다.
          루트 메뉴 수(책상 수·줄 수)에 맞춰 폭과 깊이가 함께 늘고 준다. */}
      <mesh position={[0, -0.09, floorCenterZ]}>
        <boxGeometry args={[floorWidth + FLOOR_OVERHANG * 2, 0.14, floorDepth + FLOOR_OVERHANG * 2]} />
        <meshStandardMaterial color={FLOOR_BASE_COLOR} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.02, floorCenterZ]}>
        <boxGeometry args={[floorWidth, 0.08, floorDepth]} />
        <meshStandardMaterial color={FLOOR_TOP_COLOR} roughness={0.85} />
      </mesh>

      {/* 뒷벽(TV) + 옆벽(화이트보드) — 바닥 상판 테두리에 맞춘 반투명 가벽.
          옆벽은 뒷벽 두께만큼 짧게 해서 코너에서 맞댄다. */}
      <mesh position={[0, WALL_H / 2, backWallZ]}>
        <boxGeometry args={[floorWidth, WALL_H, WALL_T]} />
        <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.24} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[sideWallX, WALL_H / 2, sideWallCenterZ]}>
        <boxGeometry args={[WALL_T, WALL_H, sideWallDepth]} />
        <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.24} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* TV — 팀장 책상 뒤(팀장 자리가 있을 때). "팀장이 TV 등지고 앉는다"는 요청의 기준점 */}
      <group position={[-0.7, 1.55, backWallZ + WALL_T / 2 + 0.01]}>
        <mesh>
          <boxGeometry args={[1.5, 0.85, 0.06]} />
          <meshStandardMaterial color="#201e1c" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <boxGeometry args={[1.36, 0.72, 0.02]} />
          <meshStandardMaterial color="#15131a" emissive="#4a4038" emissiveIntensity={0.5} />
        </mesh>
        <Html position={[0, 0, 0.05]} center occlude={false} className="pointer-events-none select-none">
          <div className="whitespace-nowrap text-[11px] font-bold tracking-wide text-white/90">DevDeck</div>
        </Html>
      </group>

      {/* 화이트보드 — 옆벽에 붙여 +x 방향(방 안쪽)을 바라보게 한다 */}
      <group position={[sideWallX + WALL_T / 2 + 0.01, 1.35, floorCenterZ + 0.35]}>
        <mesh>
          <boxGeometry args={[0.05, 1.0, 1.5]} />
          <meshStandardMaterial color="#f7f4ee" roughness={0.6} />
        </mesh>
        {[0.26, 0.4, 0.32].map((h, index) => (
          <mesh key={index} position={[0.035, -0.32 + h / 2, -0.35 + index * 0.35]}>
            <boxGeometry args={[0.02, h, 0.22]} />
            <meshStandardMaterial color={["#c4a574", "#6b4f3a", "#1a1614"][index]} />
          </mesh>
        ))}
      </group>

      {/* 파티션 — 팀장 구역과 팀원 구역 사이 (팀장 자리가 있을 때만) */}
      {layout.hasLead ? (
        <mesh position={[0, 0.55, (LEAD_Z + MEMBER_Z_START) / 2 - 0.15]}>
          <boxGeometry args={[Math.max(floorWidth - 1.6, 2.0), 0.9, 0.08]} />
          <meshStandardMaterial color={PARTITION_COLOR} roughness={0.75} />
        </mesh>
      ) : null}

      {/* 파티션 — 마주보는 책상 사이(페어가 채워진 자리만) */}
      {layout.partitions.map((partition, index) => (
        <mesh key={index} position={[partition.x, 0.55, partition.z]}>
          <boxGeometry args={[0.08, 0.9, 1.7]} />
          <meshStandardMaterial color={PARTITION_COLOR} roughness={0.75} />
        </mesh>
      ))}

      <OfficePlant position={plantPos} />

      {/* 4단 책장 — 팀장 자리 옆 왼쪽 벽(TV에서 바라봤을 때 왼쪽) */}
      <TopologyBookshelf position={bookshelfPos} />

      {/* 탕비 공간 — 팀장 로봇 우측, 뒷벽에 붙인 카운터 + 커피머신 + 정수기 */}
      <TopologyPantry position={pantryPos} />

      {/* 로봇청소기 — 벽 안쪽 테두리를 따라 방을 도는 순찰 경로(정적 오브젝트가
          아니라 useFrame으로 매 프레임 이동). 책상 구역(ROOM_MARGIN)과 안 겹치고,
          공기청정기·식물·책장과는 obstacles로 넘겨 살짝 우회하게 한다. */}
      <TopologyRobotVacuum
        floorMinX={floorMinX}
        floorWidth={floorWidth}
        floorMinZ={floorMinZ}
        floorDepth={floorDepth}
        obstacles={vacuumObstacles}
      />

      {/* 공기청정기 4대 — 네 모서리마다 하나씩 */}
      {purifierPositions.map((pos, index) => (
        <TopologyAirPurifier key={index} position={pos} />
      ))}

      {data.modules.map((module, index) => {
        const seat = deskLayout.get(module.id)
        if (!seat) return null
        return (
          <TopologyDesk
            key={module.id}
            module={module}
            color={TINT_COLOR[module.tint]}
            position={new THREE.Vector3(...seat.position)}
            rotationY={seat.rotationY}
            wide={seat.wide}
            active={activeModuleId === module.id}
            skinIndex={index}
            onSelect={() => {
              if (module.vacant) return
              onSelectModule(activeModuleId === module.id ? null : module.id)
            }}
          />
        )
      })}
    </Canvas>
  )
}
