import type { ReactNode } from "react"
import { Upload } from "lucide-react"
import { AccessDeniedPage } from "@/components/errors/access-denied-page"
import { HttpErrorPage } from "@/components/errors/http-error-page"
import { BulletinList } from "@/components/board/bulletin-list"
import { PostList } from "@/components/board/post-list"
import { PostPager } from "@/components/board/post-pager"
import type { PostListRow } from "@/components/board/types"
import { WriteForm, WritePanel, WriteToggle } from "@/components/board/write-panel"
import { CommentForm } from "@/components/comments/comment-form"
import { CommentSection } from "@/components/comments/comment-section"
import { RichContent } from "@/components/editor/rich-content"
import { RichEditor } from "@/components/editor/rich-editor"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { ContactCta } from "@/components/landing/contact-cta"
import { FeaturedWorkCard } from "@/components/landing/featured-work"
import { LatestColumns } from "@/components/landing/latest-columns"
import { ModuleMarquee } from "@/components/landing/module-marquee"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { SkillShowcase } from "@/components/landing/skill-showcase"
import { StatsStrip } from "@/components/landing/stats-strip"
import { OssBackButton } from "@/components/oss/back-button"
import { OssLicenseTable } from "@/components/oss/license-table"
import { PromptBodyToggle } from "@/components/prompts/prompt-body-toggle"
import { ResultPreview } from "@/components/prompts/result-preview"
import { GameCatalog } from "@/components/steam/game-catalog"
import { WrittenReviewBadge } from "@/components/steam/review-badge"
import { ScreenshotGallery } from "@/components/steam/screenshot-gallery"
import { SteamCover } from "@/components/steam/steam-cover"
import { TwoWeekBadge } from "@/components/steam/two-week-badge"
import { I18nDemo } from "./i18n-demo"
import type { CareerPost, CareerSkill } from "@/types/career"
import type { CommentNode } from "@/types/comment"
import type { Prompt } from "@/types/prompt"

const NOW = "2026-09-19T09:30:00+09:00"
const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps"
const HEADER = `${STEAM_CDN}/730/header.jpg`

const POSTS: PostListRow[] = [
  { href: "#", title: "9월 업데이트 안내", createdAt: NOW, author: "관리자", meta: "공지" },
  { href: "#", title: "게시판 이용 규칙", createdAt: "2026-09-12T10:00:00+09:00", author: "관리자", meta: "공지" },
  { href: "#", title: "Steam 리뷰 Top 10 시상식 오픈", createdAt: "2026-09-05T18:20:00+09:00", author: "관리자", meta: "소식" },
]

const PROMPTS = [
  { id: "1", title: "코드 리뷰 도우미", category: "개발", created_at: NOW },
  { id: "2", title: "회의록 요약 프롬프트", category: "업무", created_at: "2026-09-10T10:00:00+09:00" },
] as Prompt[]

const CAREER_POSTS = [
  { id: "1", title: "DevDeck 개인 허브 구축", post_type: "project", created_at: NOW },
  { id: "2", title: "Next.js 캐싱 정리", post_type: "note", created_at: "2026-09-08T10:00:00+09:00" },
] as CareerPost[]

const SKILLS = [
  { id: "1", name: "TypeScript", proficiency: "상", years: 5, summary: "타입 설계와 리팩터링" },
  { id: "2", name: "Next.js", proficiency: "상", years: 4, summary: "App Router, 서버 컴포넌트" },
  { id: "3", name: "Supabase", proficiency: "중", years: 2, summary: "Auth, RLS, Storage" },
  { id: "4", name: "PostgreSQL", proficiency: "중", years: 3, summary: null },
] as CareerSkill[]

const COMMENTS = [
  {
    id: "c1",
    target_type: "board",
    target_id: "sample",
    parent_id: null,
    user_id: null,
    author_name: "방문자",
    body: "<p>좋은 글 잘 읽었습니다.</p>",
    ip_address: "203.0.113.24",
    ip_region: "서울",
    is_hidden: false,
    created_at: NOW,
    updated_at: NOW,
    children: [
      {
        id: "c2",
        target_type: "board",
        target_id: "sample",
        parent_id: "c1",
        user_id: null,
        author_name: "관리자",
        body: "<p>감사합니다!</p>",
        ip_address: "198.51.100.7",
        ip_region: null,
        is_hidden: false,
        created_at: NOW,
        updated_at: NOW,
        children: [],
      },
    ],
  },
] as CommentNode[]

