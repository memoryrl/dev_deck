# 07. 업로드 (Uppy 첨부 컴포넌트 + CKEditor 이미지 업로드)

참고 프로젝트 `glow_platform`(Spring Boot + React)의 `UppyUploadWidget` / `MyUploadAdapter` / `EditorUploadService` 구조를 분석해, Next.js + Supabase 스택에 맞게 재구성한 설계다. 백엔드가 스프링부트가 아니므로 전송 계층은 바꾸되, **"범용 첨부는 Uppy 대시보드, 에디터 이미지는 별도의 경량 업로드 어댑터"** 로 두 경로를 분리하는 원 설계의 핵심은 그대로 가져온다.

## 1. 범위

**포함**

- 재사용 가능한 Uppy 업로드 컴포넌트 (프론트) + Supabase Storage 저장 (백엔드)
- CKEditor5 이미지 업로드: 툴바 버튼(`insertImage`) + 본문에 직접 붙여넣기(clipboard paste) 모두 지원
- 업로드 전 브라우저에서 이미지를 자동 압축해 원본 용량을 낮추는 처리
- 위 두 경로가 만든 이미지가 실제 페이지에 그대로 렌더링되도록 sanitize/CSS 보강

**제외 (후속 과제로 문서 11장에 기록)**

- 게시글/커리어 글에 "첨부파일 목록"을 붙이는 도메인 기능 (예: `career_posts.attachments`) — 이번 작업은 업로드 인프라만 만들고, 어디에 attachments를 매다는지는 별도 요청 시 진행
- 업로드된 파일의 관리자 목록/삭제 배치 작업

## 2. 아키텍처 개요

두 개의 독립된 업로드 경로를 둔다. 공유하는 것은 Supabase Storage와 검증 유틸(`lib/uploads/*`)뿐이다.

```text
[경로 A] 범용 첨부 (Uppy Dashboard)
  브라우저 ──(Uppy + @uppy/tus, 재개 가능한 청크 업로드)──▶ Supabase Storage TUS 엔드포인트
                                                              (storage/v1/upload/resumable)
  브라우저 ──(업로드 완료 후 메타 기록)──▶ Next.js Route Handler ──▶ devdeck.uploads 테이블

[경로 B] CKEditor 이미지 업로드 (툴바 + 붙여넣기)
  CKEditor UploadAdapter ──(클라이언트 압축: compressorjs)──▶ 압축된 File
                          ──(단순 multipart POST)──▶ Next.js Route Handler
                                                       ├─ MIME 시그니처/용량 검증
                                                       ├─ IP 레이트리밋
                                                       └─ Supabase Storage 업로드 (서비스 롤)
                          ◀─ { default: publicUrl } ──┘
```

**왜 경로를 나누는가:** 참고 프로젝트도 동일하게 나눠져 있다. 범용 첨부는 대용량·다중 파일이 전제라 재개 가능한 TUS 전송이 맞고, 에디터 이미지는 클립보드 붙여넣기 한 장을 즉시 업로드하는 짧은 요청이라 CKEditor의 `UploadAdapter` 계약(Promise 하나로 끝) 그대로 단순 POST가 맞다. 이 프로젝트는 Vercel Serverless라 대용량 파일을 Route Handler 바디로 받으면 페이로드 제한에 걸리므로, 경로 A는 **브라우저 → Supabase Storage 직결**로 서버를 거치지 않는다. Supabase Storage는 TUS(resumable) 프로토콜을 네이티브로 지원하므로 별도 업로드 서버를 만들 필요가 없다.

## 3. Supabase Storage 설계

버킷 2개, 둘 다 public(읽기 공개 — 에디터 이미지·첨부파일 모두 사이트에 노출되는 콘텐츠이므로).

| 버킷 | 용도 | 쓰기 주체 | 경로 규칙 |
| --- | --- | --- | --- |
| `editor-images` | CKEditor 이미지 업로드 | Route Handler만 (서비스 롤 키로 RLS 우회) | `editor/{yyyy}/{mm}/{uuid}.{ext}` |
| `uploads` | 범용 첨부 (Uppy) | 로그인 사용자 본인 폴더만 (RLS) | `{auth.uid()}/{uuid}-{원본파일명}` |

`editor-images`는 브라우저가 Storage에 직접 쓰지 않고 항상 우리 Route Handler를 통하므로, RLS는 "전체 차단(서비스 롤만 통과)"로 잠가도 된다. `uploads`는 브라우저가 TUS로 직접 쓰므로 RLS가 실질적인 보안 경계다.

`supabase/patch-uploads.sql` (신규 파일, 기존 patch 파일들과 동일한 방식으로 1회 실행):

