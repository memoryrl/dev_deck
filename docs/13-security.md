# 13. 보안 강화 (2026-09 점검 반영)

프론트·백엔드·DB 보안 점검에서 나온 높음·중간 항목을 반영한 내용과, 적용 순서·남은 과제를 정리한다.

## 적용 순서 (중요)

앱 코드와 DB 패치는 **함께** 배포해야 한다. 앱은 새 컬럼(`comments.ip_masked`)과 함수(`rate_limit_hit`, `get_user_emails`)를 쓰고,
DB 패치는 옛 방식의 조회(`select("*")`)를 막는다.

1. Supabase SQL Editor: `patch-notifications.sql`(다시 실행) → `patch-security-hardening.sql`
2. 환경변수 추가: `OWNER_USER_ID`(관리자 계정의 Supabase 사용자 UID, 선택이지만 권장), 운영에는 `NEXT_PUBLIC_SITE_URL`도 확인
3. 앱 배포 (Next.js 15.5.25 / React 19 — 아래 "프레임워크 업그레이드" 참고)

패치를 적용하기 **전에** 새 앱을 배포하면 댓글 목록이 비어 보인다(없는 컬럼을 조회해 오류 → 빈 목록으로 처리). 반대로 패치만 먼저 적용하고 옛 앱을 두면 댓글 조회·작성이 실패한다.

## 반영한 항목

| 영역 | 문제 | 조치 |
| --- | --- | --- |
| 알림 | 내부 SECURITY DEFINER 함수를 익명이 API(rpc)로 호출 → 임의 알림·링크 삽입 | 함수 실행 권한 회수, 알림 링크는 사이트 내부 경로만 허용(DB 제약 + 화면) |
| 이메일 | `get_user_emails` 정의가 저장소에 없고 소유자 확인 불명 | 관리자만 호출하도록 정의를 확정(`patch-security-hardening.sql`) |
| 댓글 | 전체 IP·회원 UUID가 공개 API로 조회됨 | 컬럼 권한으로 `ip_address`·`user_id` 차단, 화면용 `ip_masked` 추가. 관리자 화면은 서버에서 서비스 롤로 읽음 |
| 댓글 | 익명이 API로 직접 INSERT(IP 위조·검증·제한 우회) | INSERT 정책 삭제, 서버 액션이 서비스 롤로만 저장 |
| 로그 | `page_views`·`login_history` 익명 직접 INSERT | 정책·권한 삭제(서버가 서비스 롤로 기록) |
| 스토리지 | 가입만 하면 누구나 50MB 업로드·공개, 파일 목록 조회, SVG 가능 | 첨부 업로드는 관리자만, 버킷에 용량·형식 제한, 목록 조회 차단, SVG 제외 |
| 레이트리밋 | 인스턴스 메모리 기반이라 서버리스에서 우회됨 | DB(`rate_limit_hit`)로 영속 처리 — 댓글, 이미지 업로드, 공유 비밀번호 |
| 공유 비밀번호 | 최소 4자, 시도 제한이 IP·인스턴스 단위 | 최소 8자, IP별 + 링크 전체(1시간 40회) 제한 |
| 관리자 판별 | 이메일 문자열 비교만 | DB는 고정된 관리자 UUID(`devdeck.app_owner`), 서버 코드는 Google 로그인 계정만 인정 + 선택적 `OWNER_USER_ID` 일치 |
| 기본 권한 | 새 함수가 기본적으로 익명 실행 가능 | `ALTER DEFAULT PRIVILEGES`로 새 함수의 PUBLIC 실행 회수 |
| 프레임워크 | Next.js 14.2.35에 알려진 취약점 24건(치명 2) | Next.js 15.5.25 + React 19로 업그레이드, 내장 `postcss`는 8.5.28로 override → `npm audit`(prod) 0건 |

## 프레임워크 업그레이드 메모

- 함께 올린 것: `react`/`react-dom` 19.2, `@react-three/fiber` 9, `@react-three/drei` 10(React 19 필요), `eslint-config-next` 15, `@types/react` 19.
- 요청 API(`cookies()`, `headers()`, `params`, `searchParams`)는 비동기로 바뀌었다. 페이지·라우트는 공식 코드모드로 변환했다.
- **기술 부채**: 동기 헬퍼(`lib/supabase/server.ts`의 `createClient`, `lib/i18n/dictionary.ts`의 `getT`, `lib/comments/ip.ts`의 `clientIpFromHeaders`)는 코드모드가 `UnsafeUnwrapped` 캐스트로 감쌌다. Next 15에서는 동작하지만(개발 모드에서 경고) **Next 16에서 제거**되므로, 그 전에 이 헬퍼들을 비동기로 바꾸고 호출부를 정리해야 한다.
- `next lint`는 Next 16에서 제거된다(`npx @next/codemod@canary next-lint-to-eslint-cli .`로 ESLint CLI 이전).
- npm 설치 시 peer 충돌(ERESOLVE)이 나서 `--legacy-peer-deps`로 설치했고 `npm ls`에는 충돌이 없다. 다음 설치에서 같은 오류가 나면 같은 옵션을 쓴다.
- 3D 씬(랜딩 토폴로지, 로그인 로봇)은 r3f 9로 올린 뒤 **브라우저에서 눈으로 확인**해야 한다(빌드·타입은 통과).

## 남은 과제 (낮음으로 분류해 이번에는 하지 않음)

- `/api/health?live=1` 공개 호출 남용 방지(캐시·제한), `NEXT_PUBLIC_SITE_URL` 미설정 시 Host 헤더로 리다이렉트 주소가 정해지는 점(운영 환경변수 확인)
- 서버 액션이 DB 오류 문구를 그대로 반환하는 곳, 게시글 제목·본문 길이 제한, 게시글 작성 레이트리밋
- 첨부 `finalize`의 경로(`..`)·크기·형식 검증, 공유 쿠키 서명에 `SUPABASE_SERVICE_ROLE_KEY` 재사용(전용 시크릿 분리)
