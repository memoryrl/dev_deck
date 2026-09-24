"use client"

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { MathUtils, MeshStandardMaterial, Vector3, type Group, type Mesh } from "three"
import {
  GREET_CLIP,
  JUMP_CLIP,
  RUN_CLIP,
  RobotModel,
  RobotSpeech,
  WALK_CLIP,
  skinFor,
} from "@/components/landing/hero-topology/topology-robot"

export type EscortPath = {
  /** 스툴 위 로봇 발 위치(월드) */
  start: Vector3
  /** 스툴에서 뛰어내려 착지하는 바닥 지점 */
  landing: Vector3
  /** 착지 이후 순서대로 지나는 바닥 경로 — 마지막 두 점이 문 안쪽·문 밖 */
  waypoints: Vector3[]
}

const Y_AXIS = new Vector3(0, 1, 0)
const DUPLICATE_EPS = 1e-3

function pushUnique(list: Vector3[], point: Vector3) {
  const last = list[list.length - 1]
  if (last && last.distanceTo(point) < DUPLICATE_EPS) return
  list.push(point)
}

/**
 * 좌석에서 출입문까지의 도보 경로를 만든다.
 * - 팀원: 스툴 뒤(책상 반대편)로 뛰어내려 → 그 열의 통로를 따라 문이 있는 앞쪽 복도(door.z)까지 →
 *   복도를 따라 문 안쪽 → 문 밖.
 * - 팀장(wide): 뒷벽 쪽으로는 공간이 없어 책상 왼쪽 끝을 돌아 → 파티션 앞 복도 → 옆벽 통로 → 문.
 */
export function buildEscortPath(args: {
  seat: { position: [number, number, number]; rotationY: number; wide: boolean }
  seatHeight: number
  robotLocalZ: number
  floor: { minX: number; maxX: number; minZ: number; maxZ: number }
  /** 벽에서 통로까지의 여백 — 착지점 클램프와 벽 따라 걷는 x에 함께 쓴다 */
  aisleMargin: number
  /** 문 안쪽 통로 x(옆벽에서 aisleMargin만큼 안쪽)와 문 밖 x, 문의 z */
  door: { insideX: number; outsideX: number; z: number }
  /** 팀장 자리일 때만: 책상 앞과 파티션 사이 복도의 z, 책상 반폭 */
  lead: { corridorZ: number; halfWidth: number } | null
}): EscortPath {
  const { seat, floor, door } = args
  const margin = args.aisleMargin
  const clampX = (x: number) => MathUtils.clamp(x, floor.minX + margin, floor.maxX - margin)
  const clampZ = (z: number) => MathUtils.clamp(z, floor.minZ + margin, floor.maxZ - margin)

  const seatPos = new Vector3(...seat.position)
  const away = new Vector3(0, 0, 1).applyAxisAngle(Y_AXIS, seat.rotationY)
  const start = new Vector3(0, 0, args.robotLocalZ).applyAxisAngle(Y_AXIS, seat.rotationY).add(seatPos)
  start.y = args.seatHeight

  const landing = start.clone().addScaledVector(away, 0.62)
  landing.set(clampX(landing.x), 0, clampZ(landing.z))

  const waypoints: Vector3[] = []
  if (seat.wide && args.lead) {
    const aroundX = seatPos.x - args.lead.halfWidth - 0.45
    pushUnique(waypoints, new Vector3(aroundX, 0, landing.z))
    pushUnique(waypoints, new Vector3(aroundX, 0, args.lead.corridorZ))
    pushUnique(waypoints, new Vector3(door.insideX, 0, args.lead.corridorZ))
  } else {
    pushUnique(waypoints, new Vector3(landing.x, 0, door.z))
  }
  pushUnique(waypoints, new Vector3(door.insideX, 0, door.z))
  pushUnique(waypoints, new Vector3(door.outsideX, 0, door.z))

  return { start, landing, waypoints }
}

