"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import { ROBOT_SEAT_Z, SEAT_HEIGHT, TopologyDesk } from "@/components/landing/hero-topology/topology-desk"
import { DOOR_HEIGHT, DOOR_WIDTH, TopologyDoor } from "@/components/landing/hero-topology/topology-door"
import { buildEscortPath, TopologyEscortRobot } from "@/components/landing/hero-topology/topology-escort-robot"
import { TopologyRobotVacuum, type VacuumObstacle } from "@/components/landing/hero-topology/topology-robot-vacuum"
import { TopologyAirPurifier } from "@/components/landing/hero-topology/topology-air-purifier"
import { TopologyBookshelf } from "@/components/landing/hero-topology/topology-bookshelf"
import { PANTRY_PURIFIER_OFFSET, TopologyPantry } from "@/components/landing/hero-topology/topology-pantry"
import { FOCUS_WORLD_OFFSET } from "@/components/landing/hero-topology/topology-camera"
import { HexFloorTop } from "@/components/landing/hero-topology/topology-floor"
import { TOPOLOGY_PALETTE, useTone, useTopologyDark } from "@/components/landing/hero-topology/topology-theme"
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
// 안내 로봇을 따라갈 때는 문과 로봇이 함께 보이도록 덜 확대하고, 걷는 속도에 맞춰 부드럽게 쫓는다
const ESCORT_ZOOM = 96
const ESCORT_LERP = 0.1
// 직교 카메라라 거리는 화면 구도에 영향이 없다 — 포커스 오프셋 그대로 두면 카메라 쪽
// 가구·로봇이 near 평면에 잘려 나가므로, 같은 방향으로 충분히 물러난다.
const ESCORT_WORLD_OFFSET = FOCUS_WORLD_OFFSET.clone().multiplyScalar(3.4)
const ROBOT_LOCAL = new THREE.Vector3(0, 1.05, ROBOT_SEAT_Z)
const Y_AXIS = new THREE.Vector3(0, 1, 0)
// 옆벽에 붙는 출입문 — 벽면에서 이만큼 안쪽이 로봇이 지나는 통로(문 안쪽 지점)이자
// 왼쪽 벽을 따라 걷는 통로의 x다. 경로 클램프 여백과 같은 값이어야 꺾임 없이 이어진다.
const AISLE_MARGIN = 0.42
const DOOR_FRAME_T = 0.08

function memberSeatPose(col: number): { x: number; rotationY: number } {
  const pair = Math.floor(col / 2)
  const isLeft = col % 2 === 0
  return {
    x: PAIR_CENTERS[pair] + (isLeft ? -PAIR_GAP / 2 : PAIR_GAP / 2),
    rotationY: isLeft ? FACE_LEFT : FACE_RIGHT,
  }
}

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
  /** 메뉴/하위 메뉴를 골라 안내 로봇이 문으로 걸어 나가는 중인 모듈 id */
  escortModuleId?: string | null
  /** 안내 로봇 말풍선 문구 — Canvas 밖(i18n 컨텍스트)에서 만들어 넘긴다 */
  escortSpeech?: { title: string; detail: string }
  /** 안내 로봇이 문 밖으로 완전히 사라진 뒤 호출 — 여기서 화면 전환을 시작한다 */
  onEscortExit?: () => void
}

