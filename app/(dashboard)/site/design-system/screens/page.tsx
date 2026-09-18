import Link from "next/link"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ensureProfile } from "@/lib/supabase/server"

export default async function DesignSystemScreensPage() {
  await ensureProfile()

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-16">
      <PageTitleBanner
        title="디자인 시스템 - 화면영역"
        breadcrumb={[
          { label: "사이트 관리", href: "/site/menus" },
          { label: "디자인 시스템" },
        ]}
        actions={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/design-system/common">
              <ArrowLeft className="mr-1 size-4" /> 공통영역 보기
            </Link>
          </Button>
        }
      />

      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">
          DevDeck 프로젝트의 화면별 컴포넌트 가이드입니다. 각 기능 영역에서 사용하는 컴포넌트들의
          구조와 사용법을 설명합니다.
        </p>
        <div className="flex gap-2">
          <Badge>화면 컴포넌트</Badge>
          <Badge variant="secondary">피처별 분류</Badge>
          <Badge variant="outline">에이전트 참고용</Badge>
        </div>
      </section>

      {/* Board Components */}
      <FeatureSection
        id="board"
        title="게시판 (Board)"
        path="components/board/"
        description="게시판 목록, 글 읽기, 글 작성 등 게시판 기능에 사용되는 컴포넌트들입니다."
      >
        <ComponentCard
          name="BulletinList"
          path="components/board/bulletin-list.tsx"
          description="게시판 목록 테이블입니다. 번호, 제목, 작성자, 날짜, 카테고리 컬럼을 지원하며 페이지네이션과 연동됩니다."
          usage={`import { BulletinList } from "@/components/board/bulletin-list"

<BulletinList
  items={posts}
  empty="게시글이 없습니다."
  paged={pagedResult}
  pathname="/b/notice"
  searchQuery={query}
  variant="board" // 또는 "teaser" (간략 모드)
/>`}
          props={[
            { name: "items", type: "PostListRow[]", desc: "게시글 목록" },
            { name: "empty", type: "string", desc: "빈 목록 메시지" },
            { name: "paged", type: "PagedResult", desc: "페이지네이션 결과" },
            { name: "pathname", type: "string", desc: "페이지 경로" },
            { name: "variant", type: '"board" | "teaser"', desc: "표시 모드" },
          ]}
        />
        <ComponentCard
          name="PostList"
          path="components/board/post-list.tsx"
          description="카드형 게시글 목록입니다. 썸네일과 요약을 보여줍니다."
          usage={`import { PostList } from "@/components/board/post-list"

<PostList items={posts} emptyMessage="글이 없습니다." />`}
        />
        <ComponentCard
          name="ArticleReader"
          path="components/board/article-reader.tsx"
          description="게시글 본문 읽기 뷰입니다. 제목, 메타정보, 본문, 첨부파일을 표시합니다."
          usage={`import { ArticleReader } from "@/components/board/article-reader"

<ArticleReader
  title={post.title}
  author={post.author}
  createdAt={post.created_at}
  content={post.body}
  attachments={post.attachments}
/>`}
        />
        <ComponentCard
          name="WritePanel / ArticleEditPanel"
          path="components/board/write-panel.tsx"
          description="게시글 작성/수정 폼입니다. RichEditor와 파일 업로드를 포함합니다."
          usage={`import { WritePanel } from "@/components/board/write-panel"

<WritePanel
  boardId={boardId}
  returnPath="/b/notice"
  initialData={existingPost} // 수정 시
/>`}
        />
        <ComponentCard
          name="PostPager"
          path="components/board/post-pager.tsx"
          description="이전글/다음글 네비게이션입니다."
          usage={`import { PostPager } from "@/components/board/post-pager"

<PostPager prev={prevPost} next={nextPost} basePath="/b/notice" />`}
        />
      </FeatureSection>

      {/* Comments */}
      <FeatureSection
        id="comments"
        title="댓글 (Comments)"
        path="components/comments/"
        description="게시글, 프롬프트 등에 달리는 댓글 시스템 컴포넌트입니다."
      >
        <ComponentCard
          name="CommentSection"
          path="components/comments/comment-section.tsx"
          description="댓글 영역 전체를 감싸는 컴포넌트입니다. 댓글 목록과 작성 폼을 포함합니다."
          usage={`import { CommentSection } from "@/components/comments/comment-section"

<CommentSection
  targetType="post" // 또는 "prompt"
  targetId={postId}
  returnTo={currentPath}
  comments={commentTree}
  signedIn={isLoggedIn}
  viewerName={userName}
  canComment={hasPermission}
  commentRole={userRole}
/>`}
          props={[
            { name: "targetType", type: "CommentTargetType", desc: '"post" | "prompt"' },
            { name: "targetId", type: "string", desc: "댓글 대상 ID" },
            { name: "comments", type: "CommentNode[]", desc: "트리 구조 댓글" },
            { name: "canComment", type: "boolean", desc: "댓글 작성 권한" },
          ]}
        />
        <ComponentCard
          name="CommentForm"
          path="components/comments/comment-form.tsx"
          description="댓글 작성 폼입니다. 답글 모드도 지원합니다."
          usage={`import { CommentForm } from "@/components/comments/comment-form"

<CommentForm
  targetType="post"
  targetId={postId}
  parentId={parentCommentId} // 답글인 경우
  returnTo={currentPath}
  signedIn={isLoggedIn}
  defaultName={userName}
  compact // 답글용 작은 폼
/>`}
        />
        <ComponentCard
          name="ArticleComments"
          path="components/comments/article-comments.tsx"
          description="게시글 상세 페이지에서 댓글 섹션을 로드하는 래퍼입니다."
          usage={`import { ArticleComments } from "@/components/comments/article-comments"

// Server Component에서 사용
<Suspense fallback={<CommentSkeleton />}>
  <ArticleComments postId={postId} returnTo={path} />
</Suspense>`}
        />
      </FeatureSection>

      {/* Editor */}
      <FeatureSection
        id="editor"
        title="에디터 (Editor)"
        path="components/editor/"
        description="리치 텍스트 에디터와 콘텐츠 렌더러입니다."
      >
        <ComponentCard
          name="RichEditor"
          path="components/editor/rich-editor.tsx"
          description="CKEditor 5 기반 WYSIWYG 에디터입니다. 이미지 업로드, 서식, 링크 등을 지원합니다."
          usage={`import { RichEditor } from "@/components/editor/rich-editor"

<RichEditor
  name="body"
  defaultValue={initialContent}
  placeholder="내용을 입력하세요..."
/>`}
          props={[
            { name: "name", type: "string", desc: "폼 필드명" },
            { name: "defaultValue", type: "string", desc: "초기 HTML 콘텐츠" },
            { name: "placeholder", type: "string", desc: "플레이스홀더" },
          ]}
        />
        <ComponentCard
          name="RichContent"
          path="components/editor/rich-content.tsx"
          description="RichEditor로 작성된 HTML 콘텐츠를 안전하게 렌더링합니다."
          usage={`import { RichContent } from "@/components/editor/rich-content"

<RichContent
  content={htmlContent}
  className="prose prose-sm"
/>`}
        />
      </FeatureSection>

      {/* Steam */}
      <FeatureSection
        id="steam"
        title="스팀 (Steam)"
        path="components/steam/"
        description="스팀 게임 라이브러리, 리뷰 관련 컴포넌트입니다."
      >
        <ComponentCard
          name="GameCatalog"
          path="components/steam/game-catalog.tsx"
          description="스팀 게임 목록을 그리드로 표시합니다."
          usage={`import { GameCatalog } from "@/components/steam/game-catalog"

<GameCatalog games={steamGames} />`}
        />
        <ComponentCard
          name="SteamCover"
          path="components/steam/steam-cover.tsx"
          description="스팀 게임 커버 이미지 컴포넌트입니다."
          usage={`import { SteamCover } from "@/components/steam/steam-cover"

<SteamCover appId={gameAppId} name={gameName} />`}
        />
        <ComponentCard
          name="ReviewBadge"
          path="components/steam/review-badge.tsx"
          description="스팀 리뷰 점수 배지입니다."
          usage={`import { ReviewBadge } from "@/components/steam/review-badge"

<ReviewBadge score={85} total={1234} />`}
        />
        <ComponentCard
          name="ScreenshotGallery"
          path="components/steam/screenshot-gallery.tsx"
          description="스팀 게임 스크린샷 갤러리입니다."
          usage={`import { ScreenshotGallery } from "@/components/steam/screenshot-gallery"

<ScreenshotGallery screenshots={gameScreenshots} />`}
        />
        <ComponentCard
          name="TwoWeekBadge"
          path="components/steam/two-week-badge.tsx"
          description="최근 2주 플레이 시간 배지입니다."
          usage={`import { TwoWeekBadge } from "@/components/steam/two-week-badge"

<TwoWeekBadge minutes={120} />`}
        />
      </FeatureSection>

      {/* Landing */}
      <FeatureSection
        id="landing"
        title="랜딩 (Landing)"
        path="components/landing/"
        description="메인 페이지 랜딩 섹션 컴포넌트입니다."
      >
        <ComponentCard
          name="HeroSection"
          path="components/landing/hero-topology/"
          description="3D 토폴로지 애니메이션이 있는 히어로 섹션입니다. Three.js 기반입니다."
          usage={`import { HeroSection } from "@/components/landing/hero-topology/hero-section"

<HeroSection />`}
        />
        <ComponentCard
          name="StatsStrip"
          path="components/landing/stats-strip.tsx"
          description="통계 수치를 가로로 나열하는 스트립입니다."
          usage={`import { StatsStrip } from "@/components/landing/stats-strip"

<StatsStrip
  stats={[
    { label: "프로젝트", value: "120+" },
    { label: "리뷰", value: "50+" },
  ]}
/>`}
        />
        <ComponentCard
          name="LatestColumns"
          path="components/landing/latest-columns.tsx"
          description="최신 칼럼/글 목록 섹션입니다."
          usage={`import { LatestColumns } from "@/components/landing/latest-columns"

<LatestColumns posts={latestPosts} />`}
        />
        <ComponentCard
          name="FeaturedWork"
          path="components/landing/featured-work.tsx"
          description="주요 작업물 쇼케이스 섹션입니다."
          usage={`import { FeaturedWork } from "@/components/landing/featured-work"

<FeaturedWork items={featuredItems} />`}
        />
        <ComponentCard
          name="SkillShowcase"
          path="components/landing/skill-showcase.tsx"
          description="기술 스택 쇼케이스입니다."
          usage={`import { SkillShowcase } from "@/components/landing/skill-showcase"

<SkillShowcase skills={skillList} />`}
        />
        <ComponentCard
          name="ContactCTA"
          path="components/landing/contact-cta.tsx"
          description="연락하기 CTA 섹션입니다."
          usage={`import { ContactCTA } from "@/components/landing/contact-cta"

<ContactCTA />`}
        />
        <ComponentCard
          name="ScrollReveal"
          path="components/landing/scroll-reveal.tsx"
          description="스크롤 시 나타나는 애니메이션 래퍼입니다."
          usage={`import { ScrollReveal } from "@/components/landing/scroll-reveal"

<ScrollReveal>
  <SomeContent />
</ScrollReveal>`}
        />
        <ComponentCard
          name="ModuleMarquee"
          path="components/landing/module-marquee.tsx"
          description="무한 스크롤 마퀴 컴포넌트입니다."
          usage={`import { ModuleMarquee } from "@/components/landing/module-marquee"

<ModuleMarquee items={techLogos} speed="slow" />`}
        />
      </FeatureSection>

      {/* Prompts */}
      <FeatureSection
        id="prompts"
        title="프롬프트 (Prompts)"
        path="components/prompts/"
        description="AI 프롬프트 관련 컴포넌트입니다."
      >
        <ComponentCard
          name="PromptBodyToggle"
          path="components/prompts/prompt-body-toggle.tsx"
          description="프롬프트 본문 펼치기/접기 토글입니다."
          usage={`import { PromptBodyToggle } from "@/components/prompts/prompt-body-toggle"

<PromptBodyToggle body={promptBody} />`}
        />
        <ComponentCard
          name="ResultPreview"
          path="components/prompts/result-preview.tsx"
          description="프롬프트 실행 결과 미리보기입니다."
          usage={`import { ResultPreview } from "@/components/prompts/result-preview"

<ResultPreview result={generatedResult} />`}
        />
      </FeatureSection>

      {/* i18n */}
      <FeatureSection
        id="i18n"
        title="다국어 (i18n)"
        path="components/i18n/"
        description="다국어 지원 관련 컴포넌트입니다."
      >
        <ComponentCard
          name="I18nProvider"
          path="components/i18n/i18n-provider.tsx"
          description="클라이언트 컴포넌트용 다국어 컨텍스트 프로바이더입니다."
          usage={`import { I18nProvider, useI18n } from "@/components/i18n/i18n-provider"

// 레이아웃에서 래핑
<I18nProvider locale={locale} dictionary={dict}>
  {children}
</I18nProvider>

// 클라이언트 컴포넌트에서 사용
const { t, locale } = useI18n()
<p>{t("common.hello")}</p>`}
        />
        <ComponentCard
          name="LanguageSwitcher"
          path="components/i18n/language-switcher.tsx"
          description="언어 전환 드롭다운입니다."
          usage={`import { LanguageSwitcher } from "@/components/i18n/language-switcher"

<LanguageSwitcher />`}
        />
      </FeatureSection>

      {/* Upload */}
      <FeatureSection
        id="upload"
        title="업로드 (Upload)"
        path="components/upload/"
        description="파일 업로드 관련 컴포넌트입니다."
      >
        <ComponentCard
          name="UppyFileUpload"
          path="components/upload/uppy-file-upload.tsx"
          description="Uppy 기반 파일 업로드 컴포넌트입니다. 드래그 앤 드롭, 프로그레스 표시를 지원합니다."
          usage={`import { UppyFileUpload } from "@/components/upload/uppy-file-upload"

<UppyFileUpload
  bucket="attachments"
  folder="posts"
  onUploadComplete={(files) => {
    console.log("Uploaded:", files)
  }}
  maxFiles={5}
  allowedTypes={["image/*", "application/pdf"]}
/>`}
          props={[
            { name: "bucket", type: "string", desc: "Supabase 스토리지 버킷" },
            { name: "folder", type: "string", desc: "저장 폴더 경로" },
            { name: "onUploadComplete", type: "function", desc: "업로드 완료 콜백" },
            { name: "maxFiles", type: "number", desc: "최대 파일 수" },
            { name: "allowedTypes", type: "string[]", desc: "허용 파일 타입" },
          ]}
        />
      </FeatureSection>

      {/* Errors */}
      <FeatureSection
        id="errors"
        title="에러 (Errors)"
        path="components/errors/"
        description="에러 페이지 컴포넌트입니다."
      >
        <ComponentCard
          name="HttpErrorPage"
          path="components/errors/http-error-page.tsx"
          description="HTTP 에러 코드별 에러 페이지입니다."
          usage={`import { HttpErrorPage } from "@/components/errors/http-error-page"

<HttpErrorPage code={404} />
<HttpErrorPage code={500} />`}
        />
        <ComponentCard
          name="AccessDeniedPage"
          path="components/errors/access-denied-page.tsx"
          description="접근 거부 페이지입니다."
          usage={`import { AccessDeniedPage } from "@/components/errors/access-denied-page"

<AccessDeniedPage reason="관리자 권한이 필요합니다." />`}
        />
      </FeatureSection>

      {/* OSS */}
      <FeatureSection
        id="oss"
        title="오픈소스 (OSS)"
        path="components/oss/"
        description="오픈소스 라이선스 관련 컴포넌트입니다."
      >
        <ComponentCard
          name="LicenseTable"
          path="components/oss/license-table.tsx"
          description="오픈소스 라이선스 목록 테이블입니다."
          usage={`import { LicenseTable } from "@/components/oss/license-table"

<LicenseTable licenses={packageLicenses} />`}
        />
        <ComponentCard
          name="BackButton"
          path="components/oss/back-button.tsx"
          description="뒤로가기 버튼입니다."
          usage={`import { BackButton } from "@/components/oss/back-button"

<BackButton />`}
        />
      </FeatureSection>

      {/* Page Structure Patterns */}
      <FeatureSection
        id="patterns"
        title="페이지 구조 패턴"
        path=""
        description="DevDeck에서 사용하는 일반적인 페이지 구조 패턴입니다."
      >
        <div className="space-y-6">
          <div>
            <h4 className="mb-2 font-semibold">목록 페이지 패턴</h4>
            <CodeBlock>{`// app/(dashboard)/[feature]/page.tsx
import { Suspense } from "react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"

export default function ListPage({ searchParams }) {
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageTitleBanner title="목록" />
      
      {/* 검색 폼 */}
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} />
        <Button type="submit">검색</Button>
      </form>

      {/* 목록 (Suspense로 로딩 처리) */}
      <Suspense fallback={<ListSkeleton />}>
        <ItemList page={page} q={q} />
      </Suspense>
    </div>
  )
}

async function ItemList({ page, q }) {
  const result = await fetchItems({ page, q })
  return (
    <>
      <BulletinList items={result.rows} paged={result} />
      <ListPager pathname="/items" result={result} />
    </>
  )
}`}</CodeBlock>
          </div>

          <div>
            <h4 className="mb-2 font-semibold">상세 페이지 패턴</h4>
            <CodeBlock>{`// app/(dashboard)/[feature]/[id]/page.tsx
import { notFound } from "next/navigation"
import { PageTitleBanner } from "@/components/layout/page-title-banner"

export default async function DetailPage({ params }) {
  const item = await fetchItem(params.id)
  if (!item) notFound()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageTitleBanner
        title={item.title}
        breadcrumb={[
          { label: "목록", href: "/items" },
          { label: item.title },
        ]}
      />

      <article>
        <RichContent content={item.body} />
      </article>

      <Suspense fallback={<CommentSkeleton />}>
        <ArticleComments itemId={item.id} />
      </Suspense>
    </div>
  )
}`}</CodeBlock>
          </div>

          <div>
            <h4 className="mb-2 font-semibold">폼 페이지 패턴</h4>
            <CodeBlock>{`// Server Action 기반 폼
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createItem(formData: FormData) {
  const title = formData.get("title") as string
  const body = formData.get("body") as string

  await db.items.create({ title, body })
  
  revalidatePath("/items")
  redirect("/items")
}

// 폼 컴포넌트
<form action={createItem} className="space-y-4">
  <div>
    <Label htmlFor="title">제목</Label>
    <Input id="title" name="title" required />
  </div>
  <div>
    <Label htmlFor="body">내용</Label>
    <RichEditor name="body" />
  </div>
  <Button type="submit">저장</Button>
</form>`}</CodeBlock>
          </div>
        </div>
      </FeatureSection>

      {/* Navigation */}
      <nav className="flex justify-center pt-8">
        <Button asChild size="lg" className="rounded-full">
          <Link href="/site/design-system/common">
            <ArrowLeft className="mr-1" />
            공통영역 컴포넌트 보기
          </Link>
        </Button>
      </nav>
    </div>
  )
}

function FeatureSection({
  id,
  title,
  path,
  description,
  children,
}: {
  id: string
  title: string
  path: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-6">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          {path && <code className="text-xs text-muted-foreground">{path}</code>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function ComponentCard({
  name,
  path,
  description,
  usage,
  props,
}: {
  name: string
  path: string
  description: string
  usage: string
  props?: { name: string; type: string; desc: string }[]
}) {
  return (
    <div className="rounded-xl border bg-white p-5 dark:bg-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-semibold">{name}</h3>
        <code className="text-xs text-muted-foreground">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      
      {props && props.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Props</h4>
          <div className="space-y-1">
            {props.map((prop) => (
              <div key={prop.name} className="flex items-baseline gap-2 text-xs">
                <code className="font-semibold text-foreground">{prop.name}</code>
                <code className="text-muted-foreground">{prop.type}</code>
                <span className="text-muted-foreground">— {prop.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <CodeBlock>{usage}</CodeBlock>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg bg-muted/50 p-4 text-xs">
      <code className="font-mono">{children}</code>
    </pre>
  )
}
