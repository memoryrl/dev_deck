# 08. 랜딩 히어로 3D 토폴로지 뷰

랜딩(`/`) 히어로에서 좌측 헤드라인·리드·CTA는 고정한다. 클래식은 히어로 전체 위에 카드 스택을 우측 하단에 얹고, 토폴로지는 같은 히어로 박스 전체를 3D 오피스로 채운다.

> **v2 개정**: 초판(아래 절 대부분)은 노드가 방사형으로 흩어진 "네트워크 그래프" + 자유 드래그 회전으로 설계했으나, 실제 구현 결과가 참고 이미지(45도 아이소메트릭 오피스에서 로봇이 일하는 장면)와 거리가 멀어 사용자 피드백에 따라 방향을 바꿨다. v2는 **PromptKit·CareerLog·Steam 모듈을 사무실 책상 3개로 표현**하고, **고정된 45도 아이소메트릭 카메라**에서 책상을 클릭하면 그 책상으로 확대되며 게시물 목록이 펼쳐지는 방식이다. 자유 드래그 회전과 노드-그래프 구조는 폐기한다. 아래 문서는 v2 기준으로 갱신했다.

## 1. 범위

**포함**

- 히어로 우측 상단 뷰 전환 스위치 (`components/ui/switch.tsx` 재사용)
- 풀블리드 3D 오피스 씬: 책상 3개(PromptKit/CareerLog/Steam), 각 책상마다 블록형 로우폴리 로봇 + 모듈을 상징하는 소품(컴퓨터/태블릿/게임기)
- 고정 45도 아이소메트릭 카메라 (자유 회전 없음) + 책상 클릭 시 해당 책상으로 카메라 확대(pan+zoom) 애니메이션
- 책상 클릭 시 화면 하단에 그 모듈의 최신 게시물 목록이 슬라이드업으로 펼쳐짐 (기존 `getHomeLandingData` 데이터 재사용)
- 뷰 선택 상태의 `localStorage` 기억
- WebGL 미지원·모바일 대응 폴백

**제외 (후속 과제)**

- 게시판(`/b/[slug]`) 글, 댓글까지 씬에 포함 — 이번엔 홈 랜딩이 이미 쓰는 3모듈(prompts/career/steam)로 한정
- 외부 3D 캐릭터/오피스 에셋(glTF) 도입 — 이번엔 three.js 기본 도형(box)만으로 블록형 로봇·가구를 구성. 참고 이미지 수준의 사실적인 렌더는 별도 에셋 파이프라인이 필요하므로 범위 밖
- 로봇 애니메이션 고도화(타이핑 모션, 표정 등) — 이번엔 유휴 시 미세한 bob(상하 움직임)만
- 사용자가 씬 배치·색을 커스터마이즈하는 설정 UI

## 2. UX 흐름

```text
[클래식]
┌──────────────────────────────────────────────────┐
│ Personal Developer Hub              (카드 스택)   │ ← 카드는 우측 하단
│ 프롬프트, 커리어, 게임을…              PromptKit   │
│ CTA 버튼들 (고정)                     CareerLog   │
│                                      Steam        │
└──────────────────────────────────────────────────┘
         좌우 화살표 · 드래그
[토폴로지 — 같은 히어로 박스 전체]
┌──────────────────────────────────────────────────┐
│              3D 오피스 (풀 히어로)                 │
│         책상+로봇 …  카피는 좌측에 유지            │
└──────────────────────────────────────────────────┘
```

- 기본값은 **항상 클래식 카드**. 선택은 `localStorage`(`devdeck:landing-hero-view`)에 저장해 재방문 시 복원한다. 서버 렌더는 항상 카드이고, 클라이언트 mount 후에만 저장된 토폴로지로 넘긴다.
- 좌측 헤드라인·리드·CTA는 슬라이드와 무관하게 그 자리에 둔다. 바뀌는 것은 히어로를 채우는 비주얼이다. 카드는 우측 하단 오버레이, 토폴로지는 히어로 전체.

## 3. 콘텐츠 → 오피스 매핑

`getHomeLandingData()`가 이미 홈 랜딩 하단 섹션용으로 prompts(6)·posts(6)·steam.recentGames(5)를 서버에서 가져온다. 오피스 씬은 이 호출을 **재사용**하고(중복 Supabase 호출 금지), 각 모듈당 최신 3건만 하단 슬라이드업 패널에 노출한다.

```text
책상 1 — PromptKit  (컴퓨터 모니터 소품, Gold 포인트)  → prompts[0..2]
책상 2 — CareerLog  (태블릿 소품, Umber 포인트)        → posts[0..2]
책상 3 — Steam      (게임기/가방 소품, Ink 포인트)      → steam.recentGames[0..2]
```

