"use client"

// 팀장 자리 옆 왼쪽 벽에 붙는 4단 책장. 순수 장식용 정적 오브젝트라 애니메이션은
// 없다 — 책/게임 케이스는 고정 팔레트에서 결정론적으로 골라 새로고침해도 항상
// 같은 모습을 유지한다.
const FRAME_COLOR = "#6b4f3a"
const SHELF_COLOR = "#7c5c42"
const BACK_COLOR = "#5a4433"

const BOOK_COLORS = [
  "#d6483f",
  "#3f7fd6",
  "#3fae5a",
  "#e0a83c",
  "#8a4fd6",
  "#2ea8a0",
  "#d65f9e",
  "#4a5fd0",
  "#d68a3c",
  "#5c9a3c",
]

const GAME_ACCENTS = ["#4fd0e0", "#e0524f", "#e0c94f", "#7be04f", "#c04fe0", "#4f7be0"]

const TIER_H = 0.34
const TIERS = 4
const SHELF_W = 0.85 // 벽을 따라가는 길이(로컬 Z)
const SHELF_D = 0.26 // 벽에서 튀어나온 깊이
const FRAME_T = 0.03

// 선반판 길이(SHELF_W)는 로컬 Z, 벽 바깥으로 튀어나온 깊이(SHELF_D)는 로컬 X다
// (아래 프레임 참고) — 책/게임 케이스도 그 축에 맞춰 Z를 따라 늘어놓는다.
function Book({ z, depth, height, color }: { z: number; depth: number; height: number; color: string }) {
  const width = 0.035
  return (
    <mesh position={[0, height / 2, z]}>
      <boxGeometry args={[depth, height, width]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  )
}

function GameCase({ z, depth, accent }: { z: number; depth: number; accent: string }) {
  const width = 0.016
  const height = 0.19
  return (
    <group position={[0, height / 2, z]}>
      <mesh>
        <boxGeometry args={[depth, height, width]} />
        <meshStandardMaterial color="#1c1c1f" roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[depth / 2 + 0.001, 0.015, 0]}>
        <boxGeometry args={[0.002, height - 0.05, width - 0.004]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} roughness={0.4} />
      </mesh>
    </group>
  )
}

function BookRow({ depth, seed }: { depth: number; seed: number }) {
  const count = 8
  const gap = SHELF_W / (count + 1)
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const z = -SHELF_W / 2 + gap * (i + 1)
        const height = 0.15 + ((seed + i * 37) % 9) * 0.009
        const color = BOOK_COLORS[(seed + i * 3) % BOOK_COLORS.length]
        return <Book key={i} z={z} depth={depth} height={height} color={color} />
      })}
    </>
  )
}

function GameRow({ depth, seed }: { depth: number; seed: number }) {
  const count = 11
  const gap = SHELF_W / (count + 1)
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const z = -SHELF_W / 2 + gap * (i + 1)
        const accent = GAME_ACCENTS[(seed + i) % GAME_ACCENTS.length]
        return <GameCase key={i} z={z} depth={depth} accent={accent} />
      })}
    </>
  )
}

export function TopologyBookshelf({
  position,
  rotationY = 0,
}: {
  position: [number, number, number]
  rotationY?: number
}) {
  const totalH = TIER_H * TIERS + FRAME_T

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 좌우 측판 */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, totalH / 2, ((SHELF_W - FRAME_T) / 2) * side]}>
          <boxGeometry args={[SHELF_D, totalH, FRAME_T]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.65} />
        </mesh>
      ))}
      {/* 4단 칸을 만드는 선반판 5장(바닥 포함) */}
      {Array.from({ length: TIERS + 1 }, (_, i) => (
        <mesh key={i} position={[0, i * TIER_H, 0]}>
          <boxGeometry args={[SHELF_D, FRAME_T, SHELF_W]} />
          <meshStandardMaterial color={SHELF_COLOR} roughness={0.6} />
        </mesh>
      ))}
      {/* 뒤판 */}
      <mesh position={[-SHELF_D / 2 + 0.011, totalH / 2, 0]}>
        <boxGeometry args={[0.02, totalH, SHELF_W]} />
        <meshStandardMaterial color={BACK_COLOR} roughness={0.7} />
      </mesh>

      {/* 각 칸의 책/게임 케이스 — 선반 길이(로컬 Z)를 따라 늘어놓는다 */}
      {[0, 1, 2, 3].map((tier) => {
        const y = tier * TIER_H + FRAME_T / 2 + 0.001
        return (
          <group key={tier} position={[0, y, 0]}>
            {tier === 0 ? (
              <GameRow depth={SHELF_D * 0.72} seed={tier * 13 + 3} />
            ) : (
              <BookRow depth={SHELF_D * 0.7} seed={tier * 17 + 5} />
            )}
          </group>
        )
      })}
    </group>
  )
}