const GAME = {
  app_id: 730,
  name: "Counter-Strike 2",
  playtime_forever_minutes: 12480,
  playtime_2weeks_minutes: 320,
  playtime_windows_minutes: 9000,
  playtime_mac_minutes: 3480,
  playtime_linux_minutes: 0,
  playtime_deck_minutes: 0,
  last_played_at: "2026-09-17T21:00:00+09:00",
  has_community_visible_stats: true,
  img_icon_url: null,
  header_image_url: HEADER,
}

const CATALOG = {
  app_id: 730,
  name: "Counter-Strike 2",
  short_description: "지난 20년간 수백만 명의 플레이어에게 사랑받은 경쟁 FPS입니다.",
  developers: ["Valve"],
  publishers: ["Valve"],
  genres: ["액션", "FPS"],
  release_date: "2012-08-21",
  coming_soon: false,
  metacritic: 83,
  platforms: { windows: true, mac: false, linux: true },
  deck_compat: "unsupported",
  screenshots: [],
  header_image: HEADER,
  store_url: "https://store.steampowered.com/app/730",
  recommendations: 1234567,
  achievement_total: 167,
} satisfies React.ComponentProps<typeof GameCatalog>["catalog"]

const ARTICLE_HTML = `<h3>예시 본문</h3><p>RichContent는 저장된 HTML(또는 마크다운)을 정리(sanitize)해서 보여 줍니다.</p><ul><li>목록</li><li><strong>굵게</strong>, <em>기울임</em></li></ul>`

function Frame({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
        미리보기{note ? <span className="ml-2 font-normal">· {note}</span> : null}
      </h4>
      <div className="min-w-0 overflow-x-auto rounded-lg border bg-background p-4">{children}</div>
    </div>
  )
}

/** 화면 폭이 좁아도 카드 안에서 무너지지 않도록 랜딩 섹션의 바깥 여백을 걷어 낸다. */
function Flush({ children }: { children: ReactNode }) {
  return <div className="-mx-5 -my-8 [&_section]:!px-5">{children}</div>
}

