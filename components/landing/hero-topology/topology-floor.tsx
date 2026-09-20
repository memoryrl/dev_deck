"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import {
  CanvasTexture,
  Color,
  LinearMipmapLinearFilter,
  type MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from "three"

// 사무실 카펫 타일 느낌의 육각(벌집) 바닥.
// 지오메트리로 육각을 수백 개 세우는 대신 캔버스로 한 번 그린 텍스처를 반복해서 입힌다.
// 텍스처 한 장 안에 육각 64개(8열 × 4쌍)를 서로 다른 명도로 그려 두어서, 반복되어도
// 같은 타일이 줄지어 보이지 않는다.
const COLS = 8
const PAIRS = 4
const HEX_PX = 80 // 육각 하나의 가로 픽셀(변 사이 폭)
export const HEX_WORLD_WIDTH = 0.5 // 육각 하나의 월드 가로폭 — 책상(1.7) 대비 카펫 타일 크기
const SQRT3 = Math.sqrt(3)
const GLOW_BASE = 0.7
const GLOW_PULSE = 0.12
const R_WORLD = HEX_WORLD_WIDTH / SQRT3
// 텍스처 한 장이 덮는 월드 크기
const TILE_WORLD_W = COLS * HEX_WORLD_WIDTH
const TILE_WORLD_H = PAIRS * 3 * R_WORLD

// 매번 같은 무늬가 나오도록 시드 고정 난수(mulberry32).
function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shade(base: Color, delta: number) {
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl, SRGBColorSpace)
  return new Color().setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + delta)), SRGBColorSpace)
}

function createHexTexture(baseHex: string, lineHex: string, variance: number, anisotropy: number) {
  const r = HEX_PX / SQRT3
  const width = HEX_PX * COLS
  const idealHeight = 3 * r * PAIRS
  const height = Math.round(idealHeight)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // 반올림한 캔버스 높이에 이상적인 높이를 맞춘다(오차는 1px 미만).
  ctx.scale(1, height / idealHeight)
  ctx.fillStyle = lineHex
  ctx.fillRect(0, 0, width, idealHeight + 2)

  const base = new Color(baseHex)
  const random = seededRandom(20260919)
  const fillRadius = r * 0.94 // 타일 사이 줄눈(이음새)

  function hexPath(cx: number, cy: number) {
    ctx!.beginPath()
    for (let k = 0; k < 6; k++) {
      const angle = Math.PI / 6 + (Math.PI / 3) * k
      const x = cx + fillRadius * Math.cos(angle)
      const y = cy + fillRadius * Math.sin(angle)
      if (k === 0) ctx!.moveTo(x, y)
      else ctx!.lineTo(x, y)
    }
    ctx!.closePath()
  }

  function drawHex(cx: number, cy: number) {
    const color = shade(base, (random() - 0.5) * 2 * variance)
    const fill = `#${color.getHexString()}`
    // 가장자리에서 넘치는 육각은 반대편에도 그려 이음새 없이 반복되게 한다.
    for (const dx of [-width, 0, width]) {
      for (const dy of [-idealHeight, 0, idealHeight]) {
        hexPath(cx + dx, cy + dy)
        ctx!.fillStyle = fill
        ctx!.fill()
        // 카펫 타일 윗면의 아주 옅은 하이라이트
        ctx!.lineWidth = 1
        ctx!.strokeStyle = "rgba(255,255,255,0.05)"
        ctx!.stroke()
      }
    }
  }

  for (let pair = 0; pair < PAIRS; pair++) {
    for (let col = 0; col < COLS; col++) {
      drawHex(col * HEX_PX + HEX_PX / 2, pair * 3 * r + r)
      drawHex(col * HEX_PX + HEX_PX, pair * 3 * r + 2.5 * r)
    }
  }

  // 카펫 섬유 느낌의 잔 노이즈
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.04)"
    ctx.fillRect(random() * width, random() * height, 1.5, 1.5)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = anisotropy
  return texture
}