type Phase = "greet" | "hop" | "walk" | "gone"

const GREET_DURATION = 1.05
const HOP_DURATION = 0.5
const HOP_ARC = 0.36
const TURN_SPEED = 9
const DOOR_TRIGGER_DISTANCE = 1.5
const EXIT_HOLD = 0.35
// 먼 자리에서도 3초 안팎에 문에 닿게 속도를 거리로 정한다. 빠르면 걷기 대신 뛰기 클립.
const WALK_TARGET_SECONDS = 2.8
const MIN_SPEED = 1.7
const MAX_SPEED = 3.1
const RUN_THRESHOLD = 2.4

function facingFor(dx: number, dz: number) {
  // 모델 시선이 로컬 -Z이므로 진행 방향 d를 보려면 yaw = atan2(-dx, -dz)
  return Math.atan2(-dx, -dz)
}

function turnToward(current: number, target: number, delta: number) {
  const shortest = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return MathUtils.damp(current, current + shortest, TURN_SPEED, delta)
}

/**
 * 메뉴/하위 메뉴를 고르면 그 책상의 로봇 대신 씬 최상위에 그려지는 "안내 로봇".
 * 스툴 위에서 "따라오세요!" 인사 → 뛰어내림 → 경로를 따라 문까지 → 문 열고 나가며
 * 사라짐 → `onExit`. 위치는 `positionRef`로 매 프레임 공유해 카메라가 따라가게 한다.
 */
