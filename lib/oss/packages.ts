export type OssPackage = {
  name: string
  version: string
  license: string
}

/** package.json production 의존성 기준, node_modules 설치 버전. */
export const FRONTEND_PACKAGES: OssPackage[] = [
  { name: "@base-ui/react", version: "1.8.0", license: "MIT" },
  { name: "@ckeditor/ckeditor5-react", version: "11.2.0", license: "GPL-2.0-or-later" },
  { name: "@radix-ui/react-label", version: "2.1.15", license: "MIT" },
  { name: "@radix-ui/react-select", version: "2.3.7", license: "MIT" },
  { name: "@radix-ui/react-slot", version: "1.3.3", license: "MIT" },
  { name: "@radix-ui/react-switch", version: "1.3.7", license: "MIT" },
  { name: "@react-three/drei", version: "9.122.0", license: "MIT" },
  { name: "@react-three/fiber", version: "8.18.0", license: "MIT" },
  { name: "@uppy/core", version: "6.0.1", license: "MIT" },
  { name: "@uppy/dashboard", version: "6.0.0", license: "MIT" },
  { name: "@uppy/locales", version: "5.2.0", license: "MIT" },
  { name: "@uppy/react", version: "6.0.0", license: "MIT" },
  { name: "@uppy/tus", version: "6.0.0", license: "MIT" },
  { name: "ckeditor5", version: "48.5.0", license: "GPL-2.0-or-later" },
  { name: "class-variance-authority", version: "0.7.1", license: "Apache-2.0" },
  { name: "clsx", version: "2.1.1", license: "MIT" },
  { name: "cn", version: "0.3.0", license: "MIT" },
  { name: "compressorjs", version: "1.3.0", license: "MIT" },
  { name: "lucide-react", version: "0.468.0", license: "ISC" },
  { name: "next", version: "14.2.35", license: "MIT" },
  { name: "next-themes", version: "0.4.6", license: "MIT" },
  { name: "react", version: "18.3.1", license: "MIT" },
  { name: "react-dom", version: "18.3.1", license: "MIT" },
  { name: "react-markdown", version: "9.1.0", license: "MIT" },
  { name: "rehype-sanitize", version: "6.0.0", license: "MIT" },
  { name: "shadcn", version: "4.21.0", license: "MIT" },
  { name: "tailwind-merge", version: "3.7.0", license: "MIT" },
  { name: "tailwindcss-animate", version: "1.0.7", license: "MIT" },
  { name: "three", version: "0.169.0", license: "MIT" },
  { name: "tw-animate-css", version: "1.4.0", license: "MIT" },
]

export const BACKEND_PACKAGES: OssPackage[] = [
  { name: "@supabase/ssr", version: "0.5.2", license: "MIT" },
  { name: "@supabase/supabase-js", version: "2.116.0", license: "MIT" },
  { name: "marked", version: "18.0.13", license: "MIT" },
  { name: "next", version: "14.2.35", license: "MIT" },
  { name: "sanitize-html", version: "2.17.7", license: "MIT" },
]
