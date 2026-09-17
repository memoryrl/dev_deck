"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type CustomSelectOption = { value: string; label: string }

// Radix Select는 value=""를 "선택 안 됨"으로 예약해서 쓸 수 없다 — "없음"/"최상위" 같은
// 빈 값 옵션이 실제로 있는 폼(menu-form.tsx 등)을 위해 내부적으로만 이 값으로 치환한다.
const EMPTY_VALUE = "__empty__"

function toInternal(value: string) {
  return value === "" ? EMPTY_VALUE : value
}

function fromInternal(value: string) {
  return value === EMPTY_VALUE ? "" : value
}

// 참고: /Volumes/T7/004.맥북프로 M4/kware/workspace/glow_platform_dev/glow_platform의
// CustomSelect.jsx(react-select 래퍼)를 참고해 devdeck 스택(Tailwind + Radix, react-select
// 의존성 없음)에 맞게 새로 짰다 — value/options/onValueChange라는 단순한 API, 옵션이
// 많을 때만 자동으로 검색창이 뜨는 동작은 그대로 가져왔다.
export function CustomSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  searchable,
  searchPlaceholder = "검색",
  emptyMessage = "검색 결과가 없습니다.",
  disabled,
  name,
  id,
  className,
  triggerClassName,
  "aria-label": ariaLabel,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  /** 지정하지 않으면 옵션이 6개보다 많을 때만 자동으로 검색창을 보여준다. */
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  name?: string
  id?: string
  className?: string
  triggerClassName?: string
  "aria-label"?: string
}) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue ?? "")
  const current = isControlled ? (value ?? "") : internalValue
  const [query, setQuery] = useState("")
  const showSearch = searchable ?? options.length > 6

  const filtered = useMemo(() => {
    if (!showSearch || !query.trim()) return options
    const needle = query.trim().toLowerCase()
    return options.filter((option) => option.label.toLowerCase().includes(needle))
  }, [options, query, showSearch])

  const selected = options.find((option) => option.value === current)

  function handleChange(nextInternal: string) {
    const next = fromInternal(nextInternal)
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  return (
    <div className={className}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <Select
        value={toInternal(current)}
        onValueChange={handleChange}
        disabled={disabled}
        onOpenChange={(open) => {
          if (!open) setQuery("")
        }}
      >
        <SelectTrigger id={id} aria-label={ariaLabel} className={triggerClassName}>
          <SelectValue placeholder={placeholder}>{selected?.label ?? placeholder}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {showSearch ? (
            <div className="sticky top-0 z-10 -mx-1 -mt-1 mb-1 border-b border-border bg-popover p-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder={searchPlaceholder}
                  className="h-8 w-full rounded-md border border-input bg-transparent pl-7 pr-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => (
              <SelectItem key={option.value} value={toInternal(option.value)}>
                {option.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
