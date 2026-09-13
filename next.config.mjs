/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["ckeditor5", "@ckeditor/ckeditor5-react", "marked"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
      { protocol: "https", hostname: "media.steampowered.com" },
    ],
  },
}

export default nextConfig
