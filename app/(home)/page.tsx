import { Suspense } from "react"
import Link from "next/link"
import { FeaturedWorkCard } from "@/components/landing/featured-work"
import { HeroVisual } from "@/components/landing/hero-visual"
import { ContactCta } from "@/components/landing/contact-cta"
import { LatestColumns } from "@/components/landing/latest-columns"
import { ModuleMarquee } from "@/components/landing/module-marquee"
import { SkillShowcase } from "@/components/landing/skill-showcase"
import { StatsStrip } from "@/components/landing/stats-strip"
import { SteamSection } from "@/components/landing/steam-section"
import { UmpcActivity } from "@/components/landing/umpc-activity"
import { HomeLandingSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { currentViewer } from "@/lib/boards/access"
import { getHomeLandingData } from "@/lib/landing/home"

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 size-[32rem] rounded-full bg-[radial-gradient(circle,hsl(var(--lux-sand)/0.9),transparent_64%)] blur-2xl" />
          <div className="absolute -right-16 top-0 size-[28rem] rounded-full bg-[radial-gradient(circle,hsl(var(--lux-champagne)/0.28),transparent_64%)] blur-2xl" />
          <div className="absolute bottom-0 left-1/3 size-[22rem] rounded-full bg-[radial-gradient(circle,hsl(var(--lux-cognac)/0.16),transparent_64%)] blur-2xl" />
        </div>
        <HeroVisual />
        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-44 pt-20 md:pb-28 md:pt-28">
          <p className="text-sm font-semibold text-muted-foreground">Personal Developer Hub</p>
          <h1 className="mt-4 max-w-2xl bg-gradient-to-br from-foreground via-foreground to-foreground/55 bg-clip-text font-display text-5xl font-extrabold leading-tight text-transparent md:text-6xl">
            프롬프트, 커리어, 게임을 한 덱에서.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            AI 바이브 코딩 템플릿, 회사 참여 이력, Steam 라이브러리를 공개 포트폴리오로 보여 줍니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/work">커리어 보기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/#prompts">프롬프트 보기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/games">게임 보기</Link>
            </Button>
            <Suspense>
              <HeroLoginLink />
            </Suspense>
          </div>
        </div>
      </section>

      <Suspense fallback={<HomeLandingSkeleton />}>
        <HomeLanding />
      </Suspense>
    </main>
  )
}

async function HomeLanding() {
  const data = await getHomeLandingData()
  const featuredHref = data.featured?.href
  const prompts = takeLatest(data.prompts, featuredHref, (item) => `/p/${item.id}`)
  const posts = takeLatest(data.posts, featuredHref, (item) => `/work/${item.id}`)

  return (
    <>
      <StatsStrip {...data.stats} />
      <ModuleMarquee />
      <FeaturedWorkCard work={data.featured} />
      <LatestColumns prompts={prompts} posts={posts} />
      <UmpcActivity umpc={data.umpc} activity={data.activity} />
      <SteamSection
        rankedGames={data.steam.rankedGames}
        recentGames={data.steam.recentGames}
        totalMinutes={data.steam.totalMinutes}
        twoWeekMinutes={data.steam.twoWeekMinutes}
        reviews={data.steam.latestReviews}
        profile={data.steam.profile}
      />
      <SkillShowcase skills={data.skills} />
      <ContactCta />
    </>
  )
}

function takeLatest<T>(items: T[], featuredHref: string | undefined, hrefOf: (item: T) => string) {
  const rest = featuredHref ? items.filter((item) => hrefOf(item) !== featuredHref) : items
  return (rest.length > 0 ? rest : items).slice(0, 4)
}

async function HeroLoginLink() {
  const viewer = await currentViewer()
  if (viewer.user) return null
  return (
    <Button asChild variant="ghost">
      <Link href="/login">로그인</Link>
    </Button>
  )
}
