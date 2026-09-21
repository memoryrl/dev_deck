# 11. 알림 (푸시알림)

로그인한 사용자의 헤더에 알림 종이 붙고, 1분마다 새 알림을 확인한다.
브라우저 Web Push가 아니라 **사이트 안의 알림**이다(종 배지 + 토스트 + 우측 패널).

## 언제 알림이 가나

| 이벤트 | 받는 사람 | type |
| --- | --- | --- |
| 회원 가입 | 관리자 | `member_signup` |
| 회원 탈퇴 | 관리자 | `member_withdraw` |
| 글 등록 (게시판 글, 프롬프트, 커리어 글, 게임 리뷰) | 관리자 | `post_created_admin` |
| 글 등록 | 작성자 | `post_created_author` |
| 댓글·답글 | 해당 글의 작성자 (본인 댓글 제외) | `post_reply` |

- 작성자가 관리자이면 관리자용 알림은 만들지 않고 작성자 알림 1건만 간다.
- Steam 리뷰 글에 달린 댓글은 리뷰 작성자(관리자)에게 간다.
- 문구는 DB에 저장하지 않는다. `type` + 행위자 이름 + 글 제목으로 화면에서 보는 사람의 언어에 맞춰 조립한다(`locales/*.json`의 `notifications`).

## 구조

- **생성**: `supabase/patch-notifications.sql`의 DB 트리거. 어느 경로로 글이 등록돼도 빠지지 않는다. 트리거 안에서 오류가 나도 원래 동작(글 등록·가입 등)은 막지 않는다.
- **권한**: RLS로 내 알림(`recipient_id = auth.uid()`)과 관리자 공용 알림(`for_owner`)만 조회·읽음 처리한다. 화면에서 바꿀 수 있는 컬럼은 `read_at`뿐이다.
- **API**: `GET /api/notifications/poll`(미읽음 개수 + 최근 1건), `GET /api/notifications?filter=all|unread`, `POST /api/notifications/read`(`{ id }` 또는 `{ all: true }`).
- **화면**: `components/notifications/` — `NotificationCenter`(종·배지) → `NotificationToast`, `NotificationPanel`. 확인 주기는 `lib/notifications/config.ts`의 `NOTIFICATION_POLL_INTERVAL_MS`(60초).

## 폴링 동작

- 탭이 보이는 동안에만 1분 타이머를 돌린다. 가려지면(다른 탭·최소화) 타이머 자체를 멈추고, 다시 보이는 순간 바로 한 번 확인한 뒤 타이머를 새로 시작한다.
- "어디까지 봤는지" 기준선을 localStorage에 사용자별로 두어, 접속 시점에 이미 있던 알림은 토스트로 알리지 않고 그 이후 도착한 것만 알린다. 탭이 여러 개여도 기준선을 공유해 토스트가 중복되지 않는다.

## 적용

1. Supabase SQL Editor에서 `supabase/patch-notifications.sql`을 실행한다(재실행해도 안전).
2. 이후 앱은 별도 설정 없이 동작한다.