function CameraFocus({
  focusKey,
  layout,
  roomTarget,
  cameraOffset,
  baseZoom,
  controlsRef,
  escortRef,
}: {
  focusKey: string | null
  layout: { position: THREE.Vector3; rotationY: number } | null
  roomTarget: [number, number, number]
  cameraOffset: THREE.Vector3
  baseZoom: number
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  /** 안내 로봇이 걷는 동안 그 월드 위치(참조) — null이면 평소 포커스 로직 */
  escortRef: React.MutableRefObject<THREE.Vector3 | null>
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

    const escortPos = escortRef.current
    if (escortPos) {
      // 로봇을 따라가는 동안은 사용자 조작을 끊고, 도착 판정 없이 계속 쫓는다.
      // 끝난 뒤(다른 키로 바뀌면) 평소 포커스 로직이 다시 목표를 잡는다.
      lastKey.current = "__escort__"
      animating.current = true
      controls.enabled = false
      controls.enableDamping = false
      const delta = (controls as OrbitControlsImpl & { sphericalDelta?: THREE.Spherical }).sphericalDelta
      delta?.set(0, 0, 0)
      desiredTarget.current.copy(escortPos)
      desiredTarget.current.y += 0.5
      desiredCam.current.copy(escortPos).add(ESCORT_WORLD_OFFSET)
      desiredZoom.current = ESCORT_ZOOM
      controls.target.lerp(desiredTarget.current, ESCORT_LERP)
      camera.position.lerp(desiredCam.current, ESCORT_LERP)
      const ortho = camera as THREE.OrthographicCamera
      if (ortho.isOrthographicCamera) {
        ortho.zoom = THREE.MathUtils.lerp(ortho.zoom, desiredZoom.current, ESCORT_LERP)
        ortho.updateProjectionMatrix()
      }
      camera.lookAt(controls.target)
      return
    }

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
  const tone = useTone()
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.34, 12]} />
        <meshStandardMaterial color={tone("#c17a4f")} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial color={tone("#6f9a5e")} roughness={0.8} />
      </mesh>
      <mesh position={[0.14, 0.62, 0.05]}>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color={tone("#7fac6c")} roughness={0.8} />
      </mesh>
      <mesh position={[-0.13, 0.58, -0.08]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color={tone("#5e8a50")} roughness={0.8} />
      </mesh>
    </group>
  )
}

