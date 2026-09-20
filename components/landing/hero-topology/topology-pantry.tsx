"use client"

import { useTone } from "@/components/landing/hero-topology/topology-theme"

// 팀장 자리 오른쪽(뒷벽) 탕비 공간. 카운터 + 커피머신 + 스탠드형 정수기.
// 책장과 같이 순수 장식용 정적 오브젝트라 애니메이션은 없다.

export const PANTRY_COUNTER_SIZE = { w: 1.18, d: 0.5, h: 0.86 }
export const PANTRY_PURIFIER_OFFSET = { x: 0.86, z: 0.06 }

const WOOD = "#c9b089"
const WOOD_DARK = "#8d7354"
const TOP = "#e6d6ba"
const STEEL = "#b9b3a8"
const BODY = "#2a2724"
const WHITE = "#f3f1ec"

function CoffeeMachine() {
  const tone = useTone()
  return (
    <group>
      <mesh position={[0, 0.015, 0.06]}>
        <boxGeometry args={[0.2, 0.03, 0.16]} />
        <meshStandardMaterial color={tone("#3a3532")} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.16, -0.01]}>
        <boxGeometry args={[0.22, 0.28, 0.16]} />
        <meshStandardMaterial color={tone(BODY)} roughness={0.38} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.12, 0.085]}>
        <boxGeometry args={[0.15, 0.1, 0.02]} />
        <meshStandardMaterial color={tone(STEEL)} roughness={0.28} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.06, 0.11]}>
        <boxGeometry args={[0.045, 0.05, 0.07]} />
        <meshStandardMaterial color={tone("#1a1816")} roughness={0.4} />
      </mesh>
      <mesh position={[0.09, 0.14, 0.04]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
        <meshStandardMaterial color={tone(STEEL)} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.34, -0.02]}>
        <cylinderGeometry args={[0.045, 0.055, 0.08, 12]} />
        <meshStandardMaterial color={tone("#1c1a18")} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.045, 0.13]}>
        <cylinderGeometry args={[0.028, 0.024, 0.045, 12]} />
        <meshStandardMaterial color={tone("#f4ead4")} roughness={0.55} />
      </mesh>
      <mesh position={[0.07, 0.26, 0.082]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#d4483c" emissive="#d4483c" emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}

function WaterPurifier() {
  const tone = useTone()
  return (
    <group>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.3, 1.04, 0.32]} />
        <meshStandardMaterial color={tone(WHITE)} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.84, 0.162]}>
        <boxGeometry args={[0.2, 0.28, 0.012]} />
        <meshStandardMaterial color={tone("#7eb7d8")} roughness={0.25} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.36, 0.12]}>
        <boxGeometry args={[0.22, 0.035, 0.16]} />
        <meshStandardMaterial color={tone("#d8d4cc")} roughness={0.5} />
      </mesh>
      <mesh position={[-0.045, 0.5, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.08, 8]} />
        <meshStandardMaterial color={tone("#3d7eb8")} roughness={0.3} metalness={0.45} />
      </mesh>
      <mesh position={[0.045, 0.5, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.08, 8]} />
        <meshStandardMaterial color={tone("#c45c4a")} roughness={0.3} metalness={0.45} />
      </mesh>
      <mesh position={[-0.045, 0.5, 0.21]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color={tone("#3d7eb8")} roughness={0.35} />
      </mesh>
      <mesh position={[0.045, 0.5, 0.21]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color={tone("#c45c4a")} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.06, 0]}>
        <boxGeometry args={[0.28, 0.045, 0.3]} />
        <meshStandardMaterial color={tone("#e8e4dc")} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.18, 0.165]}>
        <cylinderGeometry args={[0.026, 0.022, 0.05, 12]} />
        <meshStandardMaterial color={tone("#e8f2fa")} roughness={0.45} />
      </mesh>
    </group>
  )
}

function Mug({ color }: { color: string }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.028, 0.024, 0.05, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0.032, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.016, 0.005, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  )
}

export function TopologyPantry({
  position,
  rotationY = 0,
}: {
  position: [number, number, number]
  rotationY?: number
}) {
  const tone = useTone()
  const { w, d, h } = PANTRY_COUNTER_SIZE

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0.12, 0.026, 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.7, 0.78]} />
        <meshStandardMaterial color={tone("#dcc9a8")} roughness={0.9} />
      </mesh>

      <mesh position={[0, h / 2 - 0.03, 0]}>
        <boxGeometry args={[w, h - 0.06, d - 0.04]} />
        <meshStandardMaterial color={tone(WOOD_DARK)} roughness={0.65} />
      </mesh>
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, (h - 0.1) / 2, d / 2 - 0.03]}>
          <boxGeometry args={[0.5, h - 0.14, 0.02]} />
          <meshStandardMaterial color={tone(WOOD)} roughness={0.6} />
        </mesh>
      ))}
      {[-0.28, 0.28].map((x) => (
        <mesh key={`knob-${x}`} position={[x + 0.16, h * 0.45, d / 2 - 0.015]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color={tone(STEEL)} roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w + 0.06, 0.045, d + 0.04]} />
        <meshStandardMaterial color={tone(TOP)} roughness={0.48} />
      </mesh>
      <mesh position={[0, h + 0.22, -d / 2 + 0.02]}>
        <boxGeometry args={[w + 0.04, 0.44, 0.02]} />
        <meshStandardMaterial color={tone("#efe6d4")} roughness={0.55} />
      </mesh>

      <mesh position={[0.28, h + 0.012, 0.04]}>
        <cylinderGeometry args={[0.07, 0.065, 0.02, 16]} />
        <meshStandardMaterial color={tone("#9aa3a8")} roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0.28, h - 0.04, 0.04]}>
        <cylinderGeometry args={[0.055, 0.05, 0.08, 16]} />
        <meshStandardMaterial color={tone("#6d7a80")} roughness={0.3} metalness={0.35} />
      </mesh>

      <group position={[-0.22, h, 0.06]} scale={1.28}>
        <CoffeeMachine />
      </group>

      <group position={[0.08, h + 0.025, 0.12]}>
        <Mug color={tone("#6b4f3a")} />
      </group>
      <group position={[-0.02, h + 0.22, -d / 2 + 0.05]} rotation={[0, 0.4, 0]}>
        <Mug color={tone("#c4a574")} />
      </group>
      <group position={[0.12, h + 0.22, -d / 2 + 0.05]} rotation={[0, -0.2, 0]}>
        <Mug color={tone("#d7e6ea")} />
      </group>

      <group position={[PANTRY_PURIFIER_OFFSET.x, 0, PANTRY_PURIFIER_OFFSET.z]}>
        <WaterPurifier />
      </group>
    </group>
  )
}
