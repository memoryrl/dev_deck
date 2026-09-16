"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import { TopologyDesk } from "@/components/landing/hero-topology/topology-desk"
import { FOCUS_CAM_LOCAL } from "@/components/landing/hero-topology/topology-camera"
import type { TopologyData, TopologyModuleNode, TopologyTint } from "@/lib/landing/topology"

const TINT_COLOR: Record<TopologyTint, string> = {
  champagne: "#c4a574",
  cognac: "#6b4f3a",
  espresso: "#1a1614",
}

// 루트 메뉴 수만큼 책상이 늘고 주는 동적 레이아웃. 관리자 좌석(isLead, 로그인한
// 관리자에게만 존재)이 있으면 TV 등지는 넓은 책상으로 방 안쪽 중앙-뒤에 앉히고,
// 나머지 팀원 책상은 그 앞쪽에 최대 3열 그리드로 채운다 — 4번째 책상부터는 다음
// 줄로 넘어간다. 바닥·벽도 열·행 수에 비례해 커진다.
const GRID_COLS = 3
const COL_SPACING = 2.1
const ROW_SPACING = 1.85
const LEAD_WIDTH = 2.3
const MEMBER_WIDTH = 1.7
const ROOM_MARGIN = 1.8
const MIN_ROOM_WIDTH = 6.4
const MIN_ROOM_DEPTH = 7.0
const REFERENCE_ROOM_WIDTH = 7.2
const REFERENCE_ROOM_DEPTH = 7.0
const LEAD_Z = -2.3
const MEMBER_Z_START = 0.6

const BASE_ZOOM_AT_REFERENCE = 92
const MIN_BASE_ZOOM = 40
const FOCUS_ZOOM = 124
const LERP_FACTOR = 0.28
const FOCUS_ARRIVE = 0.05
const ROBOT_LOCAL = new THREE.Vector3(0, 1.05, 0.55)
// 정면(+Z)이 아니라 기본 아이소메트릭과 같은 대각(옆+앞+위)에서 들여다본다.
// 같은 줄 로봇이 카메라와 타깃 사이에 끼지 않게, 방 바깥쪽(+X 또는 -X)을 고른다.
// FOCUS_CAM_LOCAL은 topology-camera.ts에서 가져온다 — topology-robot.tsx가 로봇을
// "카메라 쪽으로" 돌리는 각도 계산도 이 값을 같이 써야 방향이 어긋나지 않는다.
const Y_AXIS = new THREE.Vector3(0, 1, 0)

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
  const numRows = memberCount > 0 ? Math.ceil(memberCount / GRID_COLS) : 0

  const seats = new Map<string, Seat>()
  if (hasLead) {
    seats.set(modules[leadIndex].id, { position: [0, 0, LEAD_Z], rotationY: 0, wide: true })
  }

  let widestRow = 0
  const partitions: RowPartition[] = []
  for (let row = 0; row < numRows; row++) {
    const colsInRow = Math.min(GRID_COLS, memberCount - row * GRID_COLS)
    widestRow = Math.max(widestRow, colsInRow)
    const z = MEMBER_Z_START + row * ROW_SPACING
    for (let col = 0; col < colsInRow; col++) {
      const seatModule = memberModules[row * GRID_COLS + col]
      const x = (col - (colsInRow - 1) / 2) * COL_SPACING
      seats.set(seatModule.id, { position: [x, 0, z], rotationY: 0, wide: false })
      if (col < colsInRow - 1) partitions.push({ x: x + COL_SPACING / 2, z })
    }
  }

  const memberRowSpan = widestRow > 0 ? (widestRow - 1) * COL_SPACING + MEMBER_WIDTH : 0
  const roomWidth = Math.max(
    memberRowSpan + ROOM_MARGIN,
    hasLead ? LEAD_WIDTH + ROOM_MARGIN : 0,
    MIN_ROOM_WIDTH
  )
  const roomDepth = Math.max(numRows > 0 ? (numRows - 1) * ROW_SPACING + 3.4 : 3.4, MIN_ROOM_DEPTH)

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
        const side = layout.position.x < -0.15 ? -1 : 1
        scratch.current.set(FOCUS_CAM_LOCAL.x * side, FOCUS_CAM_LOCAL.y, FOCUS_CAM_LOCAL.z)
        desiredCam.current.copy(scratch.current).applyAxisAngle(Y_AXIS, layout.rotationY).add(layout.position)
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

export function TopologyScene({ data, activeModuleId, onSelectModule, panPixels = 0 }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const dragging = useRef(false)

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

  const wallWidth = layout.roomWidth
  const floorWidth = wallWidth + 0.4
  const wallCenterX = 0
  const wallZ = LEAD_Z - 1.1
  const sideWallX = -wallWidth / 2 - 0.1
  const floorDepth = layout.roomDepth
  const floorCenterZ = wallZ + floorDepth / 2 - 0.2
  const sideWallLength = floorDepth + 1.0
  const sideWallCenterZ = wallZ + sideWallLength / 2 - 0.3

  return (
    <Canvas
      orthographic
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
        <boxGeometry args={[floorWidth + 0.4, 0.14, floorDepth + 0.4]} />
        <meshStandardMaterial color={FLOOR_BASE_COLOR} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.02, floorCenterZ]}>
        <boxGeometry args={[floorWidth, 0.08, floorDepth]} />
        <meshStandardMaterial color={FLOOR_TOP_COLOR} roughness={0.85} />
      </mesh>

      {/* 뒷벽(TV) + 옆벽(화이트보드) — "투명한 가벽"이라 반투명 유리 재질로 만든다.
          옆벽 길이도 방 깊이(줄 수)에 맞춰 늘어난다. */}
      <mesh position={[wallCenterX, 1.1, wallZ]}>
        <boxGeometry args={[wallWidth, 2.2, 0.06]} />
        <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.24} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[sideWallX, 1.1, sideWallCenterZ]}>
        <boxGeometry args={[0.06, 2.2, sideWallLength]} />
        <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.24} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* TV — 팀장 책상 뒤(팀장 자리가 있을 때). "팀장이 TV 등지고 앉는다"는 요청의 기준점 */}
      <group position={[wallCenterX - 0.7, 1.55, wallZ + 0.06]}>
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
      <group position={[sideWallX + 0.04, 1.35, wallZ + 3.2]}>
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
          <boxGeometry args={[Math.max(layout.roomWidth - 1.6, 2.0), 0.9, 0.08]} />
          <meshStandardMaterial color={PARTITION_COLOR} roughness={0.75} />
        </mesh>
      ) : null}

      {/* 파티션 — 같은 줄에 나란히 앉은 팀원 책상들 사이, 줄마다 반복 */}
      {layout.partitions.map((partition, index) => (
        <mesh key={index} position={[partition.x, 0.55, partition.z]}>
          <boxGeometry args={[0.08, 0.9, 1.7]} />
          <meshStandardMaterial color={PARTITION_COLOR} roughness={0.75} />
        </mesh>
      ))}

      <OfficePlant position={[wallWidth / 2 - 0.5, 0, LEAD_Z - 0.1]} />

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
            onSelect={() => onSelectModule(activeModuleId === module.id ? null : module.id)}
          />
        )
      })}
    </Canvas>
  )
}
