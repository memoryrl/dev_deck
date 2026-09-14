function trimOrigin(value: string) {
  return value.replace(/\/$/, "")
}

function isLocalOrigin(value: string) {
  try {
    const host = new URL(value).hostname
    return host === "localhost" || host === "127.0.0.1"
  } catch {
    return value.includes("localhost") || value.includes("127.0.0.1")
  }
}

export function getRequestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return trimOrigin(configured)

  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
  const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim()
  const forwarded = host ? `${proto}://${host}` : null
  if (forwarded && !isLocalOrigin(forwarded)) return forwarded

  const origin = new URL(request.url).origin
  if (!isLocalOrigin(origin)) return origin

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`

  return forwarded || origin
}
