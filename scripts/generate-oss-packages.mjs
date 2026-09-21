#!/usr/bin/env node
// 오픈소스 사용정보(/opensource) 목록을 package.json + node_modules 에서 만든다.
// npm install(postinstall) · 개발 서버 시작(predev) · 빌드(prebuild) 때 자동으로 돈다 — 수동으로 목록을 고칠 일이 없다.
// 수동 실행: npm run oss:generate
//
// 어느 표(Frontend/Backend)에 보일지는 lib/oss/oss.config.json 에서 정한다.
// 결과는 lib/oss/packages.generated.json 에 저장하고, 내용이 바뀌었을 때만 다시 쓴다(불필요한 git 변경 방지).
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(ROOT, "lib/oss/packages.generated.json")

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

/** license 필드는 문자열, { type }, 또는 옛 licenses 배열일 수 있다. */
function licenseOf(pkg) {
  const { license, licenses } = pkg
  if (typeof license === "string" && license.trim()) return license.trim()
  if (license && typeof license === "object" && license.type) return String(license.type)
  if (Array.isArray(licenses) && licenses.length > 0) {
    return licenses.map((entry) => (typeof entry === "string" ? entry : entry.type)).filter(Boolean).join(" OR ")
  }
  return "UNKNOWN"
}

function collect() {
  const manifest = readJson(join(ROOT, "package.json"))
  const config = readJson(join(ROOT, "lib/oss/oss.config.json"))
  const exclude = new Set(config.exclude ?? [])
  const backendOnly = new Set(config.backendOnly ?? [])
  const backend = new Set(config.backend ?? [])
  const overrides = config.licenseOverrides ?? {}

  const all = []
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (exclude.has(name)) continue
    const path = join(ROOT, "node_modules", name, "package.json")
    if (!existsSync(path)) {
      // 설치 전이면 package.json 의 범위를 그대로 보여 주고 경고만 남긴다.
      console.warn(`[oss] ${name} 이(가) node_modules 에 없습니다 — 버전은 package.json 범위(${range})로 표시합니다.`)
      all.push({ name, version: String(range).replace(/^[~^]/, ""), license: "UNKNOWN" })
      continue
    }
    const pkg = readJson(path)
    let license = licenseOf(pkg)
    // 기계가 읽을 수 없는 값(라이선스 파일 참조 등)일 때만 수동 지정으로 대체한다.
    if ((license === "UNKNOWN" || /^SEE LICENSE/i.test(license)) && overrides[name]) license = overrides[name]
    all.push({ name, version: pkg.version ?? String(range), license })
  }

  const byName = (a, b) => a.name.localeCompare(b.name)
  return {
    frontend: all.filter((item) => !backendOnly.has(item.name)).sort(byName),
    backend: all.filter((item) => backend.has(item.name)).sort(byName),
  }
}

try {
  const next = collect()
  const previous = existsSync(OUT) ? readJson(OUT) : null
  const unchanged =
    previous &&
    JSON.stringify(previous.frontend) === JSON.stringify(next.frontend) &&
    JSON.stringify(previous.backend) === JSON.stringify(next.backend)

  if (unchanged) {
    console.log(`[oss] 변경 없음 (Frontend ${next.frontend.length}, Backend ${next.backend.length})`)
  } else {
    const generatedAt = new Date().toISOString().slice(0, 10)
    writeFileSync(OUT, `${JSON.stringify({ generatedAt, ...next }, null, 2)}\n`)
    console.log(`[oss] 갱신: Frontend ${next.frontend.length}, Backend ${next.backend.length} → lib/oss/packages.generated.json`)
  }
} catch (error) {
  // 이 스크립트는 npm install/빌드를 막으면 안 된다. 실패하면 기존 파일을 그대로 쓴다.
  console.warn(`[oss] 목록 생성에 실패해 기존 파일을 유지합니다: ${error instanceof Error ? error.message : error}`)
}
