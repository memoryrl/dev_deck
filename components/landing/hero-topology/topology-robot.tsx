"use client"

import { useEffect, useMemo, useRef } from "react"
import { Html, useAnimations, useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { SkeletonUtils } from "three-stdlib"
import {
  Color,
  MathUtils,
  MeshStandardMaterial,
  type Group,
  type Material,
  type Mesh,
  type MeshBasicMaterial,
} from "three"

const FACE_DESK = 0
const FACE_USER = Math.PI
const TURN_SPEED = 7.5

// public/models/robot.glb: quaternius.itch.io/lowpoly-robot (CC0) — FBX를
// FBX2glTF로 변환. 바인드 포즈 기준 키가 약 4.5유닛이라 책상 스케일에 맞춰
// 축소하고, 변환 과정에서 로봇이 뒤(-Z)를 보게 나와 데스크 좌표계의 "정면"
// (+Z, 사용자)에 맞추는 보정 회전을 더한다.
// 모니터는 책상 로컬 -Z, 사용자는 +Z. 바깥 그룹 yaw + 보정 π가 실제 시선이다.
// idle yaw=0 → 시선 -Z(모니터), 클릭 yaw=π → 시선 +Z(사용자).
const MODEL_URL = "/models/robot.glb"
const MODEL_SCALE = 0.17
const MODEL_FACING_OFFSET = Math.PI
const IDLE_CLIP = "RobotArmature|Robot_Idle"
const GREET_CLIP = "RobotArmature|Robot_Wave"

type RobotSkin = { main: string; grey: string; black: string }

// 모듈 틴트(espresso 등)를 그대로 입히면 몸통 Black 재질이 거의 검정이라 책상마다
// 구분이 안 된다. 책상 순서대로 고른 고정 팔레트라 새로고침해도 색이 바뀌지 않는다.
const ROBOT_SKINS: RobotSkin[] = [
  { main: "#e08a3c", grey: "#d7c4a6", black: "#8d5328" },
  { main: "#3b90d0", grey: "#b0c9db", black: "#2a5f8a" },
  { main: "#5ea85a", grey: "#c3d4b4", black: "#3c6d3a" },
  { main: "#d45c72", grey: "#e0b8c0", black: "#8a3548" },
  { main: "#7b6ad4", grey: "#c8c0e4", black: "#4a427c" },
  { main: "#d9a12e", grey: "#e6d5a4", black: "#8a6a1e" },
  { main: "#2eada0", grey: "#a8d4ce", black: "#1f6f68" },
  { main: "#d46b38", grey: "#e2c2a8", black: "#8a4524" },
  { main: "#4d7ad4", grey: "#b4c4e4", black: "#33508c" },
  { main: "#c4529a", grey: "#ddb4cc", black: "#7a3360" },
  { main: "#7aa83c", grey: "#c8d6a8", black: "#4a6c24" },
  { main: "#3cb8d4", grey: "#a8d4e0", black: "#247888" },
]

function skinFor(index: number): RobotSkin {
  return ROBOT_SKINS[index % ROBOT_SKINS.length]
}

// 요청사항: 예전 상자 로봇 시절 몸통을 휘감던 고리 3개(haloRef)는 실제 glTF
// 모델의 어깨/머리 높이와 어긋나 클릭 시 카메라가 가까이 붙으면 "머리 위에 원반이
// 뜬 것처럼" 보였다 — 발밑 스포트라이트 링만 남긴다.
function RobotHighlight({ color }: { color: string }) {
  const ringRef = useRef<Mesh>(null)
  const washRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pulse = 1 + Math.sin(t * 3.4) * 0.06
    ringRef.current?.scale.set(pulse, pulse, 1)
    const wash = washRef.current?.material as MeshBasicMaterial | undefined
    if (wash) wash.opacity = 0.16 + Math.sin(t * 3.4) * 0.07
  })

  return (
    <group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.38, 0.5, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh ref={washRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.5, 0.82, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  )
}

function tintClone(material: Material, skin: RobotSkin): Material {
  const cloned = material.clone()
  if (!(cloned instanceof MeshStandardMaterial)) return cloned
  if (cloned.name === "Main") cloned.color = new Color(skin.main)
  else if (cloned.name === "Grey") cloned.color = new Color(skin.grey)
  else if (cloned.name === "Black") cloned.color = new Color(skin.black)
  return cloned
}

// FBX2glTF 변환 과정의 알려진 버그: Hand.L/Hand.R 스킨드 메시 노드에 잘못된 Y
// translation(원본 기준 약 2.37)이 그대로 남아, 손 메시가 몸통에서 붕 떠 보인다.
// 스킨 계산(관절 가중치)은 그대로 두고 노드 자체의 위치만 원점으로 되돌린다.
const FLOATING_MESH_NAMES = new Set(["Hand.L", "Hand.R"])

function RobotModel({ skin, active }: { skin: RobotSkin; active: boolean }) {
  const { scene, animations } = useGLTF(MODEL_URL)
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene) as Group, [scene])
  const { actions } = useAnimations(animations, clonedScene)

  useEffect(() => {
    // glTF에서 다중 프리미티브 메시(머티리얼이 2개 이상)는 노드 이름을 가진 Group으로
    // 감싸지고 실제 Mesh는 그 자식이라 이름이 다르다 — isMesh로 거르기 전에 이름부터 확인.
    clonedScene.traverse((child) => {
      if (FLOATING_MESH_NAMES.has(child.name)) child.visible = false
    })
  }, [clonedScene])

  useEffect(() => {
    clonedScene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((mat) => tintClone(mat, skin))
        : tintClone(mesh.material, skin)
    })
  }, [clonedScene, skin])

  useEffect(() => {
    const idle = actions[IDLE_CLIP]
    const greet = actions[GREET_CLIP]
    if (active) {
      idle?.fadeOut(0.2)
      greet?.reset().fadeIn(0.2).play()
    } else {
      greet?.fadeOut(0.2)
      idle?.reset().fadeIn(0.2).play()
    }
    return () => {
      idle?.fadeOut(0.15)
      greet?.fadeOut(0.15)
    }
  }, [actions, active])

  return (
    <group scale={MODEL_SCALE} rotation={[0, MODEL_FACING_OFFSET, 0]}>
      <primitive object={clonedScene} />
    </group>
  )
}

export function TopologyRobot({
  skinIndex = 0,
  active,
  guideText,
}: {
  skinIndex?: number
  active: boolean
  guideText: string
}) {
  const groupRef = useRef<Group>(null)
  const facing = useRef(FACE_DESK)
  const skin = useMemo(() => skinFor(skinIndex), [skinIndex])
  const highlight = skin.main

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    const target = active ? FACE_USER : FACE_DESK
    facing.current = MathUtils.damp(facing.current, target, TURN_SPEED, delta)
    group.rotation.y = facing.current
  })

  return (
    <group ref={groupRef} rotation={[0, FACE_DESK, 0]}>
      {active ? <RobotHighlight color={highlight} /> : null}
      {active ? <pointLight color={highlight} intensity={1.4} distance={2.4} position={[0, 0.7, 0.2]} /> : null}

      <RobotModel skin={skin} active={active} />

      {active ? (
        <Html
          position={[0, 1.28, 0]}
          center
          occlude={false}
          zIndexRange={[40, 0]}
          className="pointer-events-none select-none"
        >
          <div className="topology-speech">
            <p className="topology-speech-text">{guideText}</p>
            <span className="topology-speech-tail" aria-hidden />
          </div>
        </Html>
      ) : null}
    </group>
  )
}

useGLTF.preload(MODEL_URL)
