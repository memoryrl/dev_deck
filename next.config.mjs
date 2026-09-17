// CSP는 App Router의 RSC 인라인 스크립트/HMR eval과 얽혀 있어 nonce 발급이 필요한
// production 쪽만 middleware.ts에서 다룬다 — 여기서는 어느 환경에서나 안전하게
// 켜둘 수 있는 정적 헤더만 설정한다(HSTS는 HTTP로 서빙되는 로컬 개발 서버에서는
// 브라우저가 무시하므로 dev 모드에도 켜둬도 문제없다).
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), midi=(), serial=(), hid=()",
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["ckeditor5", "@ckeditor/ckeditor5-react", "marked"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
      { protocol: "https", hostname: "media.steampowered.com" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }]
  },
}

export default nextConfig
