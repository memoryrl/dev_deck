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
}

export default nextConfig