- `lib/landing/topology.ts`의 `TopologyData`(허브 없이 `modules: TopologyModuleNode[]` 3개, 각 모듈이 `items: TopologyItemNode[]` 최대 3개) 구조는 v1과 동일하게 재사용한다 — 바뀐 것은 이 데이터를 **그래프 노드가 아니라 책상 3개**로 그린다는 시각화 방식뿐이다.
- 책상 위치는 x축으로 3.4 유닛씩 떨어진 일렬 배치(왼쪽부터 PromptKit·CareerLog·Steam).
- 책상을 클릭하면 그 모듈의 `items`가 화면 하단 패널에 나열되고, 항목 클릭 시 실제 상세 페이지로 이동.

## 4. 3D 렌더링 기술 (결정 완료: three.js + R3F)

현재 프로젝트에 3D/애니메이션 라이브러리가 전혀 없었다(설치 전 `package.json` 기준). **three.js + `@react-three/fiber` + `@react-three/drei` 조합으로 확정**하고 이미 설치했다.

- 외부 3D 에셋(glTF 모델) 없이 진짜 3D 원근/라이팅으로 입체감을 낸다.
- 번들 영향: 세 패키지 합쳐 gzip 기준 대략 150~200KB. **`next/dynamic`으로 `ssr: false` + 코드 스플릿**하고, 스위치를 켰을 때만 로드되도록 해 초기 랜딩 로드에는 영향 없게 한다.
- v1에서 검토했던 순수 CSS 3D 대안은 기각 상태를 유지한다 — 아이소메트릭 오피스처럼 여러 오브젝트가 겹치는 장면에서는 진짜 카메라/라이팅 없이는 입체감을 내기 어렵다.

## 5. 컴포넌트/파일 구조

```text
components/landing/hero-topology/
  hero-view-switch.tsx    # 스위치 + localStorage 상태 관리 (client)
  topology-panel.tsx       # 풀블리드 캔버스 + 하단 슬라이드업 게시물 패널 (client)
  topology-scene.tsx        # react-three-fiber Canvas, 고정 아이소메트릭 카메라 리그 (client, dynamic import)
  topology-desk.tsx          # 책상 1개 조립(상판+다리+소품+로봇+클릭 히트박스+라벨)
  topology-robot.tsx          # 블록형 로우폴리 로봇 (box geometry만 사용, 유휴 bob 애니메이션)
  topology-side-list.tsx       # v1에서 쓰던 좌우 리스트 — v2에서는 더 이상 렌더링하지 않음(미사용, 삭제하지 않고 보존)

app/(home)/page.tsx          # HomeHero를 클래식/토폴로지 스위처로 감싸도록 수정
lib/landing/topology.ts       # getHomeLandingData() 결과 → 모듈/아이템 데이터로 변환하는 순수 함수 (v1과 동일)
```

- `HomePage`는 여전히 서버 컴포넌트. 히어로 전용 `Suspense` 경계 안에서 `getHomeLandingData()`를 호출해 `HeroSection`(client)에 넘긴다 — 하단 섹션(`HomeLanding`)과는 별도 Suspense라 히어로 카피는 즉시 페인트되고, 두 호출은 React `cache()`로 중복 없이 공유된다.
- `topology-scene.tsx`는 `next/dynamic(() => import(...), { ssr: false })`로만 로드 — three.js가 서버 번들에 섞이지 않게.

## 6. 인터랙션 디테일

- **카메라**: 기본 시점은 45도 아이소메트릭. **왼쪽 드래그로 궤도 회전**, 휠로 줌, 오른쪽 드래그로 팬. 로봇/책상을 클릭하면 카메라가 그 로봇 **정면**으로 붙고 줌인이 된다. 바닥 아래로 뒤집히지 않게 polar angle을 제한한다. 같은 책상을 다시 클릭하거나 빈 곳을 클릭하면 원점 복귀.
- **클릭**: 각 책상은 부품 하나하나에 클릭 핸들러를 붙이지 않고, 책상 전체를 덮는 투명 히트박스 메시 하나로 클릭을 받는다(three.js는 `visible={false}`여도 레이캐스트를 통과시킨다). 선택 시 로봇이 모니터를 보던 자세에서 사용자를 향해 돌아보고, 발밑 링·수평 헤일로와 만화 말풍선(`landing.robotGuide`)이 뜬다.
- **콘텐츠 패널**: 책상 선택 시 하단 **좌측(PromptKit) 또는 우측(CareerLog·Steam)** 에 카드가 수면에서 떠오르듯 올라온다(오버슈트 후 미세한 bob). 모듈 틴트에 맞춘 글래스 카드이며, 캔버스 밖 DOM 오버레이다.
- **로봇 유휴 모션**: 평소에는 모니터를 보고 미세하게 bob한다. 선택되면 사용자를 향해 돌고, 머리 위에 만화 말풍선이 팝한다. 걷기·타이핑 같은 정교한 리깅 애니메이션은 하지 않는다.
- **터치 디바이스**: 모바일은 8절 결정대로 스위치 자체가 숨겨지므로 해당 없음.

