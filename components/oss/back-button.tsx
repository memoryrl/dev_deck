"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function OssBackButton({ label }: { label: string }) {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-full"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back()
          return
        }
        router.push("/")
      }}
    >
      {label}
    </Button>
  )
}
