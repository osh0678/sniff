# sniff

제품명이나 쇼핑몰 링크를 넣으면 **리뷰 신뢰도 · 광고 주장 진위 · 성분 · 가격 대비 가치**를 웹에서 조사해 "살 만한가?"를 알려주는 서비스.

```
apps/
  mobile/   Expo (React Native) 앱 — 검색 화면, 분석 결과 화면
  api/      Hono API 서버 — Claude로 웹 조사 후 결과 생성
packages/
  core/     공유 zod 스키마, 입력 파싱, 점수 계산 로직
```

## 동작 방식

1. 앱이 `POST /v1/analyses { query }`로 분석을 요청하면 서버가 `pending` 잡을 만들고 바로 응답합니다.
2. 서버는 Claude(`claude-opus-5-5`)에 web search / web fetch 도구를 주고 조사를 맡깁니다.
   - 링크 입력: 상세페이지를 직접 읽어 광고 문구·전성분 확인
   - 리뷰: 협찬·체험단·조작 신호를 따로 표시
   - 광고: 화장품법·식품표시광고법·건강기능식품 기준으로 과장/허위 판정
3. Claude는 항목별 점수(0–100, 근거 부족 시 `null`)와 근거를 JSON으로 돌려주고, **종합 점수는 `@sniff/core`의 `computeVerdict`가 결정적으로 계산**합니다.
   - 가중치: 리뷰 · 광고 · 성분 · 가성비 · 근거 출처 신뢰도(커뮤니티 등 출처 다양성) — 자세한 비율과 계산 방식은 [점수 가중치 문서](docs/scoring-weights.md) 참고
   - 허위 광고나 고위험 성분이 있으면 60점 상한 → "추천"이 나올 수 없음
4. 앱은 `GET /v1/analyses/:id`를 3초마다 폴링해 결과를 보여줍니다. 같은 검색어는 24시간 동안 결과를 재사용합니다.

## 시작하기

```bash
pnpm install

# API 서버
cp apps/api/.env.example apps/api/.env   # ANTHROPIC_API_KEY 입력
pnpm dev:api                             # http://localhost:8787

# 앱 (다른 터미널)
pnpm dev:mobile                          # Expo Go / 시뮬레이터 / 웹(w)
```

개발 중에는 앱이 Metro를 띄운 컴퓨터의 `:8787`로 자동 연결합니다. 배포된 API를 쓰려면 `EXPO_PUBLIC_API_URL`을 설정하세요 (값을 바꾼 뒤에는 `expo start --clear`로 Metro 캐시를 비워야 반영됩니다).

## 디자인 시스템

"검사 보고서" 콘셉트. 토큰은 `apps/mobile/src/constants/theme.ts`에 있습니다.

- **색**: 차가운 무채색 바탕 + 코발트 포인트 1색(행동 요소 전용). 통과/주의/부적합/보류 4가지 판정 색은 판정에만 사용
- **글꼴**: IBM Plex Sans KR(본문), IBM Plex Mono(점수·검사 번호·출처 도메인)
- **모서리**: 패널 12, 컨트롤 10, 판정 도장 4
- **아이콘**: Phosphor (`src/components/icons.ts`에서 개별 경로로 import해 번들 크기 절약)
- 라이트/다크 모드 모두 지원, 로딩 스켈레톤은 모션 줄이기 설정을 따릅니다

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm test` | 모든 패키지 테스트 (vitest) |
| `pnpm typecheck` | 모든 패키지 타입 검사 |
| `pnpm build` | API 번들 (`apps/api/dist`) |
| `pnpm --filter @sniff/mobile lint` | 앱 lint |

## 현재 한계

- 잡 저장소와 rate limit이 **프로세스 메모리**에 있습니다. 서버를 재시작하면 결과가 사라지고, 여러 인스턴스로 띄우면 공유되지 않습니다 (`JobStore` 인터페이스를 Redis/Postgres로 교체).
- rate limit은 소켓 IP 기준입니다. 로드밸런서 뒤에 두면 신뢰할 수 있는 프록시 헤더로 바꿔야 합니다.
- 쿠팡 등 일부 쇼핑몰은 봇 접근을 막아 상세페이지를 못 읽을 수 있습니다. 이때는 검색 결과로만 분석합니다.
- 인증이 없습니다. 공개 배포 전에 사용자 인증 또는 앱 단위 키가 필요합니다.
