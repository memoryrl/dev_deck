import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { formatPeriod, isSupabaseConfigured } from "@/lib/utils"
import type { CareerPost } from "@/types/career"
import { CareerForm } from "./career-form"

export default async function CareerPage() {
  let posts: CareerPost[] = []
  if (isSupabaseConfigured()) {
    await ensureProfile()
    const supabase = createClient()
    const { data } = await supabase
      .from("career_posts")
      .select("*")
      .order("created_at", { ascending: false })
    posts = (data as CareerPost[]) ?? []
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">CareerLog</h1>
        <Link href="/career/skills">
          <Button variant="outline">스킬 관리</Button>
        </Link>
      </div>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">새 글</h2>
        <CareerForm />
      </Card>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">참여했던 프로젝트를 글로 남겨 보세요.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link key={post.id} href={`/career/${post.id}`}>
              <Card>
                <div className="flex flex-wrap gap-2">
                  <Badge>{post.post_type}</Badge>
                  {post.is_public ? <Badge variant="secondary">공개</Badge> : null}
                  {post.company ? <Badge>{post.company}</Badge> : null}
                </div>
                <h3 className="mt-3 font-display text-xl font-bold">{post.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatPeriod(post.period_start, post.period_end)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
