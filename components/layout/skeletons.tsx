import type { ReactNode } from "react"
import { PublicContainer } from "@/components/layout/public-container"
import { Skeleton } from "@/components/ui/skeleton"
import { getT } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils"

function Screen({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function TitleSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-10 w-48 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 5, withSearch = true }: { count?: number; withSearch?: boolean }) {
  return (
    <div>
      {withSearch ? (
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-16 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      ) : null}
      <Skeleton className={withSearch ? "mt-4 h-4 w-16" : "h-4 w-16"} />
      <div className="mt-2 divide-y border-y bg-white dark:bg-card">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="space-y-2 px-4 py-4 sm:px-5">
            <Skeleton className="h-5 w-3/4 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ArticleSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="aspect-[2.2/1] w-full rounded-xl" />
      <Skeleton className="h-10 w-2/3 max-w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
      </div>
    </div>
  )
}

export function SteamLibrarySkeleton() {
  return (
    <Screen label={getT().t("loading.steamLibrary")} className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
      <CardGridSkeleton />
    </Screen>
  )
}

export function SteamShowcaseSkeleton() {
  return (
    <Screen label={getT().t("loading.steamSection")} className="mx-auto max-w-6xl px-5 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="mt-5 h-12 w-full rounded-full" />
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:grid-rows-2">
        <Skeleton className="min-h-96 rounded-2xl md:row-span-2" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border bg-card">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-3">
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="mt-12 h-7 w-28" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-4 rounded-2xl border bg-card p-3">
            <Skeleton className="h-[7.5rem] w-[13.5rem] shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function LatestColumnsSkeleton() {
  return (
    <Screen label={getT().t("loading.latest")} className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-10 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, column) => (
          <div key={column} className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="divide-y border-y bg-white dark:bg-card">
              {Array.from({ length: 4 }).map((__, index) => (
                <div key={index} className="space-y-2 px-4 py-4 sm:px-5">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function FormCardSkeleton() {
  return (
    <Screen label={getT().t("loading.generic")} className="mx-auto w-full max-w-6xl flex-1 px-5 py-20">
      <div className="mx-auto w-full max-w-md space-y-4 rounded-xl border bg-card p-8">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </Screen>
  )
}

export function DashboardPageSkeleton({ variant = "list" }: { variant?: "list" | "grid" | "article" }) {
  return (
    <Screen label={getT().t("loading.dashboard")} className="mx-auto max-w-5xl space-y-8">
      <TitleSkeleton />
      {variant === "grid" ? <CardGridSkeleton /> : null}
      {variant === "list" ? <ListSkeleton /> : null}
      {variant === "article" ? <ArticleSkeleton /> : null}
    </Screen>
  )
}

export function HomeLandingSkeleton() {
  return (
    <Screen label={getT().t("loading.landing")}>
      <div className="mx-auto max-w-6xl px-5 pb-6 pt-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border bg-card px-4 py-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-8 w-12" />
            </div>
          ))}
        </div>
      </div>
      <LatestColumnsSkeleton />
      <SteamShowcaseSkeleton />
    </Screen>
  )
}

export function PublicPageSkeleton({
  variant = "list",
}: {
  variant?: "grid" | "list" | "article" | "form" | "home"
}) {
  if (variant === "form") return <FormCardSkeleton />
  if (variant === "home") {
    return (
      <Screen label={getT().t("loading.home")}>
        <div className="mx-auto max-w-6xl space-y-4 px-5 pb-28 pt-20">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full max-w-2xl" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>
        <HomeLandingSkeleton />
      </Screen>
    )
  }

  return (
    <PublicContainer>
      <Screen label={getT().t("loading.page")}>
        {variant === "article" ? (
          <ArticleSkeleton />
        ) : (
          <>
            <TitleSkeleton />
            <div className="mt-8">{variant === "grid" ? <CardGridSkeleton /> : <ListSkeleton />}</div>
          </>
        )}
      </Screen>
    </PublicContainer>
  )
}