export function TopologyEscortRobot({
  path,
  skinIndex,
  speechTitle,
  speechDetail,
  doorOpenRef,
  positionRef,
  onExit,
}: {
  path: EscortPath
  skinIndex: number
  speechTitle: string
  speechDetail: string
  doorOpenRef: MutableRefObject<number>
  positionRef: MutableRefObject<Vector3 | null>
  onExit: () => void
}) {
  const { camera } = useThree()
  const groupRef = useRef<Group>(null)
  const yawRef = useRef<Group>(null)
  const skin = useMemo(() => skinFor(skinIndex), [skinIndex])

  const [phase, setPhase] = useState<Phase>("greet")
  const [speechVisible, setSpeechVisible] = useState(true)
  const phaseRef = useRef<Phase>("greet")
  const elapsed = useRef(0)
  const facing = useRef(0)
  const segment = useRef(0)
  const exitedAt = useRef<number | null>(null)
  const exitCalled = useRef(false)
  const fadeMaterials = useRef<MeshStandardMaterial[] | null>(null)
  const scratch = useRef(new Vector3())

  const totalLength = useMemo(() => {
    let length = 0
    let prev = path.landing
    for (const point of path.waypoints) {
      length += prev.distanceTo(point)
      prev = point
    }
    return length
  }, [path])
  const speed = MathUtils.clamp(totalLength / WALK_TARGET_SECONDS, MIN_SPEED, MAX_SPEED)
  const walkClip = speed > RUN_THRESHOLD ? RUN_CLIP : WALK_CLIP
  const doorInside = path.waypoints[path.waypoints.length - 2] ?? path.landing
  const doorOutside = path.waypoints[path.waypoints.length - 1] ?? path.landing

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.position.copy(path.start)
    // 좌석 로봇은 이미 카메라를 보고 있었으므로 같은 방향으로 시작해 교체가 튀지 않게 한다
    facing.current = facingFor(camera.position.x - path.start.x, camera.position.z - path.start.z)
    if (yawRef.current) yawRef.current.rotation.y = facing.current
    positionRef.current = group.position
    return () => {
      positionRef.current = null
      doorOpenRef.current = 0
    }
  }, [path, positionRef, doorOpenRef, camera])

  function goTo(next: Phase) {
    phaseRef.current = next
    elapsed.current = 0
    setPhase(next)
  }

  function collectFadeMaterials(group: Group) {
    const materials: MeshStandardMaterial[] = []
    group.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of list) {
        if (material instanceof MeshStandardMaterial) {
          // 불투명으로 컴파일된 셰이더는 OPAQUE 정의로 alpha를 1로 고정한다 —
          // transparent만 바꾸면 opacity가 무시되므로 프로그램을 다시 만들게 한다.
          material.transparent = true
          material.needsUpdate = true
          materials.push(material)
        }
      }
    })
    return materials
  }

  useFrame((_, rawDelta) => {
    const group = groupRef.current
    const yaw = yawRef.current
    if (!group || !yaw) return
    const delta = Math.min(rawDelta, 0.05)
    elapsed.current += delta
    const current = phaseRef.current

    if (current === "greet") {
      const dx = camera.position.x - group.position.x
      const dz = camera.position.z - group.position.z
      facing.current = turnToward(facing.current, facingFor(dx, dz), delta)
      if (elapsed.current >= GREET_DURATION) goTo("hop")
    } else if (current === "hop") {
      const t = MathUtils.clamp(elapsed.current / HOP_DURATION, 0, 1)
      const ease = t * t * (3 - 2 * t)
      group.position.lerpVectors(path.start, path.landing, ease)
      group.position.y += Math.sin(t * Math.PI) * HOP_ARC
      facing.current = turnToward(
        facing.current,
        facingFor(path.landing.x - path.start.x, path.landing.z - path.start.z),
        delta
      )
      if (t >= 1) {
        group.position.copy(path.landing)
        segment.current = 0
        goTo("walk")
      }
    } else if (current === "walk") {
      let remaining = speed * delta
      while (remaining > 0 && segment.current < path.waypoints.length) {
        const target = path.waypoints[segment.current]
        const toTarget = scratch.current.subVectors(target, group.position)
        toTarget.y = 0
        const distance = toTarget.length()
        if (distance <= remaining) {
          group.position.copy(target)
          remaining -= distance
          segment.current += 1
        } else {
          toTarget.multiplyScalar(remaining / distance)
          group.position.add(toTarget)
          facing.current = turnToward(facing.current, facingFor(toTarget.x, toTarget.z), delta)
          remaining = 0
        }
      }

      const toDoor = group.position.distanceTo(doorInside)
      if (toDoor < DOOR_TRIGGER_DISTANCE) doorOpenRef.current = 1

      // 문 안쪽 → 문 밖 구간에서 서서히 사라진다
      const exitLength = doorInside.distanceTo(doorOutside)
      if (segment.current >= path.waypoints.length - 1 && exitLength > 0) {
        if (!fadeMaterials.current) {
          fadeMaterials.current = collectFadeMaterials(group)
          setSpeechVisible(false)
        }
        const progress = MathUtils.clamp(1 - group.position.distanceTo(doorOutside) / exitLength, 0, 1)
        for (const material of fadeMaterials.current) material.opacity = 1 - progress
      }

      if (segment.current >= path.waypoints.length) {
        doorOpenRef.current = 0
        exitedAt.current = elapsed.current
        goTo("gone")
      }
    } else if (current === "gone") {
      if (!exitCalled.current && exitedAt.current != null && elapsed.current >= EXIT_HOLD) {
        exitCalled.current = true
        onExit()
      }
    }

    yaw.rotation.y = facing.current
  })

  const clip = phase === "greet" ? GREET_CLIP : phase === "hop" ? JUMP_CLIP : walkClip
  const timeScale = phase === "walk" ? MathUtils.clamp(speed / 1.9, 0.9, 1.6) : 1

  return (
    <group ref={groupRef} position={path.start}>
      <group ref={yawRef}>
        <RobotModel skin={skin} clip={clip} timeScale={timeScale} />
      </group>
      {phase !== "gone" && speechVisible ? <RobotSpeech title={speechTitle} detail={speechDetail} /> : null}
    </group>
  )
}
