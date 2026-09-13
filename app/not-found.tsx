import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-4xl font-extrabold">페이지를 찾을 수 없습니다</h1>
      <Link href="/">
        <Button>홈으로</Button>
      </Link>
    </div>
  )
}
