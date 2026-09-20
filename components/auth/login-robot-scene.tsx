"use client"

import { useEffect, useMemo, useRef, type MutableRefObject } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useAnimations, useGLTF } from "@react-three/drei"
import { SkeletonUtils } from "three-stdlib"
import {
  Box3,
  Color,
  MathUtils,
  MeshStandardMaterial,
  Vector3,
  type Bone,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
} from "three"
import { TOPOLOGY_PALETTE, useTopologyDark } from "@/components/landing/hero-topology/topology-theme"

// 토폴로지와 동일 에셋: quaternius.itch.io/lowpoly-robot (CC0)
const MODEL_URL = "/models/robot.glb"
const MODEL_SCALE = 0.55
const IDLE_CLIP = "RobotArmature|Robot_Idle"

const SKIN = { main: "#e08a3c", grey: "#f0e0c8", black: "#3d291c" }

const FLOATING_MESH_NAMES = new Set(["Hand.L", "Hand.R", "HandL", "HandR"])

const LOOK_YAW = 0.7
const LOOK_PITCH = 0.4
const LOOK_NECK = 0.45
const LOOK_SMOOTH = 6.5

const ROBOT_X = 0.55

type PointerTarget = { x: number; y: number }

function tintClone(material: Material): Material {
  const cloned = material.clone()
  if (!(cloned instanceof MeshStandardMaterial)) return cloned
  if (cloned.name === "Main") cloned.color = new Color(SKIN.main)
  else if (cloned.name === "Grey") cloned.color = new Color(SKIN.grey)
  else if (cloned.name === "Black") {
    cloned.color = new Color(SKIN.black)
    cloned.roughness = 0.15
    cloned.metalness = 0.65
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
  const wrapRef = useRef<Group>(null)
  const headRef = useRef<Bone | null>(null)
  const neckRef = useRef<Bone | null>(null)
  const look = useRef({ yaw: 0, pitch: 0 })
  const framed = useRef(false)
  const headWorld = useRef(new Vector3())

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
        ? mesh.material.map((mat) => tintClone(mat))
        : tintClone(mesh.material)
    })
  }, [clonedScene])

  useEffect(() => {
    const idle = actions[IDLE_CLIP]
    idle?.reset().fadeIn(0.25).play()
    return () => {
      idle?.fadeOut(0.15)
    }
  }, [actions])

  useFrame((state, delta) => {
    // 첫 프레임에 바운딩 박스로 발을 맞추고, 카메라가 머리를 바라보게 한다.
    if (!framed.current && wrapRef.current) {
      wrapRef.current.updateWorldMatrix(true, true)
      const box = new Box3().setFromObject(wrapRef.current)
      if (box.isEmpty()) return
      const height = box.max.y - box.min.y
      if (height < 0.1) return
      wrapRef.current.position.y -= box.min.y
      wrapRef.current.updateWorldMatrix(true, true)
      const head = headRef.current
      if (head) {
        head.getWorldPosition(headWorld.current)
      } else {
        headWorld.current.set(ROBOT_X, box.max.y - height * 0.08, 0)
      }
      const lookY = headWorld.current.y - 0.12
      state.camera.position.set(ROBOT_X - 0.05, lookY + 0.05, 1.55)
      state.camera.lookAt(ROBOT_X, lookY, 0)
      state.camera.updateProjectionMatrix()
      framed.current = true
    }

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

  // 네이티브 모델은 -Z를 향하므로 π를 더해 카메라(+Z)를 보게 한다.
  return (
    <group ref={wrapRef} position={[ROBOT_X, 0, 0]}>
      <group scale={MODEL_SCALE} rotation={[0, Math.PI, 0]}>
        <primitive object={clonedScene} />
      </group>
    </group>
  )
}

function LoginLights({ dark }: { dark: boolean }) {
  return (
    <>
      <ambientLight intensity={dark ? 0.55 : 0.75} />
      <directionalLight position={[2.2, 4, 3]} intensity={dark ? 1.6 : 2.1} color={dark ? "#f2e3c8" : "#fffaf0"} />
      <directionalLight position={[-2, 2.5, 1.5]} intensity={dark ? 0.55 : 0.7} color="#9eb9cb" />
      <pointLight position={[ROBOT_X, 2.2, 1.2]} intensity={dark ? 1 : 0.7} color="#e8b866" distance={7} />
    </>
  )
}

export function LoginRobotScene() {
  const dark = useTopologyDark()
  const palette = dark ? TOPOLOGY_PALETTE.dark : TOPOLOGY_PALETTE.light
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
      camera={{ position: [ROBOT_X, 1.4, 1.8], fov: 32, near: 0.05, far: 50 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", display: "block" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
      }}
    >
      <color attach="background" args={[palette.background]} />
      <LoginLights dark={dark} />
      <LoginRobot pointer={pointer} />
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
