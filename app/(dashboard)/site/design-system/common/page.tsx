import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, Check, ChevronRight } from "lucide-react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CustomSelect } from "@/components/ui/custom-select"
import { ListPager } from "@/components/layout/list-pager"
import { requireOwner } from "@/lib/auth/owner"

export default async function DesignSystemCommonPage() {
  await requireOwner()

  return (
    <div className="w-full space-y-12 pb-16">
      <PageTitleBanner
        title="디자인 시스템 - 공통영역"
        description="DevDeck 프로젝트의 공통 UI 컴포넌트 가이드입니다. 에이전트(Cursor, Claude)가 작업 시 이 페이지를 참고하여 일관된 디자인을 유지합니다."
        actions={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/design-system/screens">
              화면영역 보기 <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        }
      />

      <section className="space-y-4">
        <div className="flex gap-2">
          <Badge>공통 컴포넌트</Badge>
          <Badge variant="secondary">UI 라이브러리</Badge>
          <Badge variant="outline">에이전트 참고용</Badge>
        </div>
      </section>

      {/* Button */}
      <ComponentSection
        id="button"
        title="Button"
        path="components/ui/button.tsx"
        description="다양한 변형(variant)과 크기(size)를 지원하는 버튼 컴포넌트입니다."
      >
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Variants</h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Sizes</h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon"><Check /></Button>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">States</h4>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Disabled</Button>
              <Button asChild>
                <Link href="#">As Link</Link>
              </Button>
            </div>
          </div>
        </div>
        <CodeBlock>{`import { Button } from "@/components/ui/button"

// 기본 사용
<Button>Click me</Button>

// 변형 적용
<Button variant="outline">Outline Button</Button>
<Button variant="destructive">Delete</Button>

// 크기 조절
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// 아이콘 버튼
<Button size="icon"><Check /></Button>

// Link로 사용
<Button asChild>
  <Link href="/path">Go to page</Link>
</Button>

// 둥근 버튼 (자주 사용하는 패턴)
<Button className="rounded-full">Rounded</Button>`}</CodeBlock>
      </ComponentSection>

      {/* Input */}
      <ComponentSection
        id="input"
        title="Input"
        path="components/ui/input.tsx"
        description="폼에서 사용하는 텍스트 입력 필드입니다. 라이트 모드 배경은 흰색(`--field`)입니다."
      >
        <div className="max-w-md space-y-4">
          <Input placeholder="기본 입력 필드" />
          <Input type="email" placeholder="이메일 입력" />
          <Input type="password" placeholder="비밀번호" />
          <Input disabled placeholder="비활성화됨" />
          <Input className="rounded-full" placeholder="둥근 입력 필드" />
        </div>
        <CodeBlock>{`import { Input } from "@/components/ui/input"

// 기본 사용
<Input placeholder="Enter text..." />

// 타입 지정
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />

// 비활성화
<Input disabled placeholder="Disabled" />

// 둥근 스타일 (검색 등에 사용)
<Input className="rounded-full" placeholder="Search..." />`}</CodeBlock>
      </ComponentSection>

      {/* Textarea */}
      <ComponentSection
        id="textarea"
        title="Textarea"
        path="components/ui/textarea.tsx"
        description="여러 줄의 텍스트를 입력받는 필드입니다. 라이트 모드 배경은 흰색(`--field`)입니다."
      >
        <div className="max-w-md">
          <Textarea placeholder="내용을 입력하세요..." rows={4} />
        </div>
        <CodeBlock>{`import { Textarea } from "@/components/ui/textarea"

<Textarea placeholder="Write something..." rows={4} />`}</CodeBlock>
      </ComponentSection>

      {/* Label */}
      <ComponentSection
        id="label"
        title="Label"
        path="components/ui/label.tsx"
        description="폼 필드의 라벨입니다."
      >
        <div className="max-w-md space-y-2">
          <Label htmlFor="demo-input">이메일 주소</Label>
          <Input id="demo-input" type="email" placeholder="example@email.com" />
        </div>
        <CodeBlock>{`import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

<div className="space-y-2">
  <Label htmlFor="email">이메일</Label>
  <Input id="email" type="email" />
</div>`}</CodeBlock>
      </ComponentSection>

      {/* Select */}
      <ComponentSection
        id="select"
        title="Select"
        path="components/ui/select.tsx"
        description="Radix UI 기반의 드롭다운 선택 컴포넌트입니다. 트리거 배경은 입력란과 같이 `--field`입니다."
      >
        <div className="flex flex-wrap gap-4">
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="옵션 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">옵션 1</SelectItem>
              <SelectItem value="option2">옵션 2</SelectItem>
              <SelectItem value="option3">옵션 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CodeBlock>{`import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="선택하세요" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">옵션 A</SelectItem>
    <SelectItem value="b">옵션 B</SelectItem>
  </SelectContent>
</Select>`}</CodeBlock>
      </ComponentSection>

      {/* CustomSelect */}
      <ComponentSection
        id="custom-select"
        title="CustomSelect"
        path="components/ui/custom-select.tsx"
        description="SSR 친화적인 네이티브 select 래퍼입니다. 폼에서 name/value 처리가 간편합니다."
      >
        <div className="flex flex-wrap gap-4">
          <CustomSelect
            name="category"
            defaultValue="all"
            options={[
              { value: "all", label: "전체" },
              { value: "tech", label: "기술" },
              { value: "design", label: "디자인" },
            ]}
            triggerClassName="h-10 rounded-full bg-field pl-4 pr-3 font-medium"
          />
        </div>
        <CodeBlock>{`import { CustomSelect } from "@/components/ui/custom-select"

// 폼에서 사용 (Server Action과 호환)
<CustomSelect
  name="category"
  defaultValue="all"
  options={[
    { value: "all", label: "전체" },
    { value: "tech", label: "기술" },
  ]}
  triggerClassName="h-10 rounded-full"
/>`}</CodeBlock>
      </ComponentSection>

      {/* Switch */}
      <ComponentSection
        id="switch"
        title="Switch"
        path="components/ui/switch.tsx"
        description="토글 스위치 컴포넌트입니다."
      >
        <div className="flex items-center gap-3">
          <Switch id="demo-switch" />
          <Label htmlFor="demo-switch">알림 받기</Label>
        </div>
        <CodeBlock>{`import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

<div className="flex items-center gap-3">
  <Switch id="notifications" />
  <Label htmlFor="notifications">알림 받기</Label>
</div>`}</CodeBlock>
      </ComponentSection>

      {/* Badge */}
      <ComponentSection
        id="badge"
        title="Badge"
        path="components/ui/badge.tsx"
        description="상태나 카테고리를 표시하는 작은 라벨입니다."
      >
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
        <CodeBlock>{`import { Badge } from "@/components/ui/badge"

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>`}</CodeBlock>
      </ComponentSection>

      {/* Card */}
      <ComponentSection
        id="card"
        title="Card"
        path="components/ui/card.tsx"
        description="콘텐츠를 그룹화하는 카드 컴포넌트입니다."
      >
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>카드 제목</CardTitle>
            <CardDescription>카드에 대한 설명이 여기에 들어갑니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              카드 본문 내용입니다. 다양한 콘텐츠를 담을 수 있습니다.
            </p>
          </CardContent>
        </Card>
        <CodeBlock>{`import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>
    <p>본문 내용</p>
  </CardContent>
</Card>`}</CodeBlock>
      </ComponentSection>

      {/* Skeleton */}
      <ComponentSection
        id="skeleton"
        title="Skeleton"
        path="components/ui/skeleton.tsx"
        description="로딩 상태를 표시하는 플레이스홀더입니다."
      >
        <div className="space-y-3">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <CodeBlock>{`import { Skeleton } from "@/components/ui/skeleton"

// 텍스트 로딩
<Skeleton className="h-4 w-[250px]" />

// 아바타 로딩
<Skeleton className="h-10 w-10 rounded-full" />

// 카드 로딩
<div className="space-y-3">
  <Skeleton className="h-[200px] w-full rounded-xl" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>`}</CodeBlock>
      </ComponentSection>

      {/* PageTitleBanner */}
      <ComponentSection
        id="page-title-banner"
        title="PageTitleBanner"
        path="components/layout/page-title-banner.tsx"
        description="페이지 상단 타이틀 배너입니다. 브레드크럼은 메뉴 DB의 1depth > 2depth를 현재 경로로 맞추고, 부연설명은 제목 밑줄 아래에 둡니다."
      >
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            이 페이지 상단의 배너가 PageTitleBanner 컴포넌트입니다.
          </p>
        </div>
        <CodeBlock>{`import { PageTitleBanner } from "@/components/layout/page-title-banner"

<PageTitleBanner
  title="페이지 제목"
  description="제목 밑줄 아래에 들어가는 부연설명입니다."
  breadcrumb={[
    { label: "하위 화면" },
  ]}
  actions={
    <Button>액션 버튼</Button>
  }
/>`}</CodeBlock>
      </ComponentSection>

      {/* ListPager */}
      <ComponentSection
        id="list-pager"
        title="ListPager"
        path="components/layout/list-pager.tsx"
        description="페이지네이션 컴포넌트입니다. PagedResult 타입과 함께 사용합니다."
      >
        <div className="rounded-xl border bg-muted/30 p-4">
          <ListPager
            pathname="/site/design-system/common"
            className="!mt-0"
            result={{ rows: [], total: 47, page: 2, pageSize: 10, pageCount: 5 }}
          />
        </div>
        <CodeBlock>{`import { ListPager } from "@/components/layout/list-pager"
import type { PagedResult } from "@/lib/pagination"

// 서버 컴포넌트에서 데이터 조회 후 사용
const result: PagedResult<Item> = await fetchItems({ page })

<ListPager
  pathname="/items"
  result={result}
  extraParams={{ category: "tech" }}
/>`}</CodeBlock>
      </ComponentSection>

      {/* Layout Components Overview */}
      <ComponentSection
        id="layout-overview"
        title="레이아웃 컴포넌트 개요"
        path="components/layout/"
        description="레이아웃 관련 주요 컴포넌트들입니다."
      >
        <div className="space-y-4">
          <ComponentListItem
            name="AppSidebar"
            path="components/layout/app-sidebar.tsx"
            desc="대시보드 좌측 사이드바 (관리자 네비게이션)"
          />
          <ComponentListItem
            name="PublicHeader"
            path="components/layout/public-header.tsx"
            desc="공개 페이지 상단 헤더"
          />
          <ComponentListItem
            name="PublicFooter"
            path="components/layout/public-footer.tsx"
            desc="공개 페이지 하단 푸터"
          />
          <ComponentListItem
            name="PublicShell"
            path="components/layout/public-shell.tsx"
            desc="공개 페이지 전체 레이아웃 래퍼"
          />
          <ComponentListItem
            name="DashboardHeader"
            path="components/layout/dashboard-header.tsx"
            desc="대시보드 상단 헤더 (모바일 메뉴 포함)"
          />
          <ComponentListItem
            name="ThemeToggle"
            path="components/layout/theme-toggle.tsx"
            desc="라이트/다크 테마 전환 버튼"
          />
          <ComponentListItem
            name="BrandMark"
            path="components/layout/brand-mark.tsx"
            desc="DevDeck 로고 컴포넌트"
          />
          <ComponentListItem
            name="CopyButton"
            path="components/layout/copy-button.tsx"
            desc="클립보드 복사 버튼"
          />
          <ComponentListItem
            name="ScrollToTop"
            path="components/layout/scroll-to-top.tsx"
            desc="페이지 상단으로 스크롤 버튼"
          />
        </div>
      </ComponentSection>

      {/* Color Tokens */}
      <ComponentSection
        id="colors"
        title="색상 토큰"
        path="app/globals.css"
        description="프로젝트에서 사용하는 CSS 변수 기반 색상 시스템입니다. 입력·에디터 본문은 `--field`(라이트: 흰색)를 씁니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorSwatch name="--background" label="Background" />
          <ColorSwatch name="--field" label="Field (입력·에디터)" />
          <ColorSwatch name="--primary" label="Primary" />
          <ColorSwatch name="--secondary" label="Secondary" />
          <ColorSwatch name="--muted" label="Muted" />
          <ColorSwatch name="--accent" label="Accent" />
          <ColorSwatch name="--destructive" label="Destructive" />
          <ColorSwatch name="--lux-champagne" label="Lux Champagne" />
          <ColorSwatch name="--lux-cognac" label="Lux Cognac" />
          <ColorSwatch name="--lux-espresso" label="Lux Espresso" />
        </div>
        <CodeBlock>{`/* 색상 변수 사용 예시 */
.custom-element {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--border));
}

/* 입력란·에디터 본문 (라이트: #fff) */
background: hsl(var(--field));

/* 럭셔리 팔레트 (배너 그라디언트 등) */
background: hsl(var(--lux-champagne));
background: hsl(var(--lux-cognac));
background: hsl(var(--lux-espresso));`}</CodeBlock>
      </ComponentSection>

      {/* Typography */}
      <ComponentSection
        id="typography"
        title="타이포그래피"
        path="app/globals.css"
        description="프로젝트의 폰트와 텍스트 스타일입니다."
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">font-display (제목용)</p>
            <h1 className="font-display text-3xl font-extrabold">DevDeck 디자인 시스템</h1>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">font-sans (본문용)</p>
            <p className="text-base">
              기본 본문 텍스트입니다. Pretendard 폰트를 사용합니다.
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">font-mono (코드용)</p>
            <code className="font-mono text-sm">const code = &quot;example&quot;</code>
          </div>
        </div>
        <CodeBlock>{`/* 제목 - font-display */
<h1 className="font-display text-3xl font-extrabold">제목</h1>

/* 본문 - 기본 폰트 */
<p className="text-base">본문 텍스트</p>

/* 코드 - font-mono */
<code className="font-mono text-sm">코드</code>

/* 작은 텍스트 + 뮤트 색상 */
<p className="text-sm text-muted-foreground">보조 텍스트</p>`}</CodeBlock>
      </ComponentSection>

      {/* Spacing & Layout */}
      <ComponentSection
        id="spacing"
        title="간격 및 레이아웃 패턴"
        path=""
        description="자주 사용하는 간격과 레이아웃 유틸리티입니다."
      >
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">반응형 그리드 (sm 2열 · lg 3열)</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <Card key={n}>
                  <CardHeader>
                    <CardTitle className="text-base">카드 {n}</CardTitle>
                    <CardDescription>화면 폭에 맞춰 열 수가 바뀝니다.</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">라운딩 단계</h4>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {[
                ["rounded-xl", "rounded-xl"],
                ["rounded-lg", "rounded-lg"],
                ["rounded-md", "rounded-md"],
                ["rounded-full", "rounded-full"],
              ].map(([cls, label]) => (
                <div key={cls} className={`flex size-20 items-center justify-center border bg-muted ${cls}`}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <CodeBlock>{`/* 페이지 컨테이너 */
<div className="w-full space-y-8">
  {/* 콘텐츠 */}
</div>

/* 섹션 간격 */
<section className="space-y-4">
  <h2>제목</h2>
  <p>내용</p>
</section>

/* Flex 레이아웃 */
<div className="flex items-center gap-3">
  <Button>버튼 1</Button>
  <Button>버튼 2</Button>
</div>

/* 반응형 그리드 */
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id} />)}
</div>

/* 카드/패널 라운딩 */
className="rounded-xl"  // 큰 요소 (카드, 배너)
className="rounded-lg"  // 중간 요소
className="rounded-md"  // 작은 요소 (버튼, 인풋)
className="rounded-full" // 원형 (아바타, pill 버튼)`}</CodeBlock>
      </ComponentSection>

      {/* Navigation */}
      <nav className="flex justify-center pt-8">
        <Button asChild size="lg" className="rounded-full">
          <Link href="/site/design-system/screens">
            화면영역 컴포넌트 보기
            <ChevronRight className="ml-1" />
          </Link>
        </Button>
      </nav>
    </div>
  )
}

function ComponentSection({
  id,
  title,
  path,
  description,
  children,
}: {
  id: string
  title: string
  path: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {path && (
          <code className="text-xs text-muted-foreground">{path}</code>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="rounded-xl border bg-white p-6 dark:bg-card">{children}</div>
    </section>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg bg-muted/50 p-4 text-xs">
      <code className="font-mono">{children}</code>
    </pre>
  )
}

function ColorSwatch({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-10 rounded-lg border shadow-sm"
        style={{ backgroundColor: `hsl(var(${name}))` }}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <code className="text-xs text-muted-foreground">var({name})</code>
      </div>
    </div>
  )
}

function ComponentListItem({
  name,
  path,
  desc,
}: {
  name: string
  path: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Badge variant="outline" className="shrink-0 font-mono">
        {name}
      </Badge>
      <div className="min-w-0">
        <code className="text-xs text-muted-foreground">{path}</code>
        <p className="text-sm">{desc}</p>
      </div>
    </div>
  )
}