export function TopologyScene({
  data,
  activeModuleId,
  onSelectModule,
  panPixels = 0,
  active = true,
  escortModuleId = null,
  escortSpeech,
  onEscortExit,
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const dragging = useRef(false)
  const escortPositionRef = useRef<THREE.Vector3 | null>(null)
  const doorOpenRef = useRef(0)
  const documentVisible = useDocumentVisible()
  const dark = useTopologyDark()
  const tone = useTone()
  const palette = dark ? TOPOLOGY_PALETTE.dark : TOPOLOGY_PALETTE.light
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
  const floorMaxZ = floorMinZ + floorDepth

  // 출입문 — 옆벽(화이트보드 벽)의 앞쪽, 마지막 팀원 열보다 앞에 둔다. 화이트보드
  // (floorCenterZ+0.35 ± 0.75)와 앞 구석 공기청정기(floorMaxZ-0.4) 사이 빈 구간이다.
  // 옆벽은 문 자리를 비우고 앞·뒤 두 토막 + 문 위 상인방 토막으로 나눠 그린다.
  const lastRowZ = MEMBER_Z_START + Math.max(layout.numRows - 1, 0) * ROW_SPACING
  const doorZ = THREE.MathUtils.clamp(lastRowZ + 1.45, floorMinZ + 2.2, floorMaxZ - 0.75)
  const doorGapHalf = DOOR_WIDTH / 2 + DOOR_FRAME_T
  const sideWallRearStart = floorMinZ + WALL_T
  const sideWallRearEnd = doorZ - doorGapHalf
  const sideWallFrontStart = doorZ + doorGapHalf
  const sideWallFrontEnd = floorMaxZ
  const doorLintelBottom = DOOR_HEIGHT + DOOR_FRAME_T
  const doorInsideX = floorMinX + AISLE_MARGIN
  const doorOutsideX = floorMinX - 0.85
  // 팀장 책상 앞과 파티션 사이 복도 — 팀장 로봇이 문으로 갈 때 지나는 길
  const leadPartitionZ = (LEAD_Z + MEMBER_Z_START) / 2 - 0.15
  const leadCorridorZ = (LEAD_Z + 0.475 + (leadPartitionZ - 0.04)) / 2

  const escortSeat = escortModuleId ? deskLayout.get(escortModuleId) ?? null : null
  const escortIndex = escortModuleId ? data.modules.findIndex((module) => module.id === escortModuleId) : -1
  const escortPath = useMemo(() => {
    if (!escortSeat) return null
    return buildEscortPath({
      seat: escortSeat,
      seatHeight: SEAT_HEIGHT,
      robotLocalZ: ROBOT_SEAT_Z,
      floor: { minX: floorMinX, maxX: floorMinX + floorWidth, minZ: floorMinZ, maxZ: floorMaxZ },
      aisleMargin: AISLE_MARGIN,
      door: { insideX: doorInsideX, outsideX: doorOutsideX, z: doorZ },
      lead: escortSeat.wide ? { corridorZ: leadCorridorZ, halfWidth: LEAD_WIDTH / 2 } : null,
    })
  }, [escortSeat, floorMinX, floorWidth, floorMinZ, floorMaxZ, doorInsideX, doorOutsideX, doorZ, leadCorridorZ])

  // 로봇청소기가 실제로 우회해야 할 고정 소품들의 위치 — 아래 JSX에 그대로 쓰는
  // 좌표와 같은 값이어야 하므로 여기서 한 번만 정의해서 같이 쓴다.
  const plantPos: [number, number, number] = [floorWidth / 2 - 0.5, 0, LEAD_Z - 0.1]
  // 이 방은 벽이 두 개뿐이다(뒷벽=TV, 왼쪽 옆벽=화이트보드·책장) — 나머지 두
  // 모서리(오른쪽 뒤·오른쪽 앞)는 등지고 설 벽이 없어 허허벌판에 놓인 것처럼
  // 보였다(+ 오른쪽 뒤는 탕비 공간과도 붙어 있었다). 실제 벽이 있는 두 자리,
  // 그것도 TV·화이트보드·책장·탕비실과 안 겹치는 빈 구간에만 둔다.
  const purifierPositions: [number, number, number][] = [
    [floorMinX + 0.4, 0, floorMinZ + 0.4], // 뒷벽 왼쪽 끝 — TV(x≈-0.7)에서 충분히 떨어진 구석
    [floorMinX + 0.4, 0, floorMinZ + floorDepth - 0.4], // 옆벽 앞쪽 끝 — 화이트보드·책장에서 먼 구석
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

  // 1.75→1.5: 모바일도 이 씬을 띄우게 되면서 저가형 기기 GPU 필레이트 부담을
  // 낮췄다 — 체감 해상도 차이는 거의 없고 프레임은 더 안정적이다.
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
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: palette.background,
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
      <color attach="background" args={[palette.background]} />
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
        escortRef={escortPositionRef}
      />

      {/* 다크: 밤 사무실 — 차가운 달빛 톤의 약한 환경광 + TV에서 새는 푸른 빛 */}
      {dark ? (
        <>
          <hemisphereLight args={["#9fb2d8", "#2a231d", 0.62]} />
          <directionalLight position={[7, 10, 5]} intensity={0.55} color="#b8c6ee" />
          <directionalLight position={[-6, 3, -4]} intensity={0.12} color="#8fa0d0" />
          {/* 책상 스탠드(책상마다 하나)가 따뜻한 빛을 맡으므로 방 전체용은 TV 불빛만 둔다 */}
          <pointLight position={[-0.7, 1.6, LEAD_Z - 0.4]} intensity={3.2} distance={7} color="#7ea2ff" />
        </>
      ) : (
        <>
          <hemisphereLight args={["#fff8ee", "#cbbba4", 1]} />
          <directionalLight position={[7, 10, 5]} intensity={1.05} />
          <directionalLight position={[-6, 3, -4]} intensity={0.22} />
        </>
      )}

      {/* 바닥 — 끝없는 평면 대신 두께가 있는 플랫폼으로 경계를 뚜렷하게 준다.
          아이소메트릭 카메라에서 이 사각 플랫폼은 마름모(다이아몬드) 형태로 보인다.
          루트 메뉴 수(책상 수·줄 수)에 맞춰 폭과 깊이가 함께 늘고 준다. */}
      <mesh position={[0, -0.09, floorCenterZ]}>
        <boxGeometry args={[floorWidth + FLOOR_OVERHANG * 2, 0.14, floorDepth + FLOOR_OVERHANG * 2]} />
        <meshStandardMaterial color={palette.floorBase} roughness={0.9} />
      </mesh>
      <HexFloorTop
        position={[0, -0.02, floorCenterZ]}
        width={floorWidth}
        depth={floorDepth}
        baseColor={palette.floorTop}
        edgeColor={palette.floorTop}
        lineColor={palette.tileLine}
        variance={palette.tileVariance}
        seamGlow={palette.seamGlow}
      />

      {/* 뒷벽(TV) + 옆벽(화이트보드) — 바닥 상판 테두리에 맞춘 반투명 가벽.
          옆벽은 뒷벽 두께만큼 짧게 해서 코너에서 맞댄다. */}
      <mesh position={[0, WALL_H / 2, backWallZ]}>
        <boxGeometry args={[floorWidth, WALL_H, WALL_T]} />
        <meshStandardMaterial color={palette.wall} transparent opacity={palette.wallOpacity} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[sideWallX, WALL_H / 2, (sideWallRearStart + sideWallRearEnd) / 2]}>
        <boxGeometry args={[WALL_T, WALL_H, sideWallRearEnd - sideWallRearStart]} />
        <meshStandardMaterial color={palette.wall} transparent opacity={palette.wallOpacity} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[sideWallX, WALL_H / 2, (sideWallFrontStart + sideWallFrontEnd) / 2]}>
        <boxGeometry args={[WALL_T, WALL_H, sideWallFrontEnd - sideWallFrontStart]} />
        <meshStandardMaterial color={palette.wall} transparent opacity={palette.wallOpacity} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[sideWallX, (doorLintelBottom + WALL_H) / 2, doorZ]}>
        <boxGeometry args={[WALL_T, WALL_H - doorLintelBottom, doorGapHalf * 2]} />
        <meshStandardMaterial color={palette.wall} transparent opacity={palette.wallOpacity} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* 출입문 — 옆벽 앞쪽. 메뉴를 고르면 안내 로봇이 이 문으로 나가고 화면이 전환된다 */}
      <TopologyDoor position={[sideWallX, 0, doorZ]} openRef={doorOpenRef} />

      {/* TV — 팀장 책상 뒤(팀장 자리가 있을 때). "팀장이 TV 등지고 앉는다"는 요청의 기준점 */}
      <group position={[-0.7, 1.55, backWallZ + WALL_T / 2 + 0.01]}>
        <mesh>
          <boxGeometry args={[1.5, 0.85, 0.06]} />
          <meshStandardMaterial color="#201e1c" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <boxGeometry args={[1.36, 0.72, 0.02]} />
          <meshStandardMaterial color="#15131a" emissive={dark ? "#3d5a9a" : "#4a4038"} emissiveIntensity={dark ? 0.9 : 0.5} />
        </mesh>
        <Html position={[0, 0, 0.05]} center occlude={false} className="pointer-events-none select-none">
          <div className="whitespace-nowrap text-[11px] font-bold tracking-wide text-white/90">DevDeck</div>
        </Html>
      </group>

      {/* 화이트보드 — 옆벽에 붙여 +x 방향(방 안쪽)을 바라보게 한다 */}
      <group position={[sideWallX + WALL_T / 2 + 0.01, 1.35, floorCenterZ + 0.35]}>
        <mesh>
          <boxGeometry args={[0.05, 1.0, 1.5]} />
          <meshStandardMaterial color={tone("#f7f4ee")} roughness={0.6} />
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
          <meshStandardMaterial color={palette.partition} roughness={0.75} />
        </mesh>
      ) : null}

      {/* 파티션 — 마주보는 책상 사이(페어가 채워진 자리만) */}
      {layout.partitions.map((partition, index) => (
        <mesh key={index} position={[partition.x, 0.55, partition.z]}>
          <boxGeometry args={[0.08, 0.9, 1.7]} />
          <meshStandardMaterial color={palette.partition} roughness={0.75} />
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

      {/* 공기청정기 2대 — 실제 벽이 있고 다른 가구와 안 겹치는 두 구석에만 */}
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
            robotHidden={escortModuleId === module.id}
            onSelect={() => {
              if (module.vacant) return
              onSelectModule(activeModuleId === module.id ? null : module.id)
            }}
          />
        )
      })}

      {/* 안내 로봇 — 선택한 책상의 로봇이 스툴에서 내려와 문까지 걸어 나간다.
          좌석 로봇은 robotHidden으로 비우고, 월드 좌표에서 따로 움직인다. */}
      {escortPath && escortModuleId && onEscortExit ? (
        <TopologyEscortRobot
          key={escortModuleId}
          path={escortPath}
          skinIndex={Math.max(escortIndex, 0)}
          speechTitle={escortSpeech?.title ?? ""}
          speechDetail={escortSpeech?.detail ?? ""}
          doorOpenRef={doorOpenRef}
          positionRef={escortPositionRef}
          onExit={onEscortExit}
        />
      ) : null}
    </Canvas>
  )
}
