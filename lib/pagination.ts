export const LIST_PAGE_SIZE = 10

export type PagedResult<T> = {
  rows: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export function parseListPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? "1", 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return parsed
}

export function parseSearchQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return (raw ?? "").trim().slice(0, 80)
}

export function ilikeContains(value: string) {
  return `%${value.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&")}%`
}

export function emptyPage<T>(page = 1, pageSize = LIST_PAGE_SIZE): PagedResult<T> {
  return { rows: [], total: 0, page: 1, pageSize, pageCount: 1 }
}

export function pageCountOf(total: number, pageSize = LIST_PAGE_SIZE) {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize))
}

export function pageRange(page: number, pageSize = LIST_PAGE_SIZE) {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export function clampPage(page: number, total: number, pageSize = LIST_PAGE_SIZE) {
  return Math.min(Math.max(1, page), pageCountOf(total, pageSize))
}

export function pageWindow(page: number, pageCount: number, radius = 2) {
  const start = Math.max(1, page - radius)
  const end = Math.min(pageCount, page + radius)
  const pages: number[] = []
  for (let i = start; i <= end; i += 1) pages.push(i)
  return pages
}

export async function fetchPagedRows<T>(
  requestedPage: number,
  pageSize: number,
  execute: (from: number, to: number) => Promise<{ rows: T[]; total: number } | null>
): Promise<PagedResult<T>> {
  const first = Math.max(1, requestedPage)
  const firstRange = pageRange(first, pageSize)
  const result = await execute(firstRange.from, firstRange.to)
  if (!result) return emptyPage(1, pageSize)

  const page = clampPage(first, result.total, pageSize)
  if (page !== first) {
    const nextRange = pageRange(page, pageSize)
    const again = await execute(nextRange.from, nextRange.to)
    if (!again) {
      return { rows: [], total: result.total, page, pageSize, pageCount: pageCountOf(result.total, pageSize) }
    }
    return {
      rows: again.rows,
      total: again.total,
      page,
      pageSize,
      pageCount: pageCountOf(again.total, pageSize),
    }
  }

  return {
    rows: result.rows,
    total: result.total,
    page,
    pageSize,
    pageCount: pageCountOf(result.total, pageSize),
  }
}

export function paginateItems<T>(items: T[], page: number, pageSize = LIST_PAGE_SIZE): PagedResult<T> {
  const total = items.length
  const clamped = clampPage(page, total, pageSize)
  const { from, to } = pageRange(clamped, pageSize)
  return {
    rows: items.slice(from, to + 1),
    total,
    page: clamped,
    pageSize,
    pageCount: pageCountOf(total, pageSize),
  }
}

export function listQueryHref(
  pathname: string,
  params: Record<string, string | number | undefined>,
  next: Record<string, string | number | undefined>
) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...params, ...next })) {
    if (value === undefined || value === "") continue
    const text = String(value)
    if ((key === "page" || key === "words") && text === "1") continue
    if (key === "sort" && text === "playtime") continue
    search.set(key, text)
  }
  const query = search.toString()
  return query ? `${pathname}?${query}` : pathname
}