export const PREVIEWS: Record<string, ReactNode> = {
  BulletinList: (
    <Frame>
      <BulletinList items={POSTS} empty="게시글이 없습니다." authorFallback="관리자" />
    </Frame>
  ),
  PostList: (
    <Frame>
      <PostList items={POSTS} empty="글이 없습니다." />
    </Frame>
  ),
  ArticleReader: (
    <Frame note="우하단 글자 크기 조절 독은 실제 화면에서만 붙습니다">
      <article className="article-reader space-y-3 text-sm leading-relaxed">
        <h3 className="font-display text-xl font-bold">9월 업데이트 안내</h3>
        <p className="text-xs text-muted-foreground">관리자 · 2026.09.19 09:30</p>
        <p>본문이 이 영역에 표시됩니다. 글자 크기는 독에서 조절하고 브라우저에 기억됩니다.</p>
      </article>
    </Frame>
  ),
  "WritePanel / ArticleEditPanel": (
    <Frame note="버튼을 눌러 열고 닫아 보세요">
      <WritePanel label="글쓰기" closeLabel="닫기">
        <WriteToggle />
        <WriteForm>
          <p className="text-sm text-muted-foreground">여기에 작성 폼(제목, 에디터 등)이 들어갑니다.</p>
        </WriteForm>
      </WritePanel>
    </Frame>
  ),
  PostPager: (
    <Frame>
      <PostPager
        listHref="#"
        prev={{ href: "#", title: "이전 글 제목" }}
        next={null}
        placement="bottom"
        className="!mt-0"
      />
    </Frame>
  ),

  CommentSection: (
    <Frame note="비로그인 상태 표시 예시">
      <div className="-mt-12">
        <CommentSection
          targetType="board"
          targetId="sample"
          returnTo="#"
          comments={COMMENTS}
          signedIn={false}
          viewerName=""
          canComment={false}
          commentRole="visitor"
        />
      </div>
    </Frame>
  ),
  CommentForm: (
    <Frame note="입력만 가능하고 전송은 막아 둔 예시">
      <fieldset disabled className="min-w-0 border-0 p-0">
        <CommentForm
          targetType="board"
          targetId="sample"
          returnTo="#"
          signedIn={false}
          defaultName=""
        />
      </fieldset>
    </Frame>
  ),
  ArticleComments: (
    <Frame note="서버에서 댓글을 조회해 CommentSection을 렌더링합니다">
      <p className="text-sm text-muted-foreground">
        화면은 위 <b className="text-foreground">CommentSection</b>과 동일합니다. DB 조회는 서버에서 처리되므로 이 페이지에서는
        실제 데이터를 붙이지 않습니다.
      </p>
    </Frame>
  ),

  RichEditor: (
    <Frame note="CKEditor 기반, 폼에서는 hidden input으로 값이 전달됩니다">
      <RichEditor name="content" defaultValue="<p>내용을 입력해 보세요.</p>" />
    </Frame>
  ),
  RichContent: (
    <Frame>
      <RichContent content={ARTICLE_HTML} className="space-y-2 text-sm" />
    </Frame>
  ),

  GameCatalog: (
    <Frame>
      <GameCatalog
        appId={730}
        title="Counter-Strike 2"
        game={GAME}
        catalog={CATALOG}
        achievements={{ unlocked: 42, total: 167 }}
      />
    </Frame>
  ),
  SteamCover: (
    <Frame>
      <div className="relative aspect-[460/215] w-full max-w-sm overflow-hidden rounded-xl bg-muted">
        <SteamCover src={HEADER} appId={730} alt="Counter-Strike 2" className="size-full" />
      </div>
    </Frame>
  ),
  ReviewBadge: (
    <Frame note="WrittenReviewBadge · 카드 우하단에 겹쳐 표시">
      <div className="relative aspect-[460/215] w-full max-w-sm overflow-hidden rounded-xl bg-muted">
        <SteamCover src={HEADER} appId={730} alt="" className="size-full" />
        <WrittenReviewBadge />
      </div>
    </Frame>
  ),
  ScreenshotGallery: (
    <Frame note="썸네일을 눌러 확대, ←/→/Esc 지원">
      <ScreenshotGallery
        title="Counter-Strike 2"
        items={[730, 570, 440].map((id) => ({
          thumbnail: `${STEAM_CDN}/${id}/header.jpg`,
          full: `${STEAM_CDN}/${id}/header.jpg`,
        }))}
      />
    </Frame>
  ),
  TwoWeekBadge: (
    <Frame note="카드 우상단에 겹쳐 표시">
      <div className="relative aspect-[460/215] w-full max-w-sm overflow-hidden rounded-xl bg-muted">
        <SteamCover src={HEADER} appId={730} alt="" className="size-full" />
        <TwoWeekBadge minutes={320} />
      </div>
    </Frame>
  ),

  HeroSection: (
    <Frame note="Three.js 3D 씬은 성능상 이 페이지에서 렌더링하지 않고 모형으로 대체">
      <div className="flex aspect-[16/7] items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--lux-champagne)/0.3)] to-[hsl(var(--lux-cognac)/0.25)] text-center">
        <div>
          <p className="font-display text-2xl font-extrabold">DevDeck</p>
          <p className="mt-1 text-sm text-muted-foreground">퍼스널 개발자 허브 · 3D 토폴로지 슬라이드</p>
        </div>
      </div>
    </Frame>
  ),
  StatsStrip: (
    <Frame>
      <Flush>
        <StatsStrip promptCount={24} careerCount={12} gameCount={86} playtimeMinutes={51240} reviewCount={9} />
      </Flush>
    </Frame>
  ),
  LatestColumns: (
    <Frame>
      <Flush>
        <LatestColumns prompts={PROMPTS} posts={CAREER_POSTS} />
      </Flush>
    </Frame>
  ),
  FeaturedWork: (
    <Frame>
      <Flush>
        <FeaturedWorkCard
          work={{
            kind: "career",
            href: "#",
            title: "DevDeck 개인 허브",
            excerpt: "프롬프트, 커리어, Steam 기록을 한곳에 모은 포트폴리오 허브입니다.",
            badge: "프로젝트",
            meta: "Next.js · Supabase",
          }}
        />
      </Flush>
    </Frame>
  ),
  SkillShowcase: (
    <Frame>
      <Flush>
        <SkillShowcase skills={SKILLS} />
      </Flush>
    </Frame>
  ),
  ContactCTA: (
    <Frame>
      <Flush>
        <ContactCta />
      </Flush>
    </Frame>
  ),
  ScrollReveal: (
    <Frame note="화면에 들어오면 떠오르며 나타납니다">
      <div className="grid gap-3 sm:grid-cols-3">
        {(["up", "scale", "fade"] as const).map((variant, i) => (
          <ScrollReveal key={variant} variant={variant} delay={i * 120}>
            <div className="rounded-xl border bg-card p-4 text-sm font-semibold">variant=&quot;{variant}&quot;</div>
          </ScrollReveal>
        ))}
      </div>
    </Frame>
  ),
  ModuleMarquee: (
    <Frame note="데스크톱은 가로 마키, 모바일은 세로 카드">
      <Flush>
        <ModuleMarquee
          modules={[
            { id: "prompt", label: "PromptKit", href: "#", guideDescription: "프롬프트를 모아 두는 서재입니다." },
            { id: "career", label: "CareerLog", href: "#", guideDescription: "경력과 프로젝트 기록입니다." },
            { id: "steam", label: "Steam Tracker", href: "#", guideDescription: "플레이 기록과 리뷰입니다." },
            { id: "board", label: "게시판", href: "#", guideDescription: "공지와 소식을 전합니다." },
          ]}
        />
      </Flush>
    </Frame>
  ),

  PromptBodyToggle: (
    <Frame>
      <PromptBodyToggle content={ARTICLE_HTML} />
    </Frame>
  ),
  ResultPreview: (
    <Frame note="임베드가 없으면 HTML 본문을 그대로 보여 줍니다">
      <ResultPreview html={ARTICLE_HTML} embed={null} />
    </Frame>
  ),

  I18nProvider: (
    <Frame note="useI18n() 결과를 실시간으로 보여 줍니다">
      <I18nDemo />
    </Frame>
  ),
  LanguageSwitcher: (
    <Frame note="선택하면 실제로 언어가 바뀝니다">
      <div className="flex flex-wrap items-center gap-4">
        <LanguageSwitcher />
        <LanguageSwitcher compact />
      </div>
    </Frame>
  ),

  UppyFileUpload: (
    <Frame note="Uppy 대시보드는 로그인 세션이 있어야 뜨고 실제 업로드가 일어나므로 모형으로 대체">
      <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 text-center">
        <Upload className="size-8 text-muted-foreground" />
        <p className="text-sm font-semibold">파일을 여기로 끌어다 놓거나 클릭해서 선택하세요</p>
        <p className="text-xs text-muted-foreground">최대 용량·개수 제한은 props로 지정합니다.</p>
      </div>
    </Frame>
  ),

  HttpErrorPage: (
    <Frame note="status=404">
      <div className="[&>*]:!min-h-0 [&>*]:!py-4">
        <HttpErrorPage status={404} />
      </div>
    </Frame>
  ),
  AccessDeniedPage: (
    <Frame note="role=visitor">
      <div className="[&>*]:!min-h-0 [&>*]:!py-4">
        <AccessDeniedPage role="visitor" />
      </div>
    </Frame>
  ),

  LicenseTable: (
    <Frame>
      <OssLicenseTable
        title="Frontend"
        labels={{ package: "패키지", version: "버전", license: "라이선스" }}
        packages={[
          { name: "next", version: "14.2.5", license: "MIT" },
          { name: "react", version: "18.3.1", license: "MIT" },
          { name: "recharts", version: "2.12.7", license: "MIT" },
        ]}
      />
    </Frame>
  ),
  BackButton: (
    <Frame>
      <OssBackButton label="돌아가기" />
    </Frame>
  ),
}
