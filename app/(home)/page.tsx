import { Suspense } from "react"
import Link from "next/link"
import { HeroVisual } from "@/components/landing/hero-visual"
import { ModuleMarquee } from "@/components/landing/module-marquee"
import { LatestColumns } from "@/components/landing/latest-columns"
import { SteamSection } from "@/components/landing/steam-section"
import { LatestColumnsSkeleton, SteamShowcaseSkeleton } from "@/components/layout/skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { listPublicCareerSkills, listRecentPublicCareerPosts } from "@/lib/career/public"
import { listRecentPublicPrompts } from "@/lib/prompts/public"
import { fetchOwnedGames } from "@/lib/steam/client"
import { listPublicGameReviews } from "@/lib/steam/reviews"

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
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button>로그인</Button>
            </Link>
            <Link href="/work">
              <Button variant="outline">커리어 보기</Button>
            </Link>
            <Link href="/games">
              <Button variant="outline">게임 보기</Button>
            </Link>
          </div>
        </div>
      </section>

      <ModuleMarquee />

      <Suspense fallback={<LatestColumnsSkeleton />}>
        <HomeLatest />
      </Suspense>
      <Suspense fallback={<SteamShowcaseSkeleton />}>
        <HomeSteam />
      </Suspense>
      <Suspense fallback={<HomeSkillsSkeleton />}>
        <HomeSkills />
      </Suspense>
    </main>
  )
}

async function HomeLatest() {
  const [prompts, posts] = await Promise.all([
    listRecentPublicPrompts(4),
    listRecentPublicCareerPosts(4),
  ])
  return <LatestColumns prompts={prompts} posts={posts} />
}

async function HomeSteam() {
  const reviews = await listPublicGameReviews()
  const reviewsWithText = reviews.filter((review) => review.review_text?.trim())
  const latestReviews = [...(reviewsWithText.length > 0 ? reviewsWithText : reviews)]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 6)

  try {
    const steam = await fetchOwnedGames()
    const toFeatured = (game: (typeof steam.games)[number]) => ({
      app_id: game.app_id,
      name: game.name,
      playtime_forever_minutes: game.playtime_forever_minutes,
      playtime_2weeks_minutes: game.playtime_2weeks_minutes,
      playtime_deck_minutes: game.playtime_deck_minutes,
      last_played_at: game.last_played_at,
      header_image_url: game.header_image_url,
    })
    const rankedGames = [...steam.games]
      .sort((a, b) => b.playtime_forever_minutes - a.playtime_forever_minutes)
      .slice(0, 5)
      .map(toFeatured)
    const recentGames = [...steam.games]
      .filter((game) => game.last_played_at)
      .sort((a, b) => Date.parse(b.last_played_at ?? "0") - Date.parse(a.last_played_at ?? "0"))
      .slice(0, 5)
      .map(toFeatured)
    const steamTotalMinutes = steam.games.reduce((sum, game) => sum + game.playtime_forever_minutes, 0)
    const steamTwoWeekMinutes = steam.games.reduce(
      (sum, game) => sum + (game.playtime_2weeks_minutes ?? 0),
      0
    )
    return (
      <SteamSection
        rankedGames={rankedGames}
        recentGames={recentGames}
        totalMinutes={steamTotalMinutes}
        twoWeekMinutes={steamTwoWeekMinutes}
        reviews={latestReviews}
        profile={steam.profile}
      />
    )
  } catch {
    return (
      <SteamSection
        rankedGames={reviews.slice(0, 5).map((review) => ({
          app_id: review.app_id,
          name: review.game_title,
          playtime_forever_minutes: 0,
          playtime_2weeks_minutes: null,
          playtime_deck_minutes: 0,
          last_played_at: null,
        }))}
        recentGames={[]}
        totalMinutes={0}
        twoWeekMinutes={0}
        reviews={latestReviews}
        profile={null}
      />
    )
  }
}

async function HomeSkills() {
  const skills = await listPublicCareerSkills()
  if (skills.length === 0) return null
  return (
    <section id="skills" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20">
      <h2 className="font-display text-3xl font-extrabold">스킬</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Link key={skill.id} href="/work">
            <Badge variant="secondary">{skill.name}</Badge>
          </Link>
        ))}
      </div>
    </section>
  )
}

function HomeSkillsSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20" aria-hidden>
      <Skeleton className="h-8 w-20" />
      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-16 rounded-full" />
        ))}
      </div>
    </section>
  )
}
