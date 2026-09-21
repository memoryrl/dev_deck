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
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { SkeletonUtils } from "three-stdlib"
import {
  Color,
  MathUtils,
  MeshStandardMaterial,
  Vector3,
  type Bone,
  type Group,
  type Material,
  type Mesh,
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

const ROBOT_X = 0.55
const ROBOT_Y = -1.5

// 인트로: 얼굴 클로즈업 → 상반신. 사용자 줌은 이 거리에 곱해진다.
const INTRO_MS = 2200
const LOOK_AT_CLOSE = new Vector3(ROBOT_X, 1.25, 0)
const LOOK_AT_FAR = new Vector3(ROBOT_X, 0.62, 0)
const CAM_CLOSE = { x: 0.28, y: 1.38, z: 1.75 }
const CAM_FAR_DESKTOP = { x: 0.2, y: 0.74, z: 4.25 }
const CAM_FAR_MOBILE = { x: 0.05, y: 0.72, z: 7.6 }
const CAMERA_FOV = 35

const ZOOM_MIN = 0.65
const ZOOM_MAX = 1.7
const ZOOM_STEP = 0.12

// 사이트 배경 토큰에 맞춤 (노란 스테이지 제거)
const STAGE_LIGHT = "#f6f1e9"
const STAGE_DARK = "#12100e"

const SKIN_LIGHT = { main: "#2f8f86", grey: "#d7ebe7", black: "#1a3f3b" }
const SKIN_DARK = { main: "#e08a3c", grey: "#efe0c8", black: "#3d291c" }

const LOOK_YAW = 0.75
const LOOK_PITCH = 0.42
const LOOK_NECK = 0.48
const LOOK_SMOOTH = 7

type PointerTarget = { x: number; y: number }
type Skin = { main: string; grey: string; black: string }
type CamPose = { x: number; y: number; z: number }

function tintClone(material: Material, skin: Skin): Material {
  const cloned = material.clone()
  if (!(cloned instanceof MeshStandardMaterial)) return cloned
  if (cloned.name === "Main") cloned.color = new Color(skin.main)
  else if (cloned.name === "Grey") cloned.color = new Color(skin.grey)
  else if (cloned.name === "Black") {
    cloned.color = new Color(skin.black)
    cloned.roughness = 0.12
    cloned.metalness = 0.7
  }
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

function prepareRobot(source: Group, skin: Skin): Group {
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
      ? mesh.material.map((mat) => tintClone(mat, skin))
      : tintClone(mesh.material, skin)
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
  scale = MODEL_SCALE,
}: {
  pointer: MutableRefObject<PointerTarget>
  skin: Skin
  scale?: number
}) {
  const { scene } = useGLTF(MODEL_URL)
  const robot = useMemo(() => prepareRobot(scene as Group, skin), [scene, skin])
  const groupRef = useRef<Group>(null)
  const headRef = useRef<Bone | null>(null)
  const neckRef = useRef<Bone | null>(null)
  const look = useRef({ yaw: 0, pitch: 0 })
  const baseHead = useRef({ x: 0, y: 0, z: 0 })
  const baseNeck = useRef({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    headRef.current = findBone(robot, "Head")
    neckRef.current = findBone(robot, "Neck")
    if (headRef.current) {
      baseHead.current = {
        x: headRef.current.rotation.x,
        y: headRef.current.rotation.y,
        z: headRef.current.rotation.z,
      }
    }
    if (neckRef.current) {
      baseNeck.current = {
        x: neckRef.current.rotation.x,
        y: neckRef.current.rotation.y,
        z: neckRef.current.rotation.z,
      }
    }
  }, [robot])

  useFrame((state, delta) => {
    // 터치/포인터 위치와 같은 방향으로 보도록 부호를 맞춘다(대각선 반대 시선 수정).
    const targetYaw = MathUtils.clamp(-pointer.current.x, -1, 1) * LOOK_YAW
    const targetPitch = MathUtils.clamp(pointer.current.y, -1, 1) * LOOK_PITCH
    look.current.yaw = MathUtils.damp(look.current.yaw, targetYaw, LOOK_SMOOTH, delta)
    look.current.pitch = MathUtils.damp(look.current.pitch, targetPitch, LOOK_SMOOTH, delta)

    if (groupRef.current) {
      groupRef.current.position.y = ROBOT_Y + Math.sin(state.clock.elapsedTime * 1.4) * 0.03
    }

    if (neckRef.current) {
      neckRef.current.rotation.y = baseNeck.current.y + look.current.yaw * LOOK_NECK
      neckRef.current.rotation.x = baseNeck.current.x + look.current.pitch * LOOK_NECK
    }
    if (headRef.current) {
      headRef.current.rotation.y = baseHead.current.y + look.current.yaw
      headRef.current.rotation.x = baseHead.current.x + look.current.pitch
    }
  })

  return (
    <group ref={groupRef} position={[ROBOT_X, ROBOT_Y, 0]}>
      <group scale={scale} rotation={[0, MODEL_FACING_OFFSET, 0]}>
        <primitive object={robot} />
      </group>
    </group>
  )
}

function CameraRig({
  zoomRef,
  farCam,
}: {
  zoomRef: MutableRefObject<number>
  farCam: CamPose
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
    const baseZ = MathUtils.lerp(CAM_CLOSE.z, farCam.z, intro)
    const z = baseZ / zoom
    const y = MathUtils.lerp(CAM_CLOSE.y, farCam.y, intro)
    const x = MathUtils.lerp(CAM_CLOSE.x, farCam.x, intro)

    posScratch.current.set(x, y, z)
    lookScratch.current.lerpVectors(LOOK_AT_CLOSE, LOOK_AT_FAR, intro)

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
    <div className="pointer-events-auto absolute bottom-5 right-4 z-20 flex flex-col gap-2 md:bottom-8 md:right-6">
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
  const skin = dark ? SKIN_DARK : SKIN_LIGHT
  const stage = dark ? STAGE_DARK : STAGE_LIGHT
  const pointer = useRef<PointerTarget>({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const [zoom, setZoom] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null)

  const farCam = isMobile ? CAM_FAR_MOBILE : CAM_FAR_DESKTOP

  const applyZoom = useCallback((next: number) => {
    const clamped = MathUtils.clamp(next, ZOOM_MIN, ZOOM_MAX)
    zoomRef.current = clamped
    setZoom(clamped)
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
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
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
      if (event.touches.length === 2) {
        pinchStart.current = { dist: touchDist(event.touches), zoom: zoomRef.current }
      }
    }
    const onTouchMove = (event: TouchEvent) => {
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

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("touchcancel", onTouchEnd)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [applyZoom])

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" aria-hidden>
        <Canvas
          camera={{
            position: [CAM_CLOSE.x, CAM_CLOSE.y, CAM_CLOSE.z],
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
            camera.lookAt(LOOK_AT_CLOSE)
            gl.setClearColor(new Color(stage), 1)
          }}
        >
          <color attach="background" args={[stage]} />
          <ambientLight intensity={dark ? 0.55 : 0.85} />
          <directionalLight position={[2.8, 3.6, 3.2]} intensity={dark ? 1.85 : 2.25} color="#fff7ea" />
          <directionalLight position={[-2.4, 1.8, 1.6]} intensity={0.7} color="#9eb8c8" />
          <pointLight position={[ROBOT_X, 1.2, 1.6]} intensity={dark ? 0.7 : 0.45} color="#c4a574" distance={7} />
          <CameraRig zoomRef={zoomRef} farCam={farCam} />
          <Suspense fallback={null}>
            <LoginRobot pointer={pointer} skin={skin} scale={isMobile ? 0.56 : MODEL_SCALE} />
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
