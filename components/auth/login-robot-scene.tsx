"use client"

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
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
  type SkinnedMesh,
} from "three"
import { useTopologyDark } from "@/components/landing/hero-topology/topology-theme"

// quaternius.itch.io/lowpoly-robot (CC0)
const MODEL_URL = "/models/robot.glb"
const MODEL_SCALE = 0.72
// 네이티브가 -Z를 향하므로 π로 카메라(+Z)를 보게 한다 — 상반신 구도에서 재확인함
const MODEL_FACING_OFFSET = 0
// 카드가 가리지 않게 우측으로 두고, 카메라는 머리~가슴이 들어오게 맞춤
const ROBOT_X = 0.55
const ROBOT_Y = -1.5
const LOOK_AT_Y = 0.62
const CAMERA_Z = 4.15
const CAMERA_FOV = 35

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
    // Soft WebGL에서 SkinnedMesh + AnimationMixer가 프레임을 깨뜨려
    // 본 계층에 붙은 일반 Mesh만 남긴다(시선 추적은 Head/Neck 본으로 가능).
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

function LoginRobot({
  pointer,
  skin,
}: {
  pointer: MutableRefObject<PointerTarget>
  skin: Skin
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
    const targetYaw = MathUtils.clamp(pointer.current.x, -1, 1) * LOOK_YAW
    const targetPitch = MathUtils.clamp(-pointer.current.y, -1, 1) * LOOK_PITCH
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
      <group scale={MODEL_SCALE} rotation={[0, MODEL_FACING_OFFSET, 0]}>
        <primitive object={robot} />
      </group>
    </group>
  )
}

export function LoginRobotScene() {
  const dark = useTopologyDark()
  const skin = dark ? SKIN_DARK : SKIN_LIGHT
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
      // 머리만이 아니라 어깨·가슴·팔 상단까지 담도록 카메라를 충분히 뒤로 뺀다.
      camera={{ position: [0.2, LOOK_AT_Y + 0.12, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 50 }}
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      }}
      style={{ width: "100%", height: "100%", display: "block", background: stage }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(ROBOT_X, LOOK_AT_Y, 0)
        gl.setClearColor(new Color(stage), 1)
      }}
    >
      <color attach="background" args={[stage]} />
      <ambientLight intensity={dark ? 0.55 : 0.85} />
      <directionalLight position={[2.8, 3.6, 3.2]} intensity={dark ? 1.85 : 2.25} color="#fff7ea" />
      <directionalLight position={[-2.4, 1.8, 1.6]} intensity={0.7} color="#9eb8c8" />
      <pointLight position={[ROBOT_X, LOOK_AT_Y + 0.6, 1.6]} intensity={dark ? 0.7 : 0.45} color="#ffd089" distance={7} />
      <Suspense fallback={null}>
        <LoginRobot pointer={pointer} skin={skin} />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
