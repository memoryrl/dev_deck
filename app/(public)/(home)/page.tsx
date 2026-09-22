import { Suspense } from "react"
import Link from "next/link"
import { FeaturedWorkCard } from "@/components/landing/featured-work"
import { HeroSceneProvider } from "@/components/landing/hero-scene-context"
import { HeroVisual } from "@/components/landing/hero-visual"
import { HeroWallpaper } from "@/components/landing/hero-wallpaper"
import { HeroSection } from "@/components/landing/hero-topology/hero-section"
import { CommunityLatest } from "@/components/landing/community-latest"
import { ContactCta } from "@/components/landing/contact-cta"
import { LatestColumns } from "@/components/landing/latest-columns"
import { ModuleMarquee } from "@/components/landing/module-marquee"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { SkillShowcase } from "@/components/landing/skill-showcase"
import { StatsStrip } from "@/components/landing/stats-strip"
import { SteamSection } from "@/components/landing/steam-section"
import { UmpcActivity } from "@/components/landing/umpc-activity"
import { HomeLandingSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { currentViewer } from "@/lib/boards/access"
import { getHomeLandingData } from "@/lib/landing/home"
import { getT } from "@/lib/i18n/dictionary"
import { pickHeroSceneIndex } from "@/lib/landing/hero-themes"
import { buildLandingTopology, listLandingModules } from "@/lib/landing/topology"

export default function HomePage() {
  // 폴백·본 히어로가 같은 시작 테마를 쓰도록 요청당 한 번만 고른다.
  const sceneIndex = pickHeroSceneIndex()
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
      <section className="relative">
        {/* 데이터가 필요한 스위치+토폴로지는 별도 Suspense로 감싸 히어로 카피는
            즉시 페인트되게 한다. 폴백은 실제 클래식 히어로와 동일한 마크업이라
            데이터가 늦게 와도 레이아웃이 튀지 않는다 (08-landing-topology.md 5절). */}
        <Suspense fallback={<ClassicHeroFallback sceneIndex={sceneIndex} />}>
          <HeroSectionResolved sceneIndex={sceneIndex} />
        </Suspense>
      </section>

      <Suspense fallback={<HomeLandingSkeleton />}>
        <HomeLanding />
      </Suspense>
    </main>
  )
}

async function HeroSectionResolved({ sceneIndex }: { sceneIndex: number }) {
  const topology = await buildLandingTopology()
  return (
    <HeroSceneProvider initialIndex={sceneIndex}>
      <HeroSection topology={topology} background={<HeroWallpaper />}>
        <ClassicHeroCopy />
      </HeroSection>
    </HeroSceneProvider>
  )
}

function ClassicHeroFallback({ sceneIndex }: { sceneIndex: number }) {
  return (
    <HeroSceneProvider initialIndex={sceneIndex}>
      <div className="relative overflow-x-clip">
        <HeroWallpaper />
        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-44 pt-20 md:pb-28 md:pt-28">
          <ClassicHeroCopy />
        </div>
        <HeroVisual />
      </div>
    </HeroSceneProvider>
  )
}

async function ClassicHeroCopy() {
  const { t } = await getT()
  return (
    <>
      <p className="text-sm font-semibold text-muted-foreground">{t("landing.kicker")}</p>
      <h1 className="mt-4 max-w-2xl bg-gradient-to-br from-foreground via-foreground to-foreground/55 bg-clip-text font-display text-5xl font-extrabold leading-tight text-transparent md:text-6xl">
        {t("landing.headline")}
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t("landing.lede")}</p>
      <div className="mt-8 flex flex-wrap items-center gap-3 group-[.is-topology]:hidden">
        <Button asChild>
          <Link href="/work">{t("landing.viewCareer")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/#prompts">{t("landing.viewPrompts")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/games">{t("landing.viewGames")}</Link>
        </Button>
        <Suspense>
          <HeroLoginLink />
        </Suspense>
      </div>
    </>
  )
}

async function HomeLanding() {
  const [data, modules] = await Promise.all([getHomeLandingData(), listLandingModules()])
  const featuredHref = data.featured?.href
  const prompts = takeLatest(data.prompts, featuredHref, (item) => `/p/${item.id}`)
  const posts = takeLatest(data.posts, featuredHref, (item) => `/work/${item.id}`)

  return (
    <>
      <ScrollReveal variant="up" duration={600}>
        <StatsStrip {...data.stats} />
      </ScrollReveal>
      <ScrollReveal variant="fade">
        <ModuleMarquee modules={modules} />
      </ScrollReveal>
      <ScrollReveal variant="scale">
        <FeaturedWorkCard work={data.featured} />
      </ScrollReveal>
      <ScrollReveal variant="up">
        <CommunityLatest posts={data.communityPosts} />
      </ScrollReveal>
      <ScrollReveal variant="up">
        <LatestColumns prompts={prompts} posts={posts} />
      </ScrollReveal>
      <ScrollReveal variant="up">
        <UmpcActivity umpc={data.umpc} activity={data.activity} />
      </ScrollReveal>
      <ScrollReveal variant="scale">
        <SteamSection
          rankedGames={data.steam.rankedGames}
          recentGames={data.steam.recentGames}
          totalMinutes={data.steam.totalMinutes}
          twoWeekMinutes={data.steam.twoWeekMinutes}
          reviews={data.steam.latestReviews}
          profile={data.steam.profile}
        />
      </ScrollReveal>
      <ScrollReveal variant="up">
        <SkillShowcase skills={data.skills} />
      </ScrollReveal>
      <ScrollReveal variant="scale">
        <ContactCta />
      </ScrollReveal>
    </>
  )
}

function takeLatest<T>(items: T[], featuredHref: string | undefined, hrefOf: (item: T) => string) {
  const rest = featuredHref ? items.filter((item) => hrefOf(item) !== featuredHref) : items
  return (rest.length > 0 ? rest : items).slice(0, 4)
}

async function HeroLoginLink() {
  const viewer = await currentViewer()
  const { t } = await getT()
  if (viewer.user) return null
  return (
    <Button asChild variant="ghost">
      <Link href="/login">{t("common.login")}</Link>
    </Button>
  )
}
