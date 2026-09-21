import generated from "./packages.generated.json"

export type OssPackage = {
  name: string
  version: string
  license: string
}

// 이 목록은 손으로 고치지 않는다. package.json + node_modules 에서 scripts/generate-oss-packages.mjs 가 만든다
// (npm install · 개발 서버 시작 · 빌드 때 자동 실행, 수동: npm run oss:generate).
// 어느 표에 보일지는 lib/oss/oss.config.json 에서 정한다.
export const FRONTEND_PACKAGES: OssPackage[] = generated.frontend
export const BACKEND_PACKAGES: OssPackage[] = generated.backend

/** 목록을 마지막으로 갱신한 날(yyyy-mm-dd) */
export const OSS_GENERATED_AT: string = generated.generatedAt