```sql
insert into storage.buckets (id, name, public)
values ('editor-images', 'editor-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- editor-images: 공개 읽기만 허용, 쓰기는 서비스 롤(RLS 우회)만
create policy "editor-images public read"
  on storage.objects for select
  using (bucket_id = 'editor-images');

-- uploads: 공개 읽기 + 로그인 사용자는 자기 폴더(uid/)에만 쓰기·삭제
create policy "uploads public read"
  on storage.objects for select
  using (bucket_id = 'uploads');

create policy "uploads owner write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "uploads owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
```

앱 스키마(`devdeck`)에 업로드 메타데이터 테이블 추가 (누가 뭘 올렸는지 목록/삭제 UI에 필요):

```sql
create table if not exists devdeck.uploads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references devdeck.profiles(id) on delete cascade not null,
  bucket text not null,
  object_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);
```

## 4. 백엔드

### 4.1 공용 유틸 — `lib/uploads/`

- `constants.ts` — 버킷명, 허용 확장자, 용량 상한 상수
- `validate.ts` — 매직바이트로 실제 이미지 타입 확인(`image/jpeg|png|webp|gif`), 확장자 화이트리스트, 용량 검사
- `rate-limit.ts` — IP별 슬라이딩 윈도 카운터 (in-memory `Map`). 서버리스 인스턴스가 재시작되면 초기화되는 best-effort 방어임을 주석으로 명시 (11장 후속 과제에 Upstash 전환 옵션 기록)
- `service-client.ts` (`lib/supabase/service.ts`에 둘 수도 있음) — `SUPABASE_SERVICE_ROLE_KEY`로 만든 서버 전용 Storage 클라이언트. 기존 `lib/supabase/server.ts`(쿠키 세션)와 분리해 실수로 라우트 밖에서 쓰이지 않게 별도 파일로 둔다.

### 4.2 `POST /api/uploads/editor-image`

CKEditor `UploadAdapter`가 호출하는 엔드포인트. **로그인 여부와 무관하게 열어둔다** — 프롬프트·커리어·Steam 댓글은 비회원도 쓸 수 있고(`components/comments/comment-form.tsx`) 그 에디터에도 이미지 업로드를 지원해야 하므로, 세션 기반 인증으로 막을 수 없다. 대신:

1. `Content-Type`이 `multipart/form-data`인지, `file` 필드가 있는지 확인
2. 매직바이트로 jpeg/png/webp/gif 인지 검증 (확장자·`file.type`은 클라이언트가 조작 가능하므로 신뢰하지 않음)
3. 용량 상한 검사 (서버 쪽 하드 캡, 클라이언트 압축을 우회해도 막히도록 — 8MB 제안)
4. `clientIpFromHeaders()`(`lib/comments/ip.ts` 재사용)로 IP 레이트리밋 (예: 10분당 20장)
5. `crypto.randomUUID()` 파일명으로 `editor-images/editor/{yyyy}/{mm}/{uuid}.{ext}` 에 업로드 (서비스 롤 클라이언트)
6. `{ default: publicUrl }` 응답 — CKEditor5 `UploadAdapter.upload()`가 resolve해야 하는 공식 계약 형태

실패 시 CKEditor가 알아서 인라인 에러 UI를 띄우므로, 4xx/5xx + `{ error: string }` 형태만 지키면 된다.

### 4.3 `POST /api/uploads/attachments/finalize`

Uppy가 TUS로 Storage에 직접 올린 **뒤**, 업로드 완료 메타를 기록만 하는 엔드포인트. 로그인 필요(`ensureProfile()`), 본인 소유 경로(`{uid}/...`)인지 검증 후 `devdeck.uploads`에 insert. 실제 바이트 전송에는 관여하지 않으므로 페이로드 제한과 무관하다.

## 5. 프론트엔드

### 5.1 신규 의존성

```bash
npm install @uppy/core @uppy/react @uppy/dashboard @uppy/tus compressorjs
```

- Uppy 계열: 공식 npm 패키지 그대로 사용 (참고 프로젝트는 `window.Uppy` 전역 스크립트 방식이었지만, Next.js는 번들러가 있으니 `@uppy/react`의 `<Dashboard uppy={uppy} />`를 그대로 쓰는 게 자연스러운 커스터마이징이다)
- `compressorjs`: 참고 프로젝트가 쓰던 `Compressor.js`와 동일 라이브러리의 npm 배포판. 압축 로직 이식이 1:1로 맞아떨어져서 그대로 채택

### 5.2 `components/upload/uppy-file-upload.tsx`

재사용 컴포넌트. 특정 도메인(게시글/커리어 등)에 종속시키지 않고 아래 계약만 갖는다.

