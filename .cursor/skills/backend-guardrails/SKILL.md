---
name: backend-guardrails
description: >-
  Senior backend guardrails for this Next.js + Supabase app. Use when writing
  or changing server actions, API routes, SQL patches, RLS, auth checks,
  pagination, or any database query. Covers N+1, injection, secrets, and
  response shape.
---

# Backend guardrails (DevDeck)

This repo is **Next.js App Router + Supabase (`devdeck` schema)**, not Prisma/Drizzle, not NextAuth/Clerk, not tRPC. Do not add Zod, OpenAPI, or a new ORM unless the user asks.

Follow `.cursor/rules/backend.mdc`. Before finishing a backend change, run this list.

## Pre-flight

- [ ] Untrusted input (form/query/json/path) is validated on the server
- [ ] Authz runs **before** read/write (`getAuthUser`, `isOwnerUser`, author check)
- [ ] `createServiceClient()` is not imported from a client component; RLS bypass has an explicit auth check first
- [ ] New SQL includes `ENABLE ROW LEVEL SECURITY` and policies (or REVOKE from `anon`/`authenticated`) in the **same** patch
- [ ] No query inside `map`/`for` (use `.in()` or a join)
- [ ] List endpoints use `lib/pagination.ts` and indexes exist for filter/sort columns
- [ ] Counters use an RPC, not read-then-write
- [ ] User HTML goes through `sanitizeRichHtml`
- [ ] `ilike` / `.or()` strings go through `ilikeContains`
- [ ] Secrets only from `process.env`; only public values use `NEXT_PUBLIC_`
- [ ] Route handlers: real 4xx/5xx, never `200` + `{ success: false }`
- [ ] Server actions: `{ ok: true } | { ok: false, error }` — do not throw to the UI
- [ ] Side effects (notifications, stats) must not block the main write

## Where to look

| Need | File |
| --- | --- |
| Anon/auth client | `lib/supabase/server.ts` (`db.schema: "devdeck"`) |
| service_role | `lib/supabase/service.ts` |
| Search escape | `lib/pagination.ts` → `ilikeContains` |
| HTML XSS | `lib/content.ts` → `sanitizeRichHtml` |
| Rate limit | `lib/uploads/rate-limit.ts` → `checkRateLimit` |
| Owner check | `lib/auth/roles.ts` → `isOwnerUser` |
| SQL patches | `supabase/patch-*.sql` (idempotent, no DROP of `public`) |

## SQL patch shape

Re-runnable. Do not `DROP`/`REPLACE` objects in `public`. Prefix functions `devdeck.*`.

```sql
CREATE TABLE IF NOT EXISTS devdeck.example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE devdeck.example ENABLE ROW LEVEL SECURITY;
-- policies + GRANTs in the same file
```
