import { getFeaturedPublicCareer, listPublicCareerPosts, listPublicCareerSkills, countPublicCareerPosts } from "@/lib/career/public"
import { countPublicPrompts, listPublicPrompts } from "@/lib/prompts/public"
import { fetchOwnedGames } from "@/lib/steam/client"
import {
  countPublicGameReviews,
  getLatestUmpcReview,
  listLatestPublicGameReviews,
} from "@/lib/steam/reviews"
import { plainTextFromContent } from "@/lib/content"
import { resolvePromptThumbnail } from "@/lib/embeds/result-preview"
import { formatPeriod } from "@/lib/i18n/format"
import { getT } from "@/lib/i18n/dictionary"
import type { CareerPost, CareerSkill } from "@/types/career"
import type { Prompt } from "@/types/prompt"
import type { FeaturedGame } from "@/components/landing/steam-featured"
import { listLatestCommunityPosts, type CommunityLatestPost } from "@/lib/boards/community"
import type { GameReview, SteamProfile } from "@/types/steam"

export type HomeActivityKind = "prompt" | "career" | "review"

export type HomeActivityItem = {
  kind: HomeActivityKind
  label: string
  title: string
  detail: string | null
  href: string
  at: string
}

export type FeaturedWork =
  | {
      kind: "career"
      href: string
      title: string
      excerpt: string
      badge: string
      meta: string | null
      thumbnailUrl?: string | null
    }
  | {
      kind: "prompt"
      href: string
      title: string
      excerpt: string
      badge: string
      meta: string | null
      thumbnailUrl?: string | null
    }

export type HomeLandingData = {
  prompts: Prompt[]
  posts: CareerPost[]
  communityPosts: CommunityLatestPost[]
  skills: CareerSkill[]
  featured: FeaturedWork | null
  stats: {
    promptCount: number
    careerCount: number
    gameCount: number
    playtimeMinutes: number
    reviewCount: number
  }
  activity: HomeActivityItem[]
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

function excerptOf(value: string, fallback = "", max = 180) {
  const text = plainTextFromContent(value).trim() || fallback.trim()
  if (!text) return ""
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

function itemTimestamp(...values: (string | null | undefined)[]) {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value))
  if (dates.length === 0) return null
  return new Date(Math.max(...dates)).toISOString()
}

function pickLatestByDate<T>(items: T[], getAt: (item: T) => string | null): T | null {
  let best: T | null = null
  let bestMs = -Infinity
  for (const item of items) {
    const at = getAt(item)
    if (!at) continue
    const ms = Date.parse(at)
    if (!Number.isFinite(ms) || ms <= bestMs) continue
    best = item
    bestMs = ms
  }
  return best
}

function buildActivity(
  prompts: Prompt[],
  posts: CareerPost[],
  reviews: GameReview[],
  t: (key: string) => string
): HomeActivityItem[] {
  const items: HomeActivityItem[] = []

  const prompt = pickLatestByDate(prompts, (item) => itemTimestamp(item.updated_at, item.created_at))
  if (prompt) {
    const at = itemTimestamp(prompt.updated_at, prompt.created_at)
    if (at) {
      items.push({
        kind: "prompt",
        label: t("landing.badgePrompt"),
        title: prompt.title,
        detail: prompt.category || null,
        href: `/p/${prompt.id}`,
        at,
      })
    }
  }

  const post = pickLatestByDate(posts, (item) => itemTimestamp(item.updated_at, item.created_at))
  if (post) {
    const at = itemTimestamp(post.updated_at, post.created_at)
    if (at) {
      items.push({
        kind: "career",
        label: t("footer.career"),
        title: post.title,
        detail: [post.company, post.role].filter(Boolean).join(" · ") || null,
        href: `/work/${post.id}`,
        at,
      })
    }
  }

  const review = pickLatestByDate(reviews, (item) => itemTimestamp(item.updated_at, item.created_at))
  if (review) {
    const at = itemTimestamp(review.updated_at, review.created_at)
    if (at) {
      const summary = excerptOf(review.review_text ?? "", "", 90)
      items.push({
        kind: "review",
        label: t("footer.reviews"),
        title: review.game_title,
        detail: summary || `★ ${review.rating}`,
        href: `/games/${review.app_id}`,
        at,
      })
    }
  }

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

async function pickFeatured(posts: CareerPost[], prompts: Prompt[]): Promise<FeaturedWork | null> {
  const { t } = await getT()
  const present = t("date.present")
  const project = posts.find((post) => post.post_type === "project") ?? posts[0]
  if (project) {
    const bits = [project.company, project.role, formatPeriod(project.period_start, project.period_end, present)].filter(Boolean)
    return {
      kind: "career",
      href: `/work/${project.id}`,
      title: project.title,
      excerpt: excerptOf(project.excerpt ?? "", project.title),
      badge:
        project.post_type === "project"
          ? t("landing.badgeProject")
          : project.post_type === "skill"
            ? t("landing.badgeSkill")
            : t("landing.badgeNote"),
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
    badge: t("landing.badgePrompt"),
    meta: prompt.category,
  }
}

async function pickUmpc(
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
      body: (await getT()).t("landing.umpcFallback"),
    }
  }
  return null
}

export async function getHomeLandingData(): Promise<HomeLandingData> {
  const [promptCount, careerCount, reviewCount, prompts, posts, communityPosts, featuredPost, skills, latestReviews, umpcReview, steam] =
    await Promise.all([
      countPublicPrompts(),
      countPublicCareerPosts(),
      countPublicGameReviews(),
      listPublicPrompts(6),
      listPublicCareerPosts(6),
      listLatestCommunityPosts(),
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
  const featured = await pickFeatured(featuredSource, prompts)
  if (featured?.kind === "prompt") {
    const prompt = prompts.find((item) => featured.href === `/p/${item.id}`)
    featured.thumbnailUrl = await resolvePromptThumbnail(prompt?.result_html)
  }
  const reviewsWithText = latestReviews.filter((review) => review.review_text?.trim())
  const reviewCards = reviewsWithText.length > 0 ? reviewsWithText : latestReviews
  const { t } = await getT()

  return {
    prompts,
    posts,
    communityPosts,
    skills,
    featured,
    stats: {
      promptCount,
      careerCount,
      gameCount: steamGameCount || games.length,
      playtimeMinutes: steamTotalMinutes,
      reviewCount,
    },
    activity: buildActivity(prompts, posts, latestReviews, t),
    umpc: await pickUmpc(umpcReview, games),
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
