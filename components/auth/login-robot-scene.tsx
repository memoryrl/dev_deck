"use client"

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { ContactShadows, useAnimations, useGLTF } from "@react-three/drei"
import { SkeletonUtils } from "three-stdlib"
import {
  Color,
  MathUtils,
  MeshStandardMaterial,
  type Bone,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
} from "three"
import { useTopologyDark } from "@/components/landing/hero-topology/topology-theme"

// quaternius.itch.io/lowpoly-robot (CC0) — 토폴로지와 동일 에셋
const MODEL_URL = "/models/robot.glb"
const MODEL_SCALE = 0.72
const IDLE_CLIP = "RobotArmature|Robot_Idle"
const FLOATING_MESH_NAMES = new Set(["Hand.L", "Hand.R", "HandL", "HandR"])

// 참고(Chroma형): 단색 배경 위 캐릭터 대비. 라이트=골드 위 딥 틸, 다크=잉크 위 샴페인.
const SKIN_LIGHT = { main: "#2f8f86", grey: "#d7ebe7", black: "#1a3f3b" }
const SKIN_DARK = { main: "#e08a3c", grey: "#efe0c8", black: "#3d291c" }

const LOOK_YAW = 0.75
const LOOK_PITCH = 0.42
const LOOK_NECK = 0.48
const LOOK_SMOOTH = 7

type PointerTarget = { x: number; y: number }
type Skin = { main: string; grey: string; black: string }

function tintClone(material: Material, skin: Skin): Material {
  const cloned = material.clone()
  if (!(cloned instanceof MeshStandardMaterial)) return cloned
  if (cloned.name === "Main") cloned.color = new Color(skin.main)
  else if (cloned.name === "Grey") cloned.color = new Color(skin.grey)
  else if (cloned.name === "Black") {
    cloned.color = new Color(skin.black)
    cloned.roughness = 0.14
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

function LoginRobot({
  pointer,
  skin,
}: {
  pointer: MutableRefObject<PointerTarget>
  skin: Skin
}) {
  const { scene, animations } = useGLTF(MODEL_URL)
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene) as Group, [scene])
  const { actions } = useAnimations(animations, clonedScene)
  const headRef = useRef<Bone | null>(null)
  const neckRef = useRef<Bone | null>(null)
  const look = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (FLOATING_MESH_NAMES.has(child.name)) child.visible = false
    })
    headRef.current = findBone(clonedScene, "Head")
    neckRef.current = findBone(clonedScene, "Neck")
  }, [clonedScene])

  useEffect(() => {
    clonedScene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.frustumCulled = false
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((mat) => tintClone(mat, skin))
        : tintClone(mesh.material, skin)
    })
  }, [clonedScene, skin])

  useEffect(() => {
    const idle = actions[IDLE_CLIP]
    idle?.reset().fadeIn(0.3).play()
    return () => {
      idle?.fadeOut(0.15)
    }
  }, [actions])

  useFrame((_, delta) => {
    const targetYaw = MathUtils.clamp(pointer.current.x, -1, 1) * LOOK_YAW
    const targetPitch = MathUtils.clamp(-pointer.current.y, -1, 1) * LOOK_PITCH
    look.current.yaw = MathUtils.damp(look.current.yaw, targetYaw, LOOK_SMOOTH, delta)
    look.current.pitch = MathUtils.damp(look.current.pitch, targetPitch, LOOK_SMOOTH, delta)

    if (neckRef.current) {
      neckRef.current.rotation.y += look.current.yaw * LOOK_NECK
      neckRef.current.rotation.x += look.current.pitch * LOOK_NECK
    }
    if (headRef.current) {
      headRef.current.rotation.y += look.current.yaw
      headRef.current.rotation.x += look.current.pitch
    }
  }, 2)

  // 스케일 0.72 실측: 발≈0, 머리≈2.9. 얼굴·상반신이 프레임 중앙에 오도록 내린다.
  return (
    <group position={[0.35, -1.55, 0]}>
      <group scale={MODEL_SCALE} rotation={[0, Math.PI, 0]}>
        <primitive object={clonedScene} />
      </group>
    </group>
  )
}

function LoginLights({ dark }: { dark: boolean }) {
  return (
    <>
      <ambientLight intensity={dark ? 0.45 : 0.7} />
      <directionalLight
        position={[2.6, 3.4, 2.8]}
        intensity={dark ? 1.7 : 2.15}
        color={dark ? "#ffe2b8" : "#fff7ea"}
      />
      <directionalLight position={[-2.4, 1.8, 1.2]} intensity={dark ? 0.55 : 0.75} color="#8eb8c8" />
      <pointLight position={[0.4, 1.6, 1.5]} intensity={dark ? 0.9 : 0.55} color="#ffd089" distance={6} />
    </>
  )
}

export function LoginRobotScene() {
  const dark = useTopologyDark()
  const skin = dark ? SKIN_DARK : SKIN_LIGHT
  // 참고 이미지처럼 단색 스테이지. 브랜드 골드 / 딥 잉크.
  const stage = dark ? "#1a1512" : "#e0b34a"
  const pointer = useRef<PointerTarget>({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [])

  return (
    <Canvas
      camera={{ position: [0.2, 1.15, 2.55], fov: 30, near: 0.1, far: 40 }}
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true,
      }}
      style={{ width: "100%", height: "100%", display: "block", background: stage }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0.35, 1.2, 0)
        gl.setClearColor(new Color(stage), 1)
      }}
    >
      <color attach="background" args={[stage]} />
      <LoginLights dark={dark} />
      <Suspense fallback={null}>
        <LoginRobot pointer={pointer} skin={skin} />
        <ContactShadows
          position={[0.35, -1.54, 0]}
          opacity={dark ? 0.55 : 0.4}
          scale={4.5}
          blur={2.4}
          far={3.5}
          color="#1a1512"
        />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