## 7. 시각 스타일

- 씬 배경은 투명 처리해 히어로의 기존 그라디언트 배경 위에 캔버스가 얹히도록 한다.
- 책상 소품 색은 모듈 틴트를 따른다. 로봇 몸통(glTF `Main`/`Grey`/`Black`)은 espresso 검정 대신, 책상마다 다른 고정 팔레트 색을 입혀 서로 구분되게 한다.
- 로봇·가구는 전부 `boxGeometry` 조합(몸통·머리·팔·다리, 책상 상판·다리)으로 만든 블록형 로우폴리 스타일. 참고 이미지 수준의 사실적인 캐릭터는 glTF 에셋 없이는 낼 수 없는 결과이므로, 대신 "미니멀하고 귀여운 블록 로봇"을 목표로 한다.
- 바닥은 단색 평면(`#efe6d8`) 하나로 오피스 바닥을 암시한다.
- 라이팅: `ambientLight` + `directionalLight` 2개(주광+보조광)로 박스 엣지에 미세한 음영만 준다.
- 책상 위 모듈 이름표는 drei `<Html>`로 오버레이.

## 8. 성능·접근성

- **WebGL 미지원 폴백**: 구형 브라우저/일부 웹뷰는 WebGL 컨텍스트 생성이 실패할 수 있다. `topology-scene.tsx`에서 캔버스 생성 실패를 감지하면 스위치를 비활성화하고 클래식 뷰로 강제 — 에러 바운더리로 처리(후속 작업 — 아직 미구현).
- **`prefers-reduced-motion`**: 로봇 유휴 bob과 카메라 확대 트랜지션은 진폭이 작아 별도 감쇠 없이 유지한다. 자유 드래그 회전이 없어졌으므로 v1에서 문제였던 "자동 회전 끄기" 이슈 자체가 사라졌다.
- **모바일(`md` 미만) 노출 여부 (결정 완료)**: three.js 인터랙션의 저사양 GPU·배터리 부담 때문에 **모바일에서는 스위치 자체를 숨기고 항상 클래식 히어로만 표시**한다. 데스크톱(`md` 이상)에서만 스위치가 나타난다.
- **번들/로드**: 반드시 동적 임포트(`next/dynamic`, `ssr: false`) + 스위치 ON 시에만 로드. 최초 랜딩 로드(LCP)에 영향 없어야 한다.

## 9. 구현 체크리스트

1. `docs/08-landing-topology.md` v2 확정 (이 문서)
2. `package.json`에 `three` + `@react-three/fiber` + `@react-three/drei` 추가 — 완료
3. `lib/landing/topology.ts` — `HomeLandingData` → 모듈/아이템 변환 함수 — 완료 (v1과 동일)
4. `app/(home)/page.tsx` — 히어로 전용 Suspense + 스위처 컴포넌트 — 완료
5. `components/landing/hero-topology/hero-view-switch.tsx` — 스위치 + localStorage — 완료
6. `components/landing/hero-topology/topology-scene.tsx` — 고정 아이소메트릭 카메라 리그 — 완료
7. `components/landing/hero-topology/topology-desk.tsx` / `topology-robot.tsx` — 책상·로봇 조립 — 완료
8. `components/landing/hero-topology/topology-panel.tsx` — 하단 슬라이드업 콘텐츠 패널 — 완료
9. WebGL 미지원 폴백 — **미구현** (다음 반복 과제)
10. 실제 Chrome에서 책상 클릭 → 카메라 확대 → 패널 표시 → 항목 이동까지 수동 검증 — **사용자 확인 필요** (에이전트 세션에 브라우저 도구 없음)

## 10. 후속 과제 (이번 범위 밖)

- 게시판(`/b/[slug]`) 콘텐츠까지 씬에 포함
- glTF 등 외부 3D 에셋으로 교체해 캐릭터·가구 품질 향상
- WebGL 컨텍스트 생성 실패 시 자동으로 클래식 뷰로 폴백하는 에러 바운더리
- 모바일 전용 축소 레이아웃
- 로봇 애니메이션 고도화(타이핑, 걷기 등)
