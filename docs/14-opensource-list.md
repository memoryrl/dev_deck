# 14. 오픈소스 사용정보 자동 목록

`/opensource` 페이지의 Frontend/Backend 표는 **손으로 고치지 않는다.** `package.json` + `node_modules`에서 자동으로 만들어진다.

## 동작

- `scripts/generate-oss-packages.mjs`가 `package.json`의 `dependencies`를 읽고, 각 패키지의 `node_modules/<이름>/package.json`에서 **설치된 버전**과 **라이선스**를 가져와 `lib/oss/packages.generated.json`에 쓴다.
- 자동으로 도는 시점: `npm install`(`postinstall`), 개발 서버 시작(`predev`), 빌드(`prebuild`). Vercel 배포에서도 설치·빌드 때 돈다. 수동 실행은 `npm run oss:generate`.
- 내용이 바뀐 때만 파일을 다시 쓴다(불필요한 git 변경 방지). 생성 파일은 저장소에 커밋한다 — 의존성이 바뀌면 diff로 무엇이 바뀌었는지 남는다.
- 스크립트가 실패해도 설치·빌드는 멈추지 않고 기존 파일을 그대로 쓴다.

## 새 의존성을 추가했을 때

`npm install <패키지>`만 하면 목록에 자동으로 나타난다(기본은 Frontend 표). 다른 표에 두려면 `lib/oss/oss.config.json`을 고친다.

| 키 | 의미 |
| --- | --- |
| `backend` | Backend 표에 보일 패키지 |
| `backendOnly` | Frontend 표에서는 뺄 패키지(Backend에만 표시). `next`처럼 양쪽에 보이는 것은 `backend`에만 넣는다 |
| `exclude` | 어느 표에도 보이지 않을 패키지 |
| `licenseOverrides` | 패키지의 `license` 필드가 `SEE LICENSE IN …`처럼 기계가 읽을 수 없을 때만 쓰는 수동 지정(예: CKEditor의 GPL-2.0-or-later) |

## 한계

- 서버리스(Vercel)에서는 실행 중에 `node_modules`를 읽을 수 없어서, 목록은 **배포(빌드) 시점**의 의존성을 보여 준다. 배포할 때마다 그 배포에 들어간 버전으로 갱신되므로 실제 서비스와 항상 일치한다.
- 직접 의존성(`dependencies`)만 보여 준다. 간접 의존성이나 `devDependencies`는 포함하지 않는다.