```ts
type UppyFileUploadProps = {
  onUploaded?: (file: { url: string; objectPath: string; name: string; size: number }) => void
  allowedFileTypes?: string[]  // 기본: 이미지 + pdf/zip 등 일반 문서
  maxFileSize?: number         // 바이트, 기본 50MB
  maxNumberOfFiles?: number    // 기본 5
}
```

내부 동작:

1. `useMemo`로 `Uppy` 인스턴스 생성, `Tus` 플러그인 등록 (`endpoint: ${SUPABASE_URL}/storage/v1/upload/resumable`)
2. `file-added` 이벤트에서 `file.meta`에 `bucketName: 'uploads'`, `objectName: '{uid}/{uuid}-{원본명}'`, `contentType` 주입 (uid는 클라이언트에서 `supabase.auth.getSession()`으로 획득)
3. Tus 요청 헤더에 `Authorization: Bearer {access_token}`, `apikey: NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `upload-success` 이벤트에서 `/api/uploads/attachments/finalize` 호출 → 성공 시 `onUploaded` 콜백
5. `<Dashboard uppy={uppy} />` 렌더 (`@uppy/dashboard`, `@uppy/core`의 기본 CSS import)

### 5.3 CKEditor 이미지 플러그인 — `components/editor/rich-editor-client.tsx` 수정

플러그인 추가: `Image`, `ImageBlock`, `ImageInline`, `ImageCaption`, `ImageStyle`, `ImageToolbar`, `ImageResize`, `ImageUpload`, `ImageInsert`, `ImageInsertViaUrl`, `FileRepository`.

- 메인 툴바에 `insertImage` 버튼 추가 (업로드 + URL 삽입 드롭다운을 CKEditor가 알아서 구성)
- `image.toolbar`: 정렬/캡션/리사이즈 컨텍스트 툴바
- 붙여넣기(clipboard paste)는 `ImageUpload`가 기본 내장 지원이라 별도 구현 불필요 — 기존 `structurePastedClipboard` 로직(HTML/텍스트 붙여넣기용)과 별개 경로라 충돌 없음
- `editor.plugins.get('FileRepository').createUploadAdapter = (loader) => new EditorImageUploadAdapter(loader)` 로 커스텀 어댑터 연결

`GeneralHtmlSupport`는 도입하지 않는다 — 참고 프로젝트는 썼지만, 이 프로젝트는 렌더링 시 `sanitize-html` 화이트리스트를 통과시키는 구조라 에디터에서 임의 스타일/속성을 허용하면 화이트리스트와 이중 관리가 되고 XSS 표면도 늘어난다. 이미지 스타일/리사이즈에 필요한 속성만 4.4에서 개별적으로 허용한다.

### 5.4 `components/editor/ckeditor-upload-adapter.ts` (신규)

참고 프로젝트 `MyUploadAdapter.js`를 TS로 이식하되 두 가지를 고친다: (1) 압축본 하나만 전송(원본 파일을 같은 필드명으로 중복 append하던 부분은 정리), (2) resolve 값을 CKEditor5 공식 계약인 `{ default: url }`로 맞춘다(원본은 `{ urls: { default } }`로 감싸고 있었음).

```ts
class EditorImageUploadAdapter {
  constructor(private loader: FileLoader) {}

  async upload() {
    const file = await this.loader.file
    const prepared = await prepareImageForUpload(file) // 5.5 압축 로직
    const formData = new FormData()
    formData.append("file", prepared, file.name)
    const res = await fetch("/api/uploads/editor-image", { method: "POST", body: formData })
    if (!res.ok) throw (await res.json().catch(() => null))?.error ?? "업로드에 실패했습니다."
    const { default: url } = await res.json()
    return { default: url }
  }

