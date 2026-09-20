"use client"

import { useEffect, useMemo, useRef, type MutableRefObject } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useAnimations, useGLTF } from "@react-three/drei"
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
import { TOPOLOGY_PALETTE, useTopologyDark } from "@/components/landing/hero-topology/topology-theme"

// 토폴로지와 동일 에셋: quaternius.itch.io/lowpoly-robot (CC0)
const MODEL_URL = "/models/robot.glb"
const MODEL_SCALE = 0.9
const MODEL_FACING_OFFSET = Math.PI
const IDLE_CLIP = "RobotArmature|Robot_Idle"

// 로그인 배경용 — 페이지 parchment/잉크와 대비되는 샴페인· cognac 톤
const SKIN = { main: "#d4a35c", grey: "#efe2cc", black: "#4a3426" }

const FLOATING_MESH_NAMES = new Set(["Hand.L", "Hand.R", "HandL", "HandR"])

const LOOK_YAW = 0.62
const LOOK_PITCH = 0.36
const LOOK_NECK = 0.4
const LOOK_SMOOTH = 6

// 발 기준 y=0일 때 머리·가슴 높이(스케일 0.9 실측). 카메라가 얼굴·상반신을 담도록 고정.
const HEAD_Y = 4.02
const LOOK_AT_Y = 3.72
const ROBOT_X = 0.62

type PointerTarget = { x: number; y: number }

function tintClone(material: Material): Material {
  const cloned = material.clone()
  if (!(cloned instanceof MeshStandardMaterial)) return cloned
  if (cloned.name === "Main") cloned.color = new Color(SKIN.main)
  else if (cloned.name === "Grey") cloned.color = new Color(SKIN.grey)
  else if (cloned.name === "Black") {
    cloned.color = new Color(SKIN.black)
    cloned.roughness = 0.12
    cloned.metalness = 0.75
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

function LoginRobot({ pointer }: { pointer: MutableRefObject<PointerTarget> }) {
  const { scene, animations } = useGLTF(MODEL_URL)
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene) as Group, [scene])
  const { actions } = useAnimations(animations, clonedScene)
  const rootRef = useRef<Group>(null)
  const headRef = useRef<Bone | null>(null)
  const neckRef = useRef<Bone | null>(null)
  const look = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (FLOATING_MESH_NAMES.has(child.name)) child.visible = false
    })
    headRef.current = findBone(clonedScene, "Head")
    neckRef.current = findBone(clonedScene, "Neck")

    // 발바닥을 y=0에 맞춘 뒤, 얼굴이 카메라 중심에 오도록 배치한다.
    clonedScene.updateMatrixWorld(true)
    // Box3는 애니메이션 전 바인드 기준 — 실측값으로 발을 맞춘다.
    const root = rootRef.current
    if (root) root.position.set(ROBOT_X, 0, 0)
  }, [clonedScene])

  useEffect(() => {
    clonedScene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((mat) => tintClone(mat))
        : tintClone(mesh.material)
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
  }, [clonedScene])

  useEffect(() => {
    const idle = actions[IDLE_CLIP]
    idle?.reset().fadeIn(0.35).play()
    return () => {
      idle?.fadeOut(0.2)
    }
  }, [actions])

  // mixer(기본 priority 1) 이후에 본 회전을 얹어 idle 포즈 위에 시선을 더한다.
  useFrame((_, delta) => {
    const targetYaw = MathUtils.clamp(pointer.current.x, -1, 1) * LOOK_YAW
    const targetPitch = MathUtils.clamp(-pointer.current.y, -1, 1) * LOOK_PITCH
    look.current.yaw = MathUtils.damp(look.current.yaw, targetYaw, LOOK_SMOOTH, delta)
    look.current.pitch = MathUtils.damp(look.current.pitch, targetPitch, LOOK_SMOOTH, delta)

    const neck = neckRef.current
    if (neck) {
      neck.rotation.y += look.current.yaw * LOOK_NECK
      neck.rotation.x += look.current.pitch * LOOK_NECK
    }
    const head = headRef.current
    if (head) {
      head.rotation.y += look.current.yaw
      head.rotation.x += look.current.pitch
    }
  }, 2)

  return (
    <group ref={rootRef} position={[ROBOT_X, 0, 0]}>
      <group scale={MODEL_SCALE} rotation={[0, MODEL_FACING_OFFSET, 0]} position={[0, 0, 0]}>
        {/* 바인드 포즈 발 min.y ≈ -0.02*scale 보정 — 스케일 그룹 안에서 살짝 올림 */}
        <group position={[0, 0.02, 0]}>
          <primitive object={clonedScene} />
        </group>
      </group>
    </group>
  )
}

function LoginLights({ dark }: { dark: boolean }) {
  return (
    <>
      <ambientLight intensity={dark ? 0.42 : 0.62} />
      <directionalLight
        castShadow
        position={[2.8, HEAD_Y + 1.2, 3.2]}
        intensity={dark ? 1.55 : 1.9}
        color={dark ? "#f3e2c4" : "#fff8ec"}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-2.4, HEAD_Y, -1.8]} intensity={dark ? 0.55 : 0.7} color="#8eb0c4" />
      <pointLight
        position={[ROBOT_X, HEAD_Y + 0.2, 1.4]}
        intensity={dark ? 0.85 : 0.55}
        color="#e8b866"
        distance={6}
      />
      <spotLight
        position={[ROBOT_X - 0.4, HEAD_Y + 1.6, 2.4]}
        angle={0.45}
        penumbra={0.6}
        intensity={dark ? 1.1 : 0.9}
        color="#ffe6c2"
        target-position={[ROBOT_X, LOOK_AT_Y, 0]}
      />
    </>
  )
}

export function LoginRobotScene() {
  const dark = useTopologyDark()
  const palette = dark ? TOPOLOGY_PALETTE.dark : TOPOLOGY_PALETTE.light
  const pointer = useRef<PointerTarget>({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1
      const y = (event.clientY / window.innerHeight) * 2 - 1
      pointer.current.x = x
      pointer.current.y = y
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [])

  return (
    <Canvas
      camera={{
        position: [ROBOT_X - 0.08, LOOK_AT_Y + 0.05, 2.15],
        fov: 28,
        near: 0.1,
        far: 40,
      }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%", display: "block", background: "transparent" }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(ROBOT_X, LOOK_AT_Y, 0)
        gl.setClearColor(0x000000, 0)
      }}
    >
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 4.5, 9]} />
      <LoginLights dark={dark} />
      <LoginRobot pointer={pointer} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROBOT_X, 0, 0]} receiveShadow>
        <circleGeometry args={[1.8, 48]} />
        <meshStandardMaterial color={palette.floorTop} roughness={0.9} metalness={0.04} />
      </mesh>
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
