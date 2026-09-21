---
description: devdeck 고유 백엔드 관례 (일반 규칙은 ~/.claude/rules/backend.md)
paths:
  - "app/api/**"
  - "app/**/actions.ts"
  - "lib/**/actions.ts"
  - "lib/**/service.ts"
  - "lib/supabase/**"
  - "supabase/**/*.sql"
---

# devdeck 백엔드 관례 (전역 규칙에 더해 적용)

- **서버 액션 반환형**: `{ ok: true, ... } | { ok: false, error }`. 검증 실패는 화면이 `share.error.<코드>`처럼 번역하는 **코드 문자열**로 돌려준다(`lib/share/service.ts`의 `ShareInputError` 참고).
- **권한 확인 도구**: `getAuthUser` / `ensureProfile`(로그인), `isOwnerUser`(관리자). `createServiceClient()`는 `lib/supabase/service.ts`, 서버에서만 import 한다.
- **입력 검증 예시**: `lib/share/service.ts`의 `cleanInvite`, `parseExpiry`. zod는 쓰지 않는다.
- **PostgREST 문자열 필터**(`.or(...)`)에는 사용자 입력을 `lib/pagination.ts`의 `ilikeContains`를 거쳐 넣는다.
- **HTML**: 저장·표시 전에 `lib/content.ts`의 `sanitizeRichHtml`.
- **레이트리밋**: 공개 엔드포인트는 `lib/uploads/rate-limit.ts`의 `checkRateLimit`.
- **원자적 카운터**: RPC 함수로(`share_record_visit` 참고). SQL 패치는 재실행해도 안전하게(`IF NOT EXISTS`, `CREATE OR REPLACE`, 테이블 존재 확인 후 트리거 생성).
- **부가 기능 트리거**: `EXCEPTION WHEN OTHERS`로 감싼다(`supabase/patch-notifications.sql`).
