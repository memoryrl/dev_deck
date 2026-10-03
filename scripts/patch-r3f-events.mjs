// R3F 9.7 connect()는 target이 null이어도 addEventListener를 호출한다.
// React 19 Fast Refresh·Suspense로 캔버스가 빠지는 순간 Canvas가 그 경로를 탄다.
// events 프롭은 루트에 handlers가 이미 있으면 무시되므로, 배포 파일의 connect를 직접 고친다.
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = join("node_modules", "@react-three", "fiber", "dist")
const needle = `connect: target => {
      const {
        set,
        events
      } = store.getState();`
const guard = `connect: target => {
      if (target == null) return;
      const {
        set,
        events
      } = store.getState();`

let patched = 0
for (const name of readdirSync(dir)) {
  if (!name.startsWith("events-") || !name.endsWith(".js")) continue
  const path = join(dir, name)
  const source = readFileSync(path, "utf8")
  if (!source.includes(needle)) continue
  if (source.includes("if (target == null) return;")) continue
  writeFileSync(path, source.replaceAll(needle, guard))
  patched += 1
  console.log("patched", path)
}
if (patched === 0) console.log("r3f events connect already guarded")
