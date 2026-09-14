# 01. Product Requirements Document — DevDeck

## 1. 제품 개요

| 항목 | 내용 |
| --- | --- |
| 프로젝트명 | DevDeck (`devdeck`) |
| 유형 | Personal Developer & Leisure Hub / 1인 SaaS MVP |
| 대상 | 본인 (Tech Lead) + 포트폴리오 방문자 |
| 한 줄 | 프롬프트, 회사 참여 이력·스킬, Steam 라이브러리를 같은 허브에서 관리한다 |

### 1.1 문제

- 바이브 코딩 프롬프트가 메모장, 채팅, 로컬 파일에 흩어진다.
- 회사 프로젝트·역할·스킬이 이력서 한 장과 기억에만 남는다.
- Steam 플레이타임·한줄평·UMPC 프리셋이 머릿속이나 스프레드시트에 남는다.
- 세 영역을 공개 포트폴리오로 보여 줄 공간이 없다.

### 1.2 핵심 가치

방문자는 랜딩에서 “이 사람이 무엇을 만들었고, 어떻게 일하며, 무엇을 플레이하는지”를 본다. 소유자는 로그인 후 PromptKit · CareerLog · Steam Tracker를 같은 사이드바에서 오간다.

## 2. 목표 / 비목표

### 2.1 목표 (MVP)

1. Google OAuth로 로그인한다.
2. 프롬프트를 CKEditor 5로 CRUD하고, 원클릭 복사한다.
3. `is_public = true` 프롬프트는 비로그인 방문자도 **전문을 읽는다.** 랜딩 목록만 **최근 6개**. 공유 링크(`/p/[id]`)는 공개 글이면 언제든 열림.
4. Steam 보유 게임·플레이타임을 서버 프록시로 불러온다.
5. 게임별 리뷰, 평점, UMPC 프리셋을 저장한다.
6. 회사 참여 프로젝트와 스킬을 게시판·블로그로 CRUD하고, 공개 글은 `/work`에서 읽는다.
7. 공개 랜딩이 PromptKit / CareerLog / Steam Tracker를 쇼케이스로 소개한다.

### 2.2 비목표 (이번 사이클에서 하지 않음)

| 항목 | 이유 |
| --- | --- |
| 멀티 테넌트 / 팀 워크스페이스 | 1인 운영 전제 |
| 사용자별 Steam API 키 저장 | 키 유출 위험. 서버 env만 사용 |
| 결제, 플랜, 사용량 과금 | MVP 범위 밖 |
| 실시간 멀티플레이어, 친구 목록 | Steam Web API 최소 범위만 |
| 인앱 AI 실행 (Prompt Runner) | v2. 라우트만 예약 |
| 네이티브 앱, PWA 푸시 | 웹만 |
| 관리자 CMS | 소유자 = 유일한 write 유저 |
| 댓글, 좋아요, 구독 RSS | CareerLog MVP는 읽기·쓰기만 |
| 이력서 PDF 내보내기 | v2 |

## 3. 사용자

| 페르소나 | 설명 | 주요 행동 |
| --- | --- | --- |
| Owner (본인) | 로그인하는 유일한 작성자 | 프롬프트/커리어 글·스킬/리뷰 CRUD, Steam 동기화 |
| Visitor | 포트폴리오 방문자 | 랜딩, `/work` 게시판, 공개 상세(`/p`, `/work/[id]`) 열람 |

Owner가 아닌 로그인 유저(회원)는 대시보드·게시물 쓰기가 막힌다. RLS 쓰기도 관리자 이메일만 허용한다.

## 4. 사용자 스토리

### Auth

- Owner(`memoryrl@gmail.com`)만 Google 로그인 후 대시보드에서 글을 편집한다.
- 그 외 로그인 사용자는 회원이다. `/account`로 가며 게시물 편집 UI·액션·RLS 쓰기가 막힌다.
- 세션이 없으면 `/promptkit`, `/career`, `/steam`은 `/login`으로 보낸다.

### PromptKit

- 프롬프트 제목, 본문, 카테고리(자유 문자열), 태그를 저장한다.
- 본문은 CKEditor 5(`RichEditor`)로 편집하고, 상세는 `RichContent`로 본다.
- 원클릭으로 클립보드에 복사한다.
- 공개 여부를 토글한다.
- 상세 페이지에서 수정·삭제한다.

### CareerLog

