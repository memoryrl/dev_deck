# 10. 로그인 · 접속 · 페이지뷰 이력

관리자 전용 `/site/login-history`. 회원 로그인, 회원·비회원 접속(세션), 그 세션이 어떤 페이지를 봤는지까지 한 화면에서 본다.

## 1. 범위

**포함**

- 구글 로그인 성공 시점 기록 (`event_type='login'`)
- 회원·비회원 구분 없이 사이트 접속(세션) 시점 기록 (`event_type='visit'`)
- IP·지역(도시·국가)·User-Agent
- **이번 추가:** 같은 세션 안에서 이동한 페이지 경로 목록 (펼쳐보기)
- 목록 필터(전체/로그인/접속), 이메일·IP·지역 검색, 페이지네이션

**제외**

- 봇/크롤러 자동 판별·차단 (User-Agent 패턴은 화면에서 사람이 눈으로 구분)
- 오래된 기록 자동 삭제(보존 기간 정책) — 트래픽이 커지면 `app/api/cron/*` 패턴으로 추가
- 페이지 체류 시간, 스크롤 등 상세 행동 분석

## 2. 이미 있는 것 (login_history)

`supabase/patch-login-history.sql`. 회원 로그인과 회원·비회원 접속을 한 테이블에 담는다.

| 컬럼 | 의미 |
| --- | --- |
| `id` | 세션 식별자로 재사용(아래 3절) |
| `user_id` | 비회원이면 NULL |
| `event_type` | `login` \| `visit` |
| `ip_address`, `ip_region`, `user_agent` | 접속 정보 |

기록 경로:

- `event_type='login'`: `app/auth/callback/route.ts`(OAuth 콜백)에서 로그인한 본인 계정으로 insert
- `event_type='visit'`: `app/api/track-visit/route.ts`에서 회원·비회원 무관하게 insert

세션 중복 방지: 쿠키 `dd_visit_logged`(30분) + 탭별 `sessionStorage` + 서버 측 `findRecentSessionId`(같은 IP·같은 user_id로 30분 내 기록 있으면 재사용). 즉 "세션"의 실제 경계는 **30분 슬라이딩 윈도우**다.

## 3. 이번에 추가하는 것 (page_views)

### 3.1 성능 질문에 대한 답

> 페이지뷰마다 기록하면 감당되나, 지금도 느껴지는 페이지 전환 딜레이가 더 늘지 않나?

- **DB 부하는 문제가 아니다.** 개인 사이트 트래픽에서 하루 수천 건의 INSERT는 Postgres에 부담이 안 된다. `page_views`는 `(visit_id, path, created_at)`만 담는 얇은 테이블이라 로우 자체도 가볍다.
- **진짜 위험한 건 지역 조회(ip-api.com) 반복 호출이다.** 그래서 지역 조회는 **세션당 1번**(로그인/최초 접속 시점)만 하고, `page_views`에는 그 결과를 다시 쓰지 않는다. 페이지 이동마다는 순수 INSERT 한 줄뿐, 외부 API 호출이 없다.
- **클라이언트를 막지 않는다.** 페이지뷰 기록은 화면이 이미 그려진 뒤 `navigator.sendBeacon`으로 백그라운드 전송한다(실패해도 무시, 응답을 기다리지 않음, 페이지 이탈 중에도 안전). Next.js 라우트 전환·렌더링과 인과관계가 없다.
- 체감 전환 지연이 있다면 이 기능과는 별개로, 대시보드 페이지들이 서버 컴포넌트에서 Supabase 조회를 기다렸다가 렌더링하는 구조이거나 `next dev`의 온디맨드 컴파일이 원인일 가능성이 크다.

### 3.2 세션 식별자

새 개념을 만들지 않고 **`login_history.id`를 세션 식별자로 재사용**한다. 로그인/최초 접속 시 만들어진 그 행의 id를 쿠키 `dd_visit_id`(30분, `dd_visit_logged`와 같은 창)에 저장해두고, 이후 페이지 이동마다 그 값을 그대로 `page_views.visit_id`로 보낸다.

### 3.3 테이블

`supabase/patch-page-views.sql`.

```sql
devdeck.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES devdeck.login_history(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

RLS: SELECT는 관리자만. INSERT는 `anon, authenticated` 모두(비회원 포함, `visit_id` FK가 실제 세션 행을 가리키는지만 강제). DELETE는 관리자만(정리용).

알려진 한계: INSERT 정책이 `WITH CHECK (true)`라, 유효한 `visit_id`(자기 세션)를 알고 있으면 그 세션에 임의 경로를 계속 밀어넣는 것 자체는 막지 않는다. 개인 사이트 규모에서 심각한 위협은 아니라 이번 범위에서는 손대지 않는다.

### 3.4 기록 흐름

1. **최초 페이지 로드** (`dd_visit_id` 쿠키 없음): `VisitTracker`가 `/api/track-visit`에 현재 경로를 같이 보낸다. 서버는 세션 행을 만들고(또는 30분 내 기존 세션 재사용) 그 id로 `dd_visit_id` 쿠키를 심은 뒤, 그 경로를 첫 `page_views` 행으로 기록한다.
2. **이후 클라이언트 라우팅** (`dd_visit_id` 쿠키 있음): App Router는 페이지 이동 시 루트 레이아웃을 다시 마운트하지 않으므로, `VisitTracker`가 `usePathname()`을 구독해 경로가 바뀔 때마다 `navigator.sendBeacon("/api/track-pageview", ...)`으로 가볍게 한 줄만 보낸다. 지역 조회 없음, 응답을 기다리지 않음.
3. **로그인 성공**: `app/auth/callback/route.ts`가 로그인 행을 만들 때도 `dd_visit_id` 쿠키를 같이 심고, 로그인 후 이동할 페이지를 첫 `page_views` 행으로 남긴다.

### 3.5 관리자 화면

`/site/login-history`의 각 행은 이제 "페이지 N건" 배지를 보여준다(같은 페이지 목록 조회 시 `visit_id`별로 묶어서 한 번에 카운트, N+1 쿼리 없음). 클릭하면 그 세션이 방문한 경로 목록을 펼쳐 보여준다(경로 + 시각). 펼침 상태는 클라이언트 컴포넌트(`login-history-row.tsx`)가 담당하고, 목록은 Server Action(`fetchPageViews`)으로 그때 가져온다 — 처음부터 모든 행의 상세를 미리 불러오지 않는다.

## 4. 파일

```text
supabase/patch-page-views.sql              신규 테이블 + RLS
supabase/schema.sql                        동일 DDL 반영

types/login-history.ts                     LoginHistoryEntry, PageViewEntry
lib/auth/visit-window.ts                   VISIT_ID_COOKIE 추가
lib/auth/login-history.ts                  recordPageView, listPageViews,
                                            countPageViewsByVisit, findRecentSessionId
app/api/track-visit/route.ts               세션 생성 + 첫 페이지뷰, dd_visit_id 쿠키
app/api/track-pageview/route.ts            신규 — 페이지뷰 한 줄만 기록
app/auth/callback/route.ts                 dd_visit_id 쿠키 + 로그인 직후 첫 페이지뷰
components/layout/visit-tracker.tsx        usePathname 구독 + sendBeacon

app/(dashboard)/site/login-history/
  page.tsx                                 목록 + 페이지뷰 개수
  actions.ts                               신규 — fetchPageViews Server Action
  login-history-row.tsx                    신규 — 펼침 가능한 행(클라이언트)
```
