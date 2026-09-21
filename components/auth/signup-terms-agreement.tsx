"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"
import type { TermsSlug } from "@/types/terms"

export type SignupTermsDoc = {
  slug: TermsSlug
  title: string
  version: number
  /** 영문 본문이 없어 한국어로 대체했을 때 보여 줄 안내. 없으면 null */
  fallbackNotice: string | null
  /** 서버에서 sanitize 해 렌더한 본문 */
  body: ReactNode
}

/**
 * 회원가입 탭의 약관 동의. 이용약관·개인정보처리방침 개별 체크(둘 다 필수).
 * 각 항목의 "보기"로 본문을 그 자리에서 펼쳐 읽을 수 있다.
 * 필수 체크는 해당 본문을 맨 아래까지 내린 뒤에만 켜진다.
 */
export function SignupTermsAgreement({
  docs,
  checked,
  onChange,
}: {
  docs: SignupTermsDoc[]
  checked: Record<TermsSlug, boolean>
  onChange: (next: Record<TermsSlug, boolean>) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState<TermsSlug | null>(null)
  const [read, setRead] = useState<Partial<Record<TermsSlug, boolean>>>({})

  function unlock(slug: TermsSlug) {
    setRead((current) => (current[slug] ? current : { ...current, [slug]: true }))
  }

  function toggleDoc(slug: TermsSlug) {
    if (checked[slug]) {
      onChange({ ...checked, [slug]: false })
      return
    }
    if (!read[slug]) {
      setOpen(slug)
      return
    }
    onChange({ ...checked, [slug]: true })
  }

  return (
    <fieldset className="space-y-2.5">
      <legend className="sr-only">{t("auth.termsLegend")}</legend>

      <ul className="space-y-2">
        {docs.map((doc) => {
          const isOpen = open === doc.slug
          const unlocked = Boolean(read[doc.slug])
          const locked = !checked[doc.slug] && !unlocked
          const id = `signup-terms-${doc.slug}`
          return (
            <li key={doc.slug} className="rounded-xl border border-[#6b4f3a]/15 bg-white/50 dark:border-[#c4a574]/20 dark:bg-white/[0.03]">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <label
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3",
                    locked ? "cursor-not-allowed" : "cursor-pointer"
                  )}
                  title={locked ? t("auth.scrollToAgree") : undefined}
                >
                  <Box checked={checked[doc.slug]} disabled={locked} />
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked[doc.slug]}
                    aria-disabled={locked}
                    onChange={() => toggleDoc(doc.slug)}
                  />
                  <span
                    className={cn(
                      "min-w-0 text-sm text-[#3d2f24] dark:text-[#e8dcc4]",
                      locked && "opacity-70"
                    )}
                  >
                    <span className="mr-1.5 font-semibold text-[#8a4b2a] dark:text-[#e0a878]">{t("auth.required")}</span>
                    {t("auth.agreeDoc", { title: doc.title })}
                  </span>
                </label>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() => setOpen(isOpen ? null : doc.slug)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#6b4f3a] underline-offset-2 transition-colors hover:bg-[#6b4f3a]/10 hover:underline dark:text-[#c4a574] dark:hover:bg-[#c4a574]/10"
                >
                  {isOpen ? t("auth.hideDoc") : t("auth.viewDoc")}
                  <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} aria-hidden />
                </button>
              </div>
              {isOpen ? (
                <div id={id} className="border-t border-[#6b4f3a]/15 dark:border-[#c4a574]/20">
                  {doc.fallbackNotice ? (
                    <p className="bg-amber-500/10 px-4 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">{doc.fallbackNotice}</p>
                  ) : null}
                  <TermsScrollBody onReachedEnd={() => unlock(doc.slug)}>{doc.body}</TermsScrollBody>
                  {locked ? (
                    <p className="border-t border-[#6b4f3a]/10 px-4 py-2 text-[11px] text-[#6b4f3a] dark:border-[#c4a574]/15 dark:text-[#c4a574]">
                      {t("auth.scrollToAgree")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

function TermsScrollBody({
  children,
  onReachedEnd,
}: {
  children: ReactNode
  onReachedEnd: () => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const onReachedEndRef = useRef(onReachedEnd)
  onReachedEndRef.current = onReachedEnd

  useEffect(() => {
    const scroller = scrollerRef.current
    const content = contentRef.current
    if (!scroller || !content) return

    function check() {
      if (!scroller) return
      const remaining = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
      if (remaining <= 12) onReachedEndRef.current()
    }

    check()
    const ro = new ResizeObserver(check)
    ro.observe(scroller)
    ro.observe(content)
    scroller.addEventListener("scroll", check, { passive: true })
    window.addEventListener("resize", check)
    return () => {
      ro.disconnect()
      scroller.removeEventListener("scroll", check)
      window.removeEventListener("resize", check)
    }
  }, [])

  return (
    <div
      ref={scrollerRef}
      tabIndex={0}
      className="max-h-52 overflow-y-auto bg-background/90 px-4 py-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-card"
    >
      <div ref={contentRef}>{children}</div>
    </div>
  )
}

function Box({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
        disabled && "opacity-45",
        checked
          ? "border-[#6b4f3a] bg-[#6b4f3a] text-white dark:border-[#c4a574] dark:bg-[#c4a574] dark:text-[#1a1614]"
          : "border-[#6b4f3a]/40 bg-white dark:border-[#c4a574]/50 dark:bg-transparent"
      )}
    >
      {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
    </span>
  )
}