- 참여 프로젝트·회고를 게시판 목록과 블로그 본문(CKEditor HTML)으로 저장한다.
- 글 종류는 `project` / `skill` / `note` 중 하나다.
- 프로젝트 글에는 회사, 역할, 기간을 붙일 수 있다.
- 스킬 인벤토리(이름, 숙련도, 연차, 한 줄 요약)를 따로 정리한다.
- 공개 여부를 글·스킬 단위로 토글한다.
- 방문자는 `/work`에서 공개 글 전체를 목록으로 보고, `/work/[id]`에서 전문을 읽는다.

### Steam Tracker

- 방문자는 로그인 없이 `/games`에서 보유 게임·리뷰를 본다.
- Owner는 `/steam`에서 리뷰를 편집한다 (로그인 필요).
- 게임 상세에서 리뷰, 평점(0.0–5.0), UMPC 프리셋, 즐겨찾기를 저장한다.
- 같은 게임을 두 번 리뷰하지 않는다 (`user_id + app_id` 유니크).

### Boards & Menus

- 관리자가 `boards`로 범용 게시판을 추가한다. 공개 URL은 `/b/{slug}`.
- PromptKit·CareerLog·Steam은 시스템 게시판으로 `/site/boards`에서 이름·읽기 권한·활성만 제어한다. 글은 전용 대시보드에서 편집한다.
- 시스템 게시판이 비활성이거나 view_role 미달이면 랜딩 티저·`/p`·`/work`·공개 리뷰가 숨겨진다.
- 읽기/쓰기 최소 권한: 방문객 / 회원 / 관리자.
- `menus`로 헤더·푸터를 관리하고, 메뉴에 게시판을 연결할 수 있다.
- DB 메뉴가 없으면 헤더는 기본 메가메뉴를 쓴다.

### Public

- 랜딩에서 세 모듈과 **최근 공개 프롬프트·개발업무 각 최대 4개**(좌우), Steam 탭(누적 시간 순위 / 최신 리뷰), 공개 스킬 칩을 본다.
- 로그인하지 않고 `/p/[id]`, `/work`, `/work/[id]`를 읽는다. 쓰기 UI는 숨김.
- 프롬프트 랜딩 6개 밖 공개 글은 URL이면 열린다. 커리어는 `/work`에 **공개 글 전부**가 게시판으로 올라간다. 랜딩만 6개 티저.
- 비공개·없는 id만 `notFound()`.

## 5. 기능 명세

### 5.1 Common & Auth

- Provider: Google (Supabase OAuth)
- 관리자: `memoryrl@gmail.com`. 그 외 로그인은 회원(편집 없음)
- 로그인 성공 시 `profiles` 행이 없으면 트리거로 생성
- RLS: 본인 데이터 CRUD. `prompts` / `career_posts` / `career_skills` 의 `is_public = true` 는 SELECT 공개
- `game_reviews`는 포트폴리오용으로 **공개 읽기**. 쓰기(리뷰 편집)만 로그인

### 5.2 PromptKit (Dev)

| ID | 기능 | MVP |
| --- | --- | --- |
| PK-01 | 목록: 제목, 카테고리, 태그, 공개 배지, 검색/필터 | Yes |
| PK-02 | 생성/수정 폼 + CKEditor 5 본문 | Yes |
| PK-03 | 원클릭 복사 | Yes |
| PK-04 | 삭제 (확인 다이얼로그) | Yes |
| PK-05 | 공개 토글 | Yes |
| PK-06 | 인앱 AI 실행 | **v2** |
| PK-07 | 공개 상세 `/p/[id]` (비로그인, `is_public`이면 링크 유지) | Yes |

### 5.3 CareerLog (Career)

게시판(목록·필터) + 블로그(CKEditor 본문 상세). 이력서 PDF가 아니다.

| ID | 기능 | MVP |
| --- | --- | --- |
| CL-01 | 대시보드 게시판 `/career`: 제목, 종류, 회사, 태그, 공개 배지, 검색/필터 | Yes |
| CL-02 | 글 CRUD + CKEditor 5 본문 | Yes |
| CL-03 | `post_type`: `project` / `skill` / `note` | Yes |
| CL-04 | 프로젝트 메타: 회사, 역할, 시작일, 종료일(빈 값 = 진행 중) | Yes |
| CL-05 | 글 태그·관련 스킬 이름 배열 | Yes |
| CL-06 | 공개 토글 | Yes |
| CL-07 | 공개 게시판 `/work` (공개 글 전부, 페이지네이션 없음·최신순) | Yes |
| CL-08 | 공개 상세 `/work/[id]` (`is_public`이면 링크 유지) | Yes |
| CL-09 | 스킬 인벤토리 CRUD (`career_skills`) | Yes |
| CL-10 | 랜딩: 최근 공개 글 6개 + 공개 스킬 칩. 칩 → `/work` 필터 또는 글 목록 | Yes |
| CL-11 | 댓글 / 좋아요 / 커버 이미지 / URL 슬러그 | **v2** |

