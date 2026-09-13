# DevDeck

AI 프롬프트(PromptKit), 회사 참여 개발·스킬 정리(CareerLog), Steam 라이브러리/리뷰(Steam Tracker)를 한 대시보드에 묶는 1인 개발·포트폴리오 허브.

- 저장소: [github.com/memoryrl/dev_deck](https://github.com/memoryrl/dev_deck) (Public)
- 용도: 대외 포트폴리오. 시크릿·개인 API 키·비공개 회고는 커밋하지 않는다.

현재는 **설계 단계**다. 구현은 `docs/`를 단일 소스로 진행한다.

## 설계문서

읽는 순서와 핵심 결정은 [docs/README.md](./docs/README.md)를 본다.

| 문서 | 내용 |
| --- | --- |
| [docs/01-prd.md](./docs/01-prd.md) | 제품 범위, MVP / 비범위 |
| [docs/02-architecture.md](./docs/02-architecture.md) | 스택, 폴더, 인증·데이터 흐름 |
| [docs/03-database.md](./docs/03-database.md) | 스키마, RLS, 트리거 |
| [docs/04-api.md](./docs/04-api.md) | Steam 프록시, Server Actions |
| [docs/05-ui.md](./docs/05-ui.md) | 라우트, 화면 상태, 컴포넌트 |
| [docs/06-implementation.md](./docs/06-implementation.md) | 구현 단계, 검증, Agent 프롬프트 |
