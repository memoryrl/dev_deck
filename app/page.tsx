import Link from "next/link"
import { HeroVisual } from "@/components/landing/hero-visual"
import { ModuleMarquee } from "@/components/landing/module-marquee"
import { LatestColumns } from "@/components/landing/latest-columns"
import { SteamSection } from "@/components/landing/steam-section"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { listPublicCareerSkills, listRecentPublicCareerPosts } from "@/lib/career/public"
import { listRecentPublicPrompts } from "@/lib/prompts/public"
import { fetchOwnedGames } from "@/lib/steam/client"
import { listPublicGameReviews } from "@/lib/steam/reviews"

export default async function HomePage() {
  const [prompts, posts, skills, reviews] = await Promise.all([
    listRecentPublicPrompts(4),
    listRecentPublicCareerPosts(4),
    listPublicCareerSkills(),
    listPublicGameReviews(),
  ])
  const reviewsWithText = reviews.filter((review) => review.review_text?.trim())
  const latestReviews = [...(reviewsWithText.length > 0 ? reviewsWithText : reviews)]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 6)

  let featuredGames: { app_id: number; name: string; playtime_forever_minutes: number }[] = []
  let steamTotalMinutes = 0
  try {
    const steam = await fetchOwnedGames()
    steamTotalMinutes = steam.games.reduce((sum, game) => sum + game.playtime_forever_minutes, 0)
    featuredGames = [...steam.games]
      .sort((a, b) => b.playtime_forever_minutes - a.playtime_forever_minutes)
      .slice(0, 5)
      .map((game) => ({
        app_id: game.app_id,
        name: game.name,
        playtime_forever_minutes: game.playtime_forever_minutes,
      }))
  } catch {
    featuredGames = reviews.slice(0, 5).map((review) => ({
      app_id: review.app_id,
      name: review.game_title,
      playtime_forever_minutes: 0,
    }))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
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

        <LatestColumns prompts={prompts} posts={posts} />

        <SteamSection games={featuredGames} totalMinutes={steamTotalMinutes} reviews={latestReviews} />

        {skills.length > 0 ? (
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
        ) : null}
      </main>
      <PublicFooter />
    </div>
  )
}
