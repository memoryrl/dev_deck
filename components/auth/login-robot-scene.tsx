"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react"
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { SkeletonUtils } from "three-stdlib"
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  MathUtils,
  MeshStandardMaterial,
  Vector3,
  type Bone,
  type Group,
  type Material,
  type Mesh,
  type WebGLProgramParametersWithUniforms,
  type Object3D,
  type PerspectiveCamera,
  type SkinnedMesh,
} from "three"
import { useTopologyDark } from "@/components/landing/hero-topology/topology-theme"
import { ZoomIn, ZoomOut } from "lucide-react"
import { cn } from "@/lib/utils"

// quaternius.itch.io/lowpoly-robot (CC0)
const MODEL_URL = "/models/robot.glb"
const MODEL_SCALE = 0.72
const MODEL_FACING_OFFSET = 0

const ROBOT_X_DESKTOP = 0.82
const ROBOT_X_MOBILE = 0
const ROBOT_Y = -1.5

// 인트로: 얼굴 클로즈업 → 상반신. 사용자 줌은 이 거리에 곱해진다.
const INTRO_MS = 2200
const LOOK_AT_CLOSE_DESKTOP = new Vector3(ROBOT_X_DESKTOP, 1.25, 0)
// 시선 중심을 로봇보다 왼쪽에 두면 와이드에서 로봇이 우측에 걸린다.
const LOOK_AT_FAR_DESKTOP = new Vector3(0.38, 0.58, 0)
const LOOK_AT_CLOSE_MOBILE = new Vector3(ROBOT_X_MOBILE, 1.25, 0)
// 시선을 얼굴보다 아래로 두면 로봇이 화면 중상단에 걸린다(하단은 로그인 패널).
const LOOK_AT_FAR_MOBILE = new Vector3(ROBOT_X_MOBILE, -0.08, 0)
const CAM_CLOSE_DESKTOP = { x: 0.58, y: 1.38, z: 1.75 }
const CAM_CLOSE_MOBILE = { x: 0, y: 1.38, z: 1.75 }
const CAM_FAR_DESKTOP = { x: 0.12, y: 0.74, z: 4.45 }
const CAM_FAR_MOBILE = { x: 0, y: 0.92, z: 6.6 }
const CAMERA_FOV = 35

const ZOOM_MIN = 0.65
const ZOOM_MAX = 1.7
const ZOOM_STEP = 0.12

// 사이트 배경 토큰에 맞춤 (노란 스테이지 제거)
const STAGE_LIGHT = "#f6f1e9"
const STAGE_DARK = "#12100e"

type PointerTarget = { x: number; y: number }
type Skin = { main: string; grey: string; black: string }
type CamPose = { x: number; y: number; z: number }

// 라이트(parchment)·다크(잉크) 모두에서 묻히지 않는 중채도 팔레트
// main=몸통(채도 중), grey=패널(중명도), black=관절(어두움) — 테마와 무관
const ROBOT_SKINS: Skin[] = [
  { main: "#2f8f86", grey: "#a8c4be", black: "#1a3a36" },
  { main: "#e07a32", grey: "#c9a888", black: "#4a2a12" },
  { main: "#3a86c8", grey: "#8eacc8", black: "#1a3c5c" },
  { main: "#d14b66", grey: "#c898a4", black: "#5a2234" },
  { main: "#4f9e4a", grey: "#96b88e", black: "#274a24" },
  { main: "#c44f96", grey: "#c090b0", black: "#5a2848" },
  { main: "#3f73c7", grey: "#8fa0c8", black: "#243a68" },
  { main: "#c97a2a", grey: "#c4a878", black: "#543c14" },
  { main: "#2eada0", grey: "#7eb8ae", black: "#1a524c" },
  { main: "#7a5a2e", grey: "#b8a078", black: "#3a2c18" },
]

function pickRandomSkin(): Skin {
  return ROBOT_SKINS[Math.floor(Math.random() * ROBOT_SKINS.length)]
}

