import { ArrowUpRight, Github, Mail, Phone } from "lucide-react"
import Link from "next/link"
import { BrandMark } from "@/components/layout/brand-mark"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Badge } from "@/components/ui/badge"
import { getT } from "@/lib/i18n/dictionary"
import { SITE_CONTACT } from "@/lib/site/profile"
import { listNavMenus } from "@/lib/menus/public"

function fallbackColumns(t: (key: string) => string) {
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
        { href: "/login", label: t("footer.dashboard") },
        { href: "/", label: t("footer.publicPrompts") },
      ],
    },
    {
      title: "CareerLog",
      links: [
        { href: "/work", label: t("footer.board") },
        { href: "/work", label: t("footer.skills") },
      ],
    },
    {
      title: "Steam",
      links: [
        { href: "/games", label: t("footer.library") },
        { href: "/games", label: t("footer.reviews") },
      ],
    },
  ]
}

export async function PublicFooter() {
  const { t } = getT()
  const dbFooter = await listNavMenus("footer")
  const footerColumns =
    dbFooter.length > 0
      ? dbFooter
          .map((item) => ({
            title: item.label,
            links:
              item.children.length > 0
                ? item.children.map((child) => ({ href: child.href, label: child.label }))
                : item.href
                  ? [{ href: item.href, label: item.label }]
                  : [],
          }))
          .filter((column) => column.links.length > 0)
      : fallbackColumns(t)
  return (
    <footer className="dark bg-background text-foreground">
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

          <nav className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(7.5rem,max-content))] justify-items-start gap-x-10 gap-y-8">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <p className="text-sm font-semibold">{column.title}</p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUpRight
                          className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

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
          <p>Personal Developer Hub</p>
        </div>
      </div>
    </footer>
  )
}