// 줄눈만 빛나는 발광 맵. 타일 면은 검정(=발광 없음)으로 두고, 타일 사이 이음새에 해당하는
// 육각 외곽선만 색을 입힌 뒤 번지게 해서 은은한 네온 줄눈처럼 보이게 한다.
function createSeamGlowTexture(glowHex: string, anisotropy: number) {
  const r = HEX_PX / SQRT3
  const width = HEX_PX * COLS
  const idealHeight = 3 * r * PAIRS
  const height = Math.round(idealHeight)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.scale(1, height / idealHeight)
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, width, idealHeight + 2)

  // 줄눈의 중심선은 타일 중심에서 r * (1 + 0.94) / 2 ≈ 0.97r 떨어진 육각 외곽선
  const seamRadius = r * 0.97
  ctx.strokeStyle = glowHex
  ctx.shadowColor = glowHex
  ctx.shadowBlur = 7
  ctx.lineWidth = 3
  ctx.lineJoin = "round"

  function strokeHex(cx: number, cy: number) {
    for (const dx of [-width, 0, width]) {
      for (const dy of [-idealHeight, 0, idealHeight]) {
        ctx!.beginPath()
        for (let k = 0; k < 6; k++) {
          const angle = Math.PI / 6 + (Math.PI / 3) * k
          const x = cx + dx + seamRadius * Math.cos(angle)
          const y = cy + dy + seamRadius * Math.sin(angle)
          if (k === 0) ctx!.moveTo(x, y)
          else ctx!.lineTo(x, y)
        }
        ctx!.closePath()
        ctx!.stroke()
      }
    }
  }

  for (let pair = 0; pair < PAIRS; pair++) {
    for (let col = 0; col < COLS; col++) {
      strokeHex(col * HEX_PX + HEX_PX / 2, pair * 3 * r + r)
      strokeHex(col * HEX_PX + HEX_PX, pair * 3 * r + 2.5 * r)
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = anisotropy
  return texture
}

/**
 * 바닥 상판(두께 0.08 박스). 윗면에만 육각 타일 텍스처를 입히고 옆면은 단색으로 둔다.
 * 박스의 윗면 높이를 그대로 유지하므로 책상 글로우·스탠드 빛 웅덩이 등 바닥에 얹은
 * 오브젝트의 높이 관계는 바뀌지 않는다.
 */
export function HexFloorTop({
  position,
  width,
  depth,
  baseColor,
  edgeColor,
  lineColor,
  variance,
  seamGlow,
}: {
  position: [number, number, number]
  width: number
  depth: number
  baseColor: string
  edgeColor: string
  lineColor: string
  variance: number
  /** 지정하면(다크 모드) 타일 사이 줄눈이 이 색으로 은은하게 빛난다 */
  seamGlow?: string
}) {
  const gl = useThree((state) => state.gl)
  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
  const texture = useMemo(
    () => createHexTexture(baseColor, lineColor, variance, anisotropy),
    [baseColor, lineColor, variance, anisotropy]
  )

  const glowTexture = useMemo(
    () => (seamGlow ? createSeamGlowTexture(seamGlow, anisotropy) : null),
    [seamGlow, anisotropy]
  )

  // 색 텍스처와 발광 텍스처는 같은 반복·오프셋을 써야 줄눈이 어긋나지 않는다.
  useEffect(() => {
    const textures = [texture, glowTexture].filter((item): item is CanvasTexture => item !== null)
    for (const item of textures) {
      item.repeat.set(width / TILE_WORLD_W, depth / TILE_WORLD_H)
      // 방 중앙에서 무늬가 대칭에 가깝게 시작하도록 반쯤 옮긴다.
      item.offset.set(0.5, 0.5)
    }
    return () => textures.forEach((item) => item.dispose())
  }, [texture, glowTexture, width, depth])

  // 줄눈 빛이 아주 천천히 숨 쉬듯 변한다 — 진폭을 작게 해서 눈에 거슬리지 않게.
  const topMaterial = useRef<MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const material = topMaterial.current
    if (!material || !glowTexture) return
    material.emissiveIntensity = GLOW_BASE + Math.sin(clock.elapsedTime * 0.9) * GLOW_PULSE
  })

  return (
    <mesh position={position}>
      <boxGeometry args={[width, 0.08, depth]} />
      {/* boxGeometry 면 순서: +x, -x, +y(윗면), -y, +z, -z */}
      <meshStandardMaterial attach="material-0" color={edgeColor} roughness={0.9} />
      <meshStandardMaterial attach="material-1" color={edgeColor} roughness={0.9} />
      <meshStandardMaterial
        // emissiveMap 유무가 바뀌면 셰이더를 새로 만들어야 하므로 키로 머티리얼을 갈아 끼운다.
        key={glowTexture ? "glow" : "plain"}
        ref={topMaterial}
        attach="material-2"
        color={texture ? "#ffffff" : baseColor}
        map={texture}
        roughness={0.95}
        emissive={glowTexture ? "#ffffff" : "#000000"}
        emissiveMap={glowTexture}
        emissiveIntensity={glowTexture ? GLOW_BASE : 0}
      />
      <meshStandardMaterial attach="material-3" color={edgeColor} roughness={0.9} />
      <meshStandardMaterial attach="material-4" color={edgeColor} roughness={0.9} />
      <meshStandardMaterial attach="material-5" color={edgeColor} roughness={0.9} />
    </mesh>
  )
}
