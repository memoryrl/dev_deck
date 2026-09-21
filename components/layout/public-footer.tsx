import { Github, Mail, Phone } from "lucide-react"
import Link from "next/link"
import { BrandMark } from "@/components/layout/brand-mark"
import { FooterNav } from "@/components/layout/footer-nav"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Badge } from "@/components/ui/badge"
import { accessRoleOf } from "@/lib/access"
import { currentViewer } from "@/lib/boards/access"
import { getT } from "@/lib/i18n/dictionary"
import { menuLabel } from "@/lib/menus/label"
import { SITE_CONTACT } from "@/lib/site/profile"
import { listNavMenus } from "@/lib/menus/public"

function fallbackColumns(t: (key: string) => string, owner: boolean) {
  return [
    {
      title: t("footer.browse"),
      links: [
        { href: "/", label: t("common.home") },
        { href: "/work", label: t("footer.career") },
        { href: "/games", label: t("footer.games") },
      ],
    },
    {
      title: "PromptKit",
      links: [
        { href: "/b/prompts", label: t("mega.prompt.public") },
        { href: "/b/prompts/top", label: t("mega.prompt.top") },
        ...(owner ? [{ href: "/promptkit", label: t("mega.prompt.manage") }] : []),
      ],
    },
    {
      title: "CareerLog",
      links: [
        { href: "/work", label: t("mega.career.all") },
        { href: "/b/skills", label: t("mega.career.skills") },
        { href: "/b/skills/top", label: t("mega.career.skillsTop") },
        ...(owner ? [{ href: "/career", label: t("mega.career.manage") }] : []),
      ],
    },
    {
      title: "Steam",
      links: [
        { href: "/games", label: t("mega.games.list") },
        { href: "/games/top", label: t("mega.games.featured") },
        ...(owner ? [{ href: "/steam", label: t("mega.games.manage") }] : []),
      ],
    },
    {
      title: t("mega.community.label"),
      links: [
        { href: "/b/notice", label: t("mega.community.notice") },
        { href: "/b/free", label: t("mega.community.free") },
      ],
    },
  ]
}

export async function PublicFooter() {
  const { t, locale } = await getT()
  const viewer = await currentViewer()
  const role = accessRoleOf(viewer.user)
  const owner = role === "owner"
  const dbFooter = await listNavMenus("footer", role)
  const footerColumns =
    dbFooter.length > 0
      ? dbFooter
          .map((item) => ({
            title: menuLabel(t, item, locale),
            links:
              item.children.length > 0
                ? item.children.map((child) => ({ href: child.href, label: menuLabel(t, child, locale) }))
                : item.href
                  ? [{ href: item.href, label: menuLabel(t, item, locale) }]
                  : [],
          }))
          .filter((column) => column.links.length > 0)
      : fallbackColumns(t, owner)
  return (
    <footer className="dark border-t border-border bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xs shrink-0 space-y-4">
            <Link href="/">
              <BrandMark wordmarkClassName="text-lg" />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("footer.blurb")}
            </p>
            <div className="flex flex-wrap gap-2">
              {["Next.js", "Supabase", "Steam API"].map((label) => (
                <Badge key={label} variant="secondary" className="rounded-full font-medium">
                  {label}
                </Badge>
              ))}
            </div>
            <LanguageSwitcher menuPlacement="up" />
          </div>

          <FooterNav columns={footerColumns} />

          <div className="shrink-0 lg:w-56">
            <p className="text-sm font-semibold">{t("footer.contact")}</p>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href={`tel:${SITE_CONTACT.phone}`}
                  className="inline-flex items-center gap-2 hover:text-foreground"
                >
                  <Phone className="size-4 shrink-0" aria-hidden />
                  {SITE_CONTACT.phoneLabel}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE_CONTACT.email}`}
                  className="inline-flex items-center gap-2 hover:text-foreground"
                >
                  <Mail className="size-4 shrink-0" aria-hidden />
                  {SITE_CONTACT.email}
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONTACT.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground"
                >
                  <Github className="size-4 shrink-0" aria-hidden />
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 DevDeck. Created by nckim. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p>{t("landing.kicker")}</p>
            <Link href="/opensource" className="hover:text-foreground">
              {t("footer.opensource")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