기밀·NDA 내용은 기본 비공개(`is_public = false`). 공개 여부 책임은 Owner에게 있다.

### 5.4 Steam Tracker (Leisure)

| ID | 기능 | MVP |
| --- | --- | --- |
| ST-01 | `/api/steam/games` 로 보유 게임 + 플레이타임 | Yes |
| ST-02 | CDN 헤더 이미지 `.../apps/{appid}/header.jpg` | Yes |
| ST-03 | 리뷰/평점/UMPC 프리셋/즐겨찾기 | Yes |
| ST-04 | 목록에서 리뷰 있음·즐겨찾기 표시 | Yes |
| ST-05 | 마지막 플레이, 2주 플레이, Deck 시간, 상점 소개/장르/Deck 호환, 업적 진행 | Yes |
| ST-06 | Steam 친구, 2주 세분화 차트 | No |

### 5.5 Landing

- 공개 헤더: `lg+` 메가메뉴(하단 포인트색), `lg` 미만 햄버거·우측 슬라이드 메뉴
- 히어로: 제품명, 한 줄 가치, CTA (`로그인` / 공개 콘텐츠 앵커), 메쉬 그라데이션, 우측 하단 상징 비주얼
- 모듈 카드 PromptKit / CareerLog / Steam Tracker — 좌우 자동 스크롤
- Steam 위: AI Prompt / 개발업무 최신 각 최대 4개 (좌우). 시스템 게시판 권한 적용
- Steam 탭: 누적 시간 순위 / 최근 플레이 / 최신 리뷰. 1위 2행 + 우측 4장. 리뷰는 steam 시스템 게시판 권한 적용
- 공개 스킬 칩 (개수 제한 없음, `sort_order`)
- 푸터: 기술 스택 표기
- 헤더: 테마 토글 (기본 라이트, 다크 허용), `커리어` → `/work`

### 5.6 카테고리 (자유 텍스트)

`category`는 React / Next.js 같은 **미리 정한 enum이 아니다.** `TEXT` 한 칸에 원하는 이름을 적는다. 비우면 `General`.

- 허용 예: `React`, `Next.js`, `바이브코딩`, `시스템설계`
- 하지 않는 것: DB CHECK로 값 제한, 관리자 카테고리 마스터 테이블
- 목록 필터는 저장된 문자열을 그대로 묶는다 (오타가 있으면 별개 카테고리로 보인다)

태그와 역할이 다르다. 카테고리는 글당 **하나**(큰 분류), 태그는 **여러 개**(검색용).

CareerLog의 `post_type`만 예외다. 게시판 필터를 위해 `project` | `skill` | `note` 세 값으로 고정한다. 회사명·스킬 이름·글 태그는 자유 텍스트다.

## 6. 성공 기준

MVP는 아래가 모두 되면 완료다.

1. 로컬에서 OAuth 로그인 → 대시보드 진입이 된다.
2. 프롬프트 생성 → 목록 → 복사 → 공개 토글 → 비로그인으로 `/p/[id]` 전문 열람이 된다. 랜딩에는 최근 6개만 보인다.
3. 커리어 글·스킬을 만들고 공개하면 `/work`, `/work/[id]`, 랜딩 티저에 보인다. 비공개 글은 방문자에게 404.
4. Steam 프록시가 env의 `STEAM_API_KEY` / `STEAM_ID`로 게임 목록을 반환한다.
5. 게임 상세에서 리뷰를 저장하면 새로고침 후에도 남는다.
6. 사이드바로 PromptKit ↔ CareerLog ↔ Steam 전환이 된다.

## 7. 제약

- 1인 개발. 운영 복잡도보다 명확한 모듈 경계가 우선이다.
- Steam Web API 호출은 **서버에서만**. 브라우저에 API 키를 넣지 않는다.
- 프롬프트·커리어·게시판 본문은 CKEditor HTML이다. 보기 모드는 sanitize 후 렌더하고, 예전 Markdown 글은 그대로 Markdown으로 보여 준다.
- `steam_api_key` 컬럼은 **스키마에 만들지 않는다.** (원본 초안의 변경점. [03-database.md](./03-database.md) 참고)
- DB는 기존 Supabase 프로젝트에 `devdeck` 스키마만 추가한다. 기존 `public` 객체를 바꾸지 않는다.
