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
const MODEL_SCALE = 1.05
const MODEL_FACING_OFFSET = Math.PI
const IDLE_CLIP = "RobotArmature|Robot_Idle"

const SKIN = { main: "#c4a574", grey: "#e8dfd2", black: "#5a4534" }

const FLOATING_MESH_NAMES = new Set(["Hand.L", "Hand.R"])

const LOOK_YAW = 0.55
const LOOK_PITCH = 0.32
const LOOK_NECK = 0.35
const LOOK_SMOOTH = 5.5

type PointerTarget = { x: number; y: number }

function tintClone(material: Material): Material {
  const cloned = material.clone()
  if (!(cloned instanceof MeshStandardMaterial)) return cloned
  if (cloned.name === "Main") cloned.color = new Color(SKIN.main)
  else if (cloned.name === "Grey") cloned.color = new Color(SKIN.grey)
  else if (cloned.name === "Black") {
    cloned.color = new Color(SKIN.black)
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

function LoginRobot({ pointer }: { pointer: MutableRefObject<PointerTarget> }) {
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
    <group position={[0.12, -1.35, 0]} scale={MODEL_SCALE} rotation={[0, MODEL_FACING_OFFSET, 0]}>
      <primitive object={clonedScene} />
    </group>
  )
}

function LoginLights({ dark }: { dark: boolean }) {
  return (
    <>
      <ambientLight intensity={dark ? 0.35 : 0.55} />
      <directionalLight
        castShadow
        position={[2.4, 3.2, 2.8]}
        intensity={dark ? 1.35 : 1.7}
        color={dark ? "#f0e2c8" : "#fff6e8"}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-2.2, 1.4, -1.6]} intensity={dark ? 0.45 : 0.55} color="#9eb8c8" />
      <pointLight position={[0.2, 1.1, 1.6]} intensity={dark ? 0.55 : 0.4} color="#e8b866" distance={5} />
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
      camera={{ position: [0.05, 0.72, 2.05], fov: 32, near: 0.1, far: 40 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%", display: "block", background: "transparent" }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0.05, 0.78, 0)
        gl.setClearColor(0x000000, 0)
      }}
    >
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 3.2, 7.5]} />
      <LoginLights dark={dark} />
      <LoginRobot pointer={pointer} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0]} receiveShadow>
        <circleGeometry args={[2.4, 48]} />
        <meshStandardMaterial color={palette.floorTop} roughness={0.92} metalness={0.05} />
      </mesh>
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