const LOOK_YAW = 0.75
const LOOK_PITCH = 0.42
const LOOK_NECK = 0.48
const LOOK_SMOOTH = 7

// 다크 모드 후광 색 — 피부 색을 밝게 띄워서 로봇마다 자기 색의 빛이 번지게 한다.
function haloColor(skin: Skin) {
  return `#${new Color(skin.main).lerp(new Color("#ffffff"), 0.35).getHexString()}`
}

// 윤곽(림) 발광: 카메라를 비스듬히 보는 면일수록 emissive를 더해 테두리가 빛나 보이게 한다.
// 면 법선은 flatShading 여부와 상관없이 프래그먼트에서 이미 계산된 `normal`을 쓴다.
function addRimGlow(material: MeshStandardMaterial, rim: string) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.rimColor = { value: new Color(rim) }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 rimColor;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float rimFactor = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.6);
        totalEmissiveRadiance += rimColor * rimFactor * 1.35;`
      )
  }
  material.customProgramCacheKey = () => "login-robot-rim"
}

function tintClone(material: Material, skin: Skin, rim: string | null): Material {
  const cloned = material.clone()
  if (!(cloned instanceof MeshStandardMaterial)) return cloned
  if (cloned.name === "Main") cloned.color = new Color(skin.main)
  else if (cloned.name === "Grey") cloned.color = new Color(skin.grey)
  else if (cloned.name === "Black") {
    cloned.color = new Color(skin.black)
    cloned.roughness = 0.12
    cloned.metalness = 0.7
  }
  if (rim) addRimGlow(cloned, rim)
  return cloned
}

function findBone(root: Object3D, name: string): Bone | null {
  let found: Bone | null = null
  root.traverse((child) => {
    if (found) return
    const bone = child as Bone
    if (bone.isBone && bone.name === name) found = bone
  })
  return found
}

function findMesh(root: Object3D, name: string): Mesh | null {
  let found: Mesh | null = null
  root.traverse((child) => {
    if (found) return
    const mesh = child as Mesh
    if (mesh.isMesh && mesh.name === name) found = mesh
  })
  return found
}

type EulerPose = { x: number; y: number; z: number }

function capturePose(node: Object3D | null): EulerPose {
  if (!node) return { x: 0, y: 0, z: 0 }
  return { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z }
}

type BodyPart = "head" | "torso" | "armL" | "armR" | "legL" | "legR"

function partFromHit(object: Object3D): BodyPart | null {
  let node: Object3D | null = object
  while (node) {
    switch (node.name) {
      case "Head":
      case "Neck":
        return "head"
      case "Torso":
      case "Body":
      case "Abdomen":
      case "Hips":
        return "torso"
      case "Shoulder.L":
      case "Arm.L":
      case "UpperArm.L":
      case "LowerArm.L":
        return "armL"
      case "Shoulder.R":
      case "Arm.R":
      case "UpperArm.R":
      case "LowerArm.R":
        return "armR"
      case "Leg.L":
      case "UpperLeg.L":
      case "LowerLeg.L":
      case "Foot.L":
        return "legL"
      case "Leg.R":
      case "UpperLeg.R":
      case "LowerLeg.R":
      case "Foot.R":
        return "legR"
      default:
        node = node.parent
    }
  }
  return null
}

const TICKLE_MS = 780
const BREATH_HZ = 1.45

type Tickle = { until: number; seed: number }

function tickleWave(tickles: Partial<Record<BodyPart, Tickle>>, part: BodyPart, now: number, freq: number) {
  const tk = tickles[part]
  if (!tk) return 0
  const remaining = tk.until - now
  if (remaining <= 0) {
    delete tickles[part]
    return 0
  }
  const u = 1 - remaining / TICKLE_MS
  const env = Math.exp(-u * 3.4) * (1 - u * 0.35)
  return env * Math.sin(now * 0.001 * freq + tk.seed)
}

function prepareRobot(source: Group, skin: Skin, rim: string | null): Group {
  const cloned = SkeletonUtils.clone(source) as Group
  const removeList: Object3D[] = []
  cloned.traverse((child) => {
    const skinned = child as SkinnedMesh
    if (skinned.isSkinnedMesh) {
      removeList.push(child)
      return
    }
    if (child.name === "HandL" || child.name === "HandR" || child.name === "Hand.L" || child.name === "Hand.R") {
      removeList.push(child)
      return
    }
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.frustumCulled = false
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((mat) => tintClone(mat, skin, rim))
      : tintClone(mesh.material, skin, rim)
  })
  for (const node of removeList) node.parent?.remove(node)
  return cloned
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function LoginRobot({
  pointer,
  skin,
  rim,
  robotX,
  scale = MODEL_SCALE,
}: {
  pointer: MutableRefObject<PointerTarget>
  skin: Skin
  rim: string | null
  robotX: number
  scale?: number
}) {
  const { scene } = useGLTF(MODEL_URL)
  const robot = useMemo(() => prepareRobot(scene as Group, skin, rim), [scene, skin, rim])
  const groupRef = useRef<Group>(null)
  const bones = useRef({
    head: null as Bone | null,
    neck: null as Bone | null,
    body: null as Bone | null,
    abdomen: null as Bone | null,
    torso: null as Bone | null,
    shoulderL: null as Bone | null,
    shoulderR: null as Bone | null,
    upperArmL: null as Bone | null,
    upperArmR: null as Bone | null,
    lowerArmL: null as Bone | null,
    lowerArmR: null as Bone | null,
    upperLegL: null as Bone | null,
    upperLegR: null as Bone | null,
    lowerLegL: null as Bone | null,
    lowerLegR: null as Bone | null,
  })
  const torsoMesh = useRef<Mesh | null>(null)
  const base = useRef({
    head: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    body: { x: 0, y: 0, z: 0 },
    abdomen: { x: 0, y: 0, z: 0 },
    torso: { x: 0, y: 0, z: 0 },
    shoulderL: { x: 0, y: 0, z: 0 },
    shoulderR: { x: 0, y: 0, z: 0 },
    upperArmL: { x: 0, y: 0, z: 0 },
    upperArmR: { x: 0, y: 0, z: 0 },
    lowerArmL: { x: 0, y: 0, z: 0 },
    lowerArmR: { x: 0, y: 0, z: 0 },
    upperLegL: { x: 0, y: 0, z: 0 },
    upperLegR: { x: 0, y: 0, z: 0 },
    lowerLegL: { x: 0, y: 0, z: 0 },
    lowerLegR: { x: 0, y: 0, z: 0 },
    torsoScale: { x: 1, y: 1, z: 1 },
  })
  const look = useRef({ yaw: 0, pitch: 0 })
  const tickles = useRef<Partial<Record<BodyPart, Tickle>>>({})

  useEffect(() => {
    const b = bones.current
    b.head = findBone(robot, "Head")
    b.neck = findBone(robot, "Neck")
    b.body = findBone(robot, "Body")
    b.abdomen = findBone(robot, "Abdomen")
    b.torso = findBone(robot, "Torso")
    b.shoulderL = findBone(robot, "Shoulder.L")
    b.shoulderR = findBone(robot, "Shoulder.R")
    b.upperArmL = findBone(robot, "UpperArm.L")
    b.upperArmR = findBone(robot, "UpperArm.R")
    b.lowerArmL = findBone(robot, "LowerArm.L")
    b.lowerArmR = findBone(robot, "LowerArm.R")
    b.upperLegL = findBone(robot, "UpperLeg.L")
    b.upperLegR = findBone(robot, "UpperLeg.R")
    b.lowerLegL = findBone(robot, "LowerLeg.L")
    b.lowerLegR = findBone(robot, "LowerLeg.R")
    torsoMesh.current = findMesh(robot, "Torso")
    const pose = base.current
    pose.head = capturePose(b.head)
    pose.neck = capturePose(b.neck)
    pose.body = capturePose(b.body)
    pose.abdomen = capturePose(b.abdomen)
    pose.torso = capturePose(b.torso)
    pose.shoulderL = capturePose(b.shoulderL)
    pose.shoulderR = capturePose(b.shoulderR)
    pose.upperArmL = capturePose(b.upperArmL)
    pose.upperArmR = capturePose(b.upperArmR)
    pose.lowerArmL = capturePose(b.lowerArmL)
    pose.lowerArmR = capturePose(b.lowerArmR)
    pose.upperLegL = capturePose(b.upperLegL)
    pose.upperLegR = capturePose(b.upperLegR)
    pose.lowerLegL = capturePose(b.lowerLegL)
    pose.lowerLegR = capturePose(b.lowerLegR)
    if (torsoMesh.current) {
      pose.torsoScale = {
        x: torsoMesh.current.scale.x,
        y: torsoMesh.current.scale.y,
        z: torsoMesh.current.scale.z,
      }
    }
  }, [robot])

  const { camera, gl } = useThree()
  const faceNdc = useRef(new Vector3())

  const poke = (event: ThreeEvent<PointerEvent>) => {
    const part = partFromHit(event.object)
    if (!part) return
    event.stopPropagation()
    const now = performance.now()
    const existing = tickles.current[part]
    if (existing && existing.until > now + 180) {
      existing.until = now + TICKLE_MS
      return
    }
    tickles.current[part] = { until: now + TICKLE_MS, seed: Math.random() * Math.PI * 2 }
  }

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const now = performance.now()
    const b = bones.current
    const pose = base.current
    const tk = tickles.current

    faceNdc.current.set(robotX, 1.25, 0).project(camera)
    const dx = pointer.current.x - faceNdc.current.x
    const dy = pointer.current.y + faceNdc.current.y
    const targetYaw = MathUtils.clamp(dx, -1, 1) * LOOK_YAW
    const targetPitch = MathUtils.clamp(dy, -1, 1) * LOOK_PITCH
    look.current.yaw = MathUtils.damp(look.current.yaw, targetYaw, LOOK_SMOOTH, delta)
    look.current.pitch = MathUtils.damp(look.current.pitch, targetPitch, LOOK_SMOOTH, delta)

    // 숨: 느린 들숨·날숨 + 아주 작은 좌우 무게이동
    const breath = Math.sin(t * BREATH_HZ)
    const inhale = breath * 0.5 + 0.5
    const sway = Math.sin(t * 0.72) * 0.018
    const headTkY = tickleWave(tk, "head", now, 46)
    const headTkX = tickleWave(tk, "head", now, 58)
    const headTkZ = tickleWave(tk, "head", now, 67)
    const torsoTk = tickleWave(tk, "torso", now, 40)
    const armLTk = tickleWave(tk, "armL", now, 44)
    const armRTk = tickleWave(tk, "armR", now, 47)
    const legLTk = tickleWave(tk, "legL", now, 41)
    const legRTk = tickleWave(tk, "legR", now, 43)

    if (groupRef.current) {
      groupRef.current.position.y = ROBOT_Y + breath * 0.038 + Math.sin(t * 0.9) * 0.012
      groupRef.current.rotation.z = sway
    }

    if (b.body) {
      b.body.rotation.x = pose.body.x + inhale * 0.03 + torsoTk * 0.12
      b.body.rotation.z = pose.body.z + sway * 0.6 + torsoTk * 0.2
    }
    if (b.abdomen) {
      b.abdomen.rotation.x = pose.abdomen.x + inhale * 0.04 + torsoTk * 0.16
    }
    if (b.torso) {
      b.torso.rotation.x = pose.torso.x + inhale * 0.025 + torsoTk * 0.1
    }
    if (torsoMesh.current) {
      const s = pose.torsoScale
      const pulse = 1 + inhale * 0.045 + Math.abs(torsoTk) * 0.08
      torsoMesh.current.scale.set(s.x * (1 + inhale * 0.028), s.y * pulse, s.z * (1 + inhale * 0.032))
    }

    if (b.shoulderL) {
      b.shoulderL.rotation.z = pose.shoulderL.z - inhale * 0.05 + armLTk * 0.35
      b.shoulderL.rotation.x = pose.shoulderL.x + armLTk * 0.18
    }
    if (b.shoulderR) {
      b.shoulderR.rotation.z = pose.shoulderR.z + inhale * 0.05 + armRTk * 0.35
      b.shoulderR.rotation.x = pose.shoulderR.x + armRTk * 0.18
    }
    if (b.upperArmL) {
      b.upperArmL.rotation.z = pose.upperArmL.z + armLTk * 0.55
      b.upperArmL.rotation.x = pose.upperArmL.x + Math.sin(t * 0.9) * 0.03 + armLTk * 0.28
    }
    if (b.upperArmR) {
      b.upperArmR.rotation.z = pose.upperArmR.z + armRTk * 0.55
      b.upperArmR.rotation.x = pose.upperArmR.x + Math.sin(t * 0.9 + 0.4) * 0.03 + armRTk * 0.28
    }
    if (b.lowerArmL) b.lowerArmL.rotation.x = pose.lowerArmL.x + armLTk * 0.4
    if (b.lowerArmR) b.lowerArmR.rotation.x = pose.lowerArmR.x + armRTk * 0.4

    if (b.upperLegL) {
      b.upperLegL.rotation.x = pose.upperLegL.x + Math.sin(t * 0.9) * 0.02 + legLTk * 0.45
      b.upperLegL.rotation.z = pose.upperLegL.z + legLTk * 0.22
    }
    if (b.upperLegR) {
      b.upperLegR.rotation.x = pose.upperLegR.x + Math.sin(t * 0.9 + 0.6) * 0.02 + legRTk * 0.45
      b.upperLegR.rotation.z = pose.upperLegR.z + legRTk * 0.22
    }
    if (b.lowerLegL) b.lowerLegL.rotation.x = pose.lowerLegL.x + legLTk * 0.3
    if (b.lowerLegR) b.lowerLegR.rotation.x = pose.lowerLegR.x + legRTk * 0.3

    if (b.neck) {
      b.neck.rotation.y = pose.neck.y + look.current.yaw * LOOK_NECK + headTkY * 0.2
      b.neck.rotation.x = pose.neck.x + look.current.pitch * LOOK_NECK + headTkX * 0.18 + inhale * 0.02
      b.neck.rotation.z = pose.neck.z + headTkZ * 0.22
    }
    if (b.head) {
      b.head.rotation.y = pose.head.y + look.current.yaw + headTkY * 0.55
      b.head.rotation.x = pose.head.x + look.current.pitch + headTkX * 0.4
      b.head.rotation.z = pose.head.z + headTkZ * 0.5 + sway * 0.4
    }
  })

  return (
    <group ref={groupRef} position={[robotX, ROBOT_Y, 0]}>
      <group
        scale={scale}
        rotation={[0, MODEL_FACING_OFFSET, 0]}
        onPointerDown={poke}
        onPointerMove={(event) => {
          if (event.buttons === 0 && event.pointerType !== "touch") return
          poke(event)
        }}
        onPointerOver={() => {
          gl.domElement.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          gl.domElement.style.cursor = "default"
        }}
      >
        <primitive object={robot} />
      </group>
    </group>
  )
}

// 로봇 뒤에 깔리는 방사형 후광. 배경이 거의 검정인 다크 모드에서 실루엣이 묻히지 않게 한다.
function RobotHalo({ color, scale, robotX }: { color: string; scale: number; robotX: number }) {
  const texture = useMemo(() => {
    const size = 256
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, "rgba(255,255,255,0.9)")
    gradient.addColorStop(0.35, "rgba(255,255,255,0.4)")
    gradient.addColorStop(0.7, "rgba(255,255,255,0.1)")
    gradient.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    return new CanvasTexture(canvas)
  }, [])

  useEffect(() => () => texture?.dispose(), [texture])
  if (!texture) return null

  return (
    <mesh position={[robotX, ROBOT_Y + 1.7 * scale * 1.4, -1.6]} scale={[1, 1, 1]} renderOrder={-1}>
      <planeGeometry args={[6.2 * scale, 6.2 * scale]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={0.55}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function CameraRig({
  zoomRef,
  closeCam,
  farCam,
  lookAtClose,
  lookAtFar,
}: {
  zoomRef: MutableRefObject<number>
  closeCam: CamPose
  farCam: CamPose
  lookAtClose: Vector3
  lookAtFar: Vector3
}) {
  const { camera } = useThree()
  const started = useRef<number | null>(null)
  const lookScratch = useRef(new Vector3())
  const posScratch = useRef(new Vector3())

  useFrame(() => {
    if (started.current === null) started.current = performance.now()
    const elapsed = performance.now() - started.current
    const intro = easeOutCubic(Math.min(1, elapsed / INTRO_MS))
    const zoom = MathUtils.clamp(zoomRef.current, ZOOM_MIN, ZOOM_MAX)

    // intro 0=얼굴 클로즈업, 1=상반신. 사용자 줌은 카메라 거리에 반영.
    const baseZ = MathUtils.lerp(closeCam.z, farCam.z, intro)
    const z = baseZ / zoom
    const y = MathUtils.lerp(closeCam.y, farCam.y, intro)
    const x = MathUtils.lerp(closeCam.x, farCam.x, intro)

    posScratch.current.set(x, y, z)
    lookScratch.current.lerpVectors(lookAtClose, lookAtFar, intro)

    camera.position.copy(posScratch.current)
    camera.lookAt(lookScratch.current)
    const persp = camera as PerspectiveCamera
    if (persp.isPerspectiveCamera) {
      persp.fov = CAMERA_FOV
      persp.updateProjectionMatrix()
    }
  })

  return null
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
}: {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  return (
    <div className="pointer-events-auto absolute bottom-40 right-4 z-20 flex flex-col gap-2 md:bottom-8 md:right-6">
      <button
        type="button"
        aria-label="Zoom in"
        disabled={zoom >= ZOOM_MAX - 0.001}
        onClick={onZoomIn}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/85 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-card disabled:opacity-40"
        )}
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        disabled={zoom <= ZOOM_MIN + 0.001}
        onClick={onZoomOut}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/85 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-card disabled:opacity-40"
        )}
      >
        <ZoomOut className="h-4 w-4" />
      </button>
    </div>
  )
}

export function LoginRobotScene() {
  const dark = useTopologyDark()
  // 마운트(새로고침)마다 한 번만 고른다. 테마와 무관하게 같은 피부로 대비를 유지한다.
  const [skin] = useState(pickRandomSkin)
  const stage = dark ? STAGE_DARK : STAGE_LIGHT
  const rimColor = useMemo(() => haloColor(skin), [skin])
  const canvasHost = useRef<HTMLDivElement>(null)
  const pointer = useRef<PointerTarget>({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const [zoom, setZoom] = useState(1)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  )
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null)

  const robotX = isMobile ? ROBOT_X_MOBILE : ROBOT_X_DESKTOP
  const closeCam = isMobile ? CAM_CLOSE_MOBILE : CAM_CLOSE_DESKTOP
  const farCam = isMobile ? CAM_FAR_MOBILE : CAM_FAR_DESKTOP
  const lookAtClose = isMobile ? LOOK_AT_CLOSE_MOBILE : LOOK_AT_CLOSE_DESKTOP
  const lookAtFar = isMobile ? LOOK_AT_FAR_MOBILE : LOOK_AT_FAR_DESKTOP

  const applyZoom = useCallback((next: number) => {
    const clamped = MathUtils.clamp(next, ZOOM_MIN, ZOOM_MAX)
    zoomRef.current = clamped
    setZoom(clamped)
  }, [])

  const setPointerFromClient = useCallback((clientX: number, clientY: number) => {
    const el = canvasHost.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.current.y = ((clientY - rect.top) / rect.height) * 2 - 1
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      setPointerFromClient(event.clientX, event.clientY)
    }
    const onWheel = (event: WheelEvent) => {
      // 로그인 카드 위 스크롤은 막고, 배경/캔버스 영역에서만 줌
      const target = event.target as HTMLElement | null
      if (target?.closest("[data-login-card]")) return
      event.preventDefault()
      const delta = event.deltaY > 0 ? -ZOOM_STEP * 0.55 : ZOOM_STEP * 0.55
      applyZoom(zoomRef.current + delta)
    }
    const touchDist = (touches: TouchList) => {
      const a = touches[0]
      const b = touches[1]
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        setPointerFromClient(event.touches[0].clientX, event.touches[0].clientY)
      }
      if (event.touches.length === 2) {
        pinchStart.current = { dist: touchDist(event.touches), zoom: zoomRef.current }
      }
    }
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        setPointerFromClient(event.touches[0].clientX, event.touches[0].clientY)
        return
      }
      if (event.touches.length !== 2 || !pinchStart.current) return
      event.preventDefault()
      const dist = touchDist(event.touches)
      const ratio = dist / Math.max(1, pinchStart.current.dist)
      applyZoom(pinchStart.current.zoom * ratio)
    }
    const onTouchEnd = () => {
      if (!pinchStart.current) return
      pinchStart.current = null
    }

    window.addEventListener("pointerdown", onMove, { passive: true })
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("touchcancel", onTouchEnd)
    return () => {
      window.removeEventListener("pointerdown", onMove)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [applyZoom, setPointerFromClient])

  return (
    <div ref={canvasHost} className="absolute inset-0">
      <div className="absolute inset-0" aria-hidden>
        <Canvas
          camera={{
            position: [closeCam.x, closeCam.y, closeCam.z],
            fov: CAMERA_FOV,
            near: 0.1,
            far: 50,
          }}
          dpr={[1, 1.75]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          style={{ width: "100%", height: "100%", display: "block", background: stage, touchAction: "none" }}
          onCreated={({ camera, gl }) => {
            camera.lookAt(lookAtClose)
            gl.setClearColor(new Color(stage), 1)
          }}
        >
          <color attach="background" args={[stage]} />
          <ambientLight intensity={dark ? 0.75 : 0.85} />
          <directionalLight position={[2.8, 3.6, 3.2]} intensity={dark ? 1.85 : 2.25} color="#fff7ea" />
          <directionalLight position={[-2.4, 1.8, 1.6]} intensity={0.7} color="#9eb8c8" />
          <pointLight position={[robotX, 1.2, 1.6]} intensity={dark ? 0.7 : 0.45} color="#c4a574" distance={7} />
          {/* 다크: 뒤쪽 양옆에서 비추는 림 라이트 + 뒤 후광 + 윤곽 발광 셰이더 */}
          {dark ? (
            <>
              <directionalLight position={[-3.2, 2.4, -2.6]} intensity={2.4} color={rimColor} />
              <directionalLight position={[3.6, 2.0, -2.4]} intensity={2.0} color={rimColor} />
              <RobotHalo color={rimColor} scale={isMobile ? 0.56 / MODEL_SCALE : 1} robotX={robotX} />
            </>
          ) : null}
          <CameraRig
            zoomRef={zoomRef}
            closeCam={closeCam}
            farCam={farCam}
            lookAtClose={lookAtClose}
            lookAtFar={lookAtFar}
          />
          <Suspense fallback={null}>
            <LoginRobot
              pointer={pointer}
              skin={skin}
              rim={dark ? rimColor : null}
              robotX={robotX}
              scale={isMobile ? 0.56 : MODEL_SCALE}
            />
          </Suspense>
        </Canvas>
      </div>
      <ZoomControls
        zoom={zoom}
        onZoomIn={() => applyZoom(zoomRef.current + ZOOM_STEP)}
        onZoomOut={() => applyZoom(zoomRef.current - ZOOM_STEP)}
      />
    </div>
  )
}

useGLTF.preload(MODEL_URL)
