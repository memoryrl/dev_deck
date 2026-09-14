import { getFeaturedPublicCareer, listPublicCareerPosts, listPublicCareerSkills, countPublicCareerPosts } from "@/lib/career/public"
import { countPublicPrompts, listPublicPrompts } from "@/lib/prompts/public"
import { fetchOwnedGames } from "@/lib/steam/client"
import {
  countPublicGameReviews,
  getLatestUmpcReview,
  listLatestPublicGameReviews,
} from "@/lib/steam/reviews"
import { plainTextFromContent } from "@/lib/content"
import { formatPeriod } from "@/lib/utils"
import type { CareerPost, CareerSkill } from "@/types/career"
import type { Prompt } from "@/types/prompt"
import type { FeaturedGame } from "@/components/landing/steam-featured"
import type { GameReview, SteamProfile } from "@/types/steam"

export type FeaturedWork =
  | {
      kind: "career"
      href: string
      title: string
      excerpt: string
      badge: string
      meta: string | null
    }
  | {
      kind: "prompt"
      href: string
      title: string
      excerpt: string
      badge: string
      meta: string | null
    }

export type HomeLandingData = {
  prompts: Prompt[]
  posts: CareerPost[]
  skills: CareerSkill[]
  featured: FeaturedWork | null
  stats: {
    promptCount: number
    careerCount: number
    gameCount: number
    playtimeMinutes: number
    reviewCount: number
  }
  activity: {
    promptAt: string | null
    careerAt: string | null
    reviewAt: string | null
  }
  umpc: {
    href: string
    title: string
    body: string
  } | null
  steam: {
    rankedGames: FeaturedGame[]
    recentGames: FeaturedGame[]
    totalMinutes: number
    twoWeekMinutes: number
    latestReviews: GameReview[]
    profile: SteamProfile | null
  }
}

function excerptOf(value: string, fallback = "") {
  const text = plainTextFromContent(value).trim() || fallback.trim()
  if (text.length <= 180) return text
  return `${text.slice(0, 179).trim()}…`
}

function latestIso(values: (string | null | undefined)[]) {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value))
  if (dates.length === 0) return null
  return new Date(Math.max(...dates)).toISOString()
}

function pickFeatured(posts: CareerPost[], prompts: Prompt[]): FeaturedWork | null {
  const project = posts.find((post) => post.post_type === "project") ?? posts[0]
  if (project) {
    const bits = [project.company, project.role, formatPeriod(project.period_start, project.period_end)].filter(Boolean)
    return {
      kind: "career",
      href: `/work/${project.id}`,
      title: project.title,
      excerpt: excerptOf(project.excerpt ?? "", project.title),
      badge: project.post_type === "project" ? "프로젝트" : project.post_type === "skill" ? "스킬" : "노트",
      meta: bits.length > 0 ? bits.join(" · ") : null,
    }
  }
  const prompt = prompts[0]
  if (!prompt) return null
  return {
    kind: "prompt",
    href: `/p/${prompt.id}`,
    title: prompt.title,
    excerpt: excerptOf(prompt.content, prompt.title),
    badge: "프롬프트",
    meta: prompt.category,
  }
}

function pickUmpc(
  review: GameReview | null,
  games: { app_id: number; name: string; playtime_deck_minutes: number }[]
) {
  if (review?.umpc_preset?.trim()) {
    return {
      href: `/games/${review.app_id}`,
      title: review.game_title,
      body: review.umpc_preset.trim(),
    }
  }
  const deck = [...games].sort((a, b) => b.playtime_deck_minutes - a.playtime_deck_minutes)[0]
  if (deck && deck.playtime_deck_minutes > 0) {
    return {
      href: `/games/${deck.app_id}`,
      title: deck.name,
      body: "Steam Deck에서 플레이한 기록이 있습니다. 상세에서 세팅과 리뷰를 확인하세요.",
    }
  }
  return null
}

export async function getHomeLandingData(): Promise<HomeLandingData> {
  const [promptCount, careerCount, reviewCount, prompts, posts, featuredPost, skills, latestReviews, umpcReview, steam] =
    await Promise.all([
      countPublicPrompts(),
      countPublicCareerPosts(),
      countPublicGameReviews(),
      listPublicPrompts(6),
      listPublicCareerPosts(6),
      getFeaturedPublicCareer(),
      listPublicCareerSkills(8),
      listLatestPublicGameReviews(6),
      getLatestUmpcReview(),
      fetchOwnedGames().catch(() => null),
    ])

  let games: FeaturedGame[] = []
  let profile: SteamProfile | null = null
  let steamTotalMinutes = 0
  let steamTwoWeekMinutes = 0
  let steamGameCount = 0

  if (steam) {
    profile = steam.profile
    steamGameCount = steam.game_count
    games = steam.games.map((game) => ({
      app_id: game.app_id,
      name: game.name,
      playtime_forever_minutes: game.playtime_forever_minutes,
      playtime_2weeks_minutes: game.playtime_2weeks_minutes,
      playtime_deck_minutes: game.playtime_deck_minutes,
      last_played_at: game.last_played_at,
      header_image_url: game.header_image_url,
    }))
    steamTotalMinutes = games.reduce((sum, game) => sum + game.playtime_forever_minutes, 0)
    steamTwoWeekMinutes = games.reduce((sum, game) => sum + (game.playtime_2weeks_minutes ?? 0), 0)
  } else {
    games = latestReviews.slice(0, 5).map((review) => ({
      app_id: review.app_id,
      name: review.game_title,
      playtime_forever_minutes: 0,
      playtime_2weeks_minutes: null,
      playtime_deck_minutes: 0,
      last_played_at: null,
    }))
  }

  const featuredSource = featuredPost ? [featuredPost] : posts
  const reviewsWithText = latestReviews.filter((review) => review.review_text?.trim())
  const reviewCards = reviewsWithText.length > 0 ? reviewsWithText : latestReviews

  return {
    prompts,
    posts,
    skills,
    featured: pickFeatured(featuredSource, prompts),
    stats: {
      promptCount,
      careerCount,
      gameCount: steamGameCount || games.length,
      playtimeMinutes: steamTotalMinutes,
      reviewCount,
    },
    activity: {
      promptAt: latestIso(prompts.flatMap((item) => [item.updated_at, item.created_at])),
      careerAt: latestIso(posts.flatMap((item) => [item.updated_at, item.created_at])),
      reviewAt: latestIso(latestReviews.flatMap((item) => [item.updated_at, item.created_at])),
    },
    umpc: pickUmpc(umpcReview, games),
    steam: {
      rankedGames: [...games]
        .sort((a, b) => b.playtime_forever_minutes - a.playtime_forever_minutes)
        .slice(0, 5),
      recentGames: [...games]
        .filter((game) => game.last_played_at)
        .sort((a, b) => Date.parse(b.last_played_at ?? "0") - Date.parse(a.last_played_at ?? "0"))
        .slice(0, 5),
      totalMinutes: steamTotalMinutes,
      twoWeekMinutes: steamTwoWeekMinutes,
      latestReviews: reviewCards.slice(0, 6),
      profile,
    },
  }
}
