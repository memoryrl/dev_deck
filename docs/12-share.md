# 12. 공유하기 (공유 링크)

게시물·프롬프트·커리어 글·게임 리뷰를 링크로 공유한다. kware_aquavys의 공유하기 기능을 이 사이트(Next.js + Supabase)에 맞게 옮겼다.

## 공유 방식

| 방식 | 설명 | 설정 |
| --- | --- | --- |
| 링크를 보유한 누구나 | 링크를 가진 누구나 열람 | 공유 기간, 비밀번호, 최대 방문 횟수 |
| 초대 받은 사람만 | 받는 사람마다 전용 링크 발급, 읽음 확인 | 공유 기간(모든 초대에 동일 적용) |

- 한 사람이 한 자료에 대해 방식별로 살아 있는 링크는 하나다. 방식을 바꾸면 이전 방식의 공유 정보는 삭제된다("공유 안 함" 포함).
- 링크는 `/share/{key}`다. 공개 링크는 `p…`, 초대 링크는 `i…`로 시작한다.

## 누가 만들 수 있나

자료를 **만든 사람 또는 관리자**. 서버 액션(`lib/share/actions.ts`)이 매번 확인한다. 버튼은 같은 컴포넌트(`components/share/share-button.tsx`)를 공개 화면과 관리자 화면에 모두 쓴다.

| 자료 | 공개 화면(버튼 위치) | 관리자 화면 |
| --- | --- | --- |
| 게시글 `board_post` | `/b/[slug]/[id]` 제목 배너 | `/site/boards/[id]/[postId]` |
| 프롬프트 `prompt` | `/p/[id]` 제목 배너 | `/promptkit/[id]` |
| 커리어 글 `career` | `/work/[id]` 제목 배너 | `/career/[id]` |
| 게임 리뷰 `game` | `/games/[appid]` 리뷰 영역 | `/steam/[appid]` |

## 링크로 들어온 방문자

`/share/[key]` 서버 컴포넌트가 다음 순서로 검증한다(aquavys는 JWT 쿠키 + iframe, 여기서는 검증 후 서버에서 원문을 직접 렌더링한다 — 사이트가 `frame-ancestors 'none'`이고 비공개 글도 있기 때문).

1. 키 형식 → 링크·초대 존재/삭제 여부 → 공유 기간 → 최대 방문 횟수
2. 비밀번호가 있으면 입력 화면(제목도 보여 주지 않는다). 맞히면 24시간짜리 서명 쿠키 발급
3. 자료 로드(삭제됐으면 안내 화면) → 읽기 전용으로 표시
4. 화면이 열리면 접속 이력·방문 수·초대 읽음을 한 번 기록(`share_record_visit` RPC)

- 방문 수는 브라우저당 30분에 1회만 센다(쿠키). 새로고침이 방문으로 다시 세어지지 않고, 이미 센 사람은 횟수 제한에도 막히지 않는다.
- 최대 방문 횟수는 DB 함수가 원자적으로 확인한다(동시 접속에도 초과되지 않는다).
- 비밀번호는 scrypt 해시로만 저장한다. 만든 사람도 나중에 원문을 다시 볼 수 없다(비밀번호를 바꾸면 이전 쿠키는 무효).
- 비밀번호 시도는 IP·링크당 10분에 8회로 제한한다.

## 전달 방법

SMS/카카오 발송 인프라가 없어서 aquavys의 발송 대신 **기기의 앱을 여는 방식**이다.

- 링크 복사, 메일 앱(`mailto:`), 문자 앱(`sms:`), 기기 공유 시트(Web Share API, 지원하는 브라우저)
- 초대 목록에서 "다시 보내기"로 같은 문구를 다시 채워 연다. 실제 발송/성공 여부는 알 수 없다.

## 관리자 화면

`/site/shares`(관리자 사이드바 > 운영 > 공유 링크): 링크별 유형·만든 사람·만료·방문·초대 읽음 현황, 접속 이력(시각·초대자·IP·브라우저), 링크 복사, 삭제.

## 구조

- **DB**: `supabase/patch-share-links.sql` — `share_links`, `share_invites`, `share_access_log`, `share_record_visit()`, 관리자 메뉴 행. 화면(anon/authenticated)에는 권한이 없고 서버(service_role)만 읽고 쓴다.
- **서버**: `lib/share/` — `service.ts`(생성·검증·목록), `actions.ts`(서버 액션), `targets.ts`(자료 로드), `password.ts`, `keys.ts`
- **화면**: `components/share/`(버튼·대화상자·공유 화면), `app/(public)/share/[key]/page.tsx`, `app/(dashboard)/site/shares/`
- 문구는 `locales/*.json`의 `share`.

## 적용

Supabase SQL Editor에서 `supabase/patch-share-links.sql`을 실행한다(재실행해도 안전). `SUPABASE_SERVICE_ROLE_KEY`가 서버에 설정되어 있어야 한다(쿠키 서명에도 쓴다).