  abort() {
    this.controller?.abort()
  }
}
```

### 5.5 자동 압축 로직 — `lib/editor/compress-image.ts` (신규)

```ts
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.type === "image/gif") return file // 움짤은 정적 이미지로 변환되면 안 되므로 원본 유지
  if (file.size <= 400 * 1024) return file    // 이미 충분히 작으면 압축 생략

  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
      convertTypes: ["image/png"],
      convertSize: 1_000_000, // 1MB 넘는 PNG는 손실 적은 스크린샷 특성상 JPEG로 자동 전환
      success: (result) => resolve(new File([result], file.name, { type: result.type })),
      error: reject,
    })
  })
}
```

이게 "고용량으로 업로드 시 에디터가 대응할 수 있도록 자동으로 저용량화" 요구사항의 실체다: 원본 파일 크기·타입을 보고 필요할 때만 리사이즈+재인코딩하고, 서버는 4.2의 8MB 캡으로 한 번 더 방어한다.

### 5.6 렌더링 보강

**`lib/content.ts` `sanitizeRichHtml`** — CKEditor가 만드는 `<figure class="image image-style-side"><img src="..." class="image_resized" style="width:55%"><figcaption>...</figcaption></figure>` 구조가 그대로 통과하도록 허용 목록 확장:

```ts
allowedAttributes: {
  ...
  img: [...sanitizeHtml.defaults.allowedAttributes.img, "class", "style"],
  figure: ["class", "style"],
  figcaption: ["class"],
},
allowedStyles: {
  "*": {
    "margin-left": [...], "padding-left": [...],
    "width": [/^\d+(?:\.\d+)?(?:px|%|em|rem)$/],
  },
},
```

**`app/globals.css`** — 에디터 밖(`.prose-deck`)에서도 이미지 정렬/리사이즈 클래스가 CKEditor 에디팅 화면과 동일하게 보이도록 `.image-style-side`, `.image-style-align-left/right/center`, `.image-style-block`, `.image_resized`, `figure.image > img` 규칙을 CKEditor5 기본값에 맞춰 추가. 기존 `.prose-deck :where(...)` 옆에 `.prose-deck img`, `.prose-deck figure.image` 규칙을 나란히 추가하는 지금 파일의 패턴을 그대로 따른다.

## 6. 데모/검증 지점

- `/site/uploads` (신규, 소유자 전용 — `/site/*`는 미들웨어가 이미 owner만 통과시킴): `UppyFileUpload` 컴포넌트를 올려두고 업로드 → `devdeck.uploads` 목록 확인까지 되는지 눈으로 검증하는 페이지. `components/layout/admin-nav.ts`에 "업로드" 메뉴 항목 추가
- CKEditor 이미지 업로드는 `RichEditorClient`를 쓰는 모든 화면(PromptKit/CareerLog/게시판/스팀 리뷰/댓글)에 자동 적용됨 — 별도 데모 페이지 불필요, 기존 글쓰기 화면에서 바로 확인 가능

## 7. 보안/제약 사항

- 프롬프트·커리어·Steam 댓글은 비회원도 쓸 수 있어 이미지 업로드 엔드포인트가 사실상 공개 엔드포인트다. 매직바이트 검증 + 용량 캡 + IP 레이트리밋으로 방어하되, 이건 개인 프로젝트 규모에 맞춘 best-effort이지 완전한 어뷰징 방지는 아니라는 점을 명시
- 레이트리밋은 서버리스 함수 인스턴스 메모리 기반이라 재시작/스케일아웃 시 카운터가 리셋된다. 트래픽이 늘면 Upstash Redis 등으로 교체할 지점으로 남겨둠
- `editor-images` 버킷은 RLS로 잠그고 서비스 롤 라우트만 쓰게 해서, 업로드 검증을 우회해 Storage에 직접 쓰는 경로를 차단
- `uploads` 버킷은 로그인 사용자 본인 폴더 밖 쓰기를 RLS로 차단

## 8. 구현 체크리스트

1. `supabase/patch-uploads.sql` 작성 (버킷 2개 + RLS + `devdeck.uploads` 테이블) — 실행은 사용자가 Supabase에서 수행
2. `package.json`에 Uppy 4종 + `compressorjs` 추가, `npm install`
3. `lib/uploads/constants.ts`, `validate.ts`, `rate-limit.ts`
4. `lib/supabase/service.ts` (서비스 롤 클라이언트)
5. `app/api/uploads/editor-image/route.ts`
6. `app/api/uploads/attachments/finalize/route.ts`
7. `lib/editor/compress-image.ts`
8. `components/editor/ckeditor-upload-adapter.ts`
9. `components/editor/rich-editor-client.tsx` — 이미지 플러그인/툴바/어댑터 연결
10. `lib/content.ts` — `sanitizeRichHtml` 확장
11. `app/globals.css` — 이미지 렌더 스타일 추가
12. `components/upload/uppy-file-upload.tsx`
13. `app/(dashboard)/site/uploads/page.tsx` (데모) + `components/layout/admin-nav.ts` 메뉴 추가
14. `npm run build` 또는 `tsc --noEmit`으로 타입 검증

## 9. 후속 과제 (이번 범위 밖)

- 게시글·커리어 글에 첨부파일 목록 UI를 실제로 매다는 작업 (어느 테이블에 붙일지 결정 필요)
- `devdeck.uploads` 관리자 목록/삭제 화면
- 레이트리밋을 Upstash 등 영속 저장소 기반으로 교체
- 이미지 반응형 `srcset` 생성 (현재는 압축된 단일 사이즈만 저장)
