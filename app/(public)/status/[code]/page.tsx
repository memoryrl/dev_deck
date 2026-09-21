import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { HttpErrorPage } from "@/components/errors/http-error-page"
import { getT } from "@/lib/i18n/dictionary"
import { HTTP_ERROR_CODES, parseHttpErrorCode, resolveHttpError } from "@/lib/http-errors"

export const dynamicParams = true

export function generateStaticParams() {
  return HTTP_ERROR_CODES.map((code) => ({ code: String(code) }))
}

export async function generateMetadata(props: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const params = await props.params;
  const status = parseHttpErrorCode(params.code)
  if (status == null) return { robots: { index: false, follow: false } }
  const { locale } = await getT()
  const error = resolveHttpError(status, locale)
  return {
    title: `${status} · ${error.title} · DevDeck`,
    description: error.lede,
    robots: { index: false, follow: false },
  }
}

export default async function HttpStatusPage(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const status = parseHttpErrorCode(params.code)
  if (status == null) notFound()
  return <HttpErrorPage status={status} />
}
