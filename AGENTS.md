<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 데이터 파이프라인

전체 실행: `bun run data:build`

| Step | Script | 명령 | 출력 | 비고 |
|------|--------|------|------|------|
| 1 | `fetch-nature.ts` | `bun run data:nature` | `public/data/nature.geojson` | Overpass API (OSM 자연지물) |
| 2 | `fetch-apartments.ts` | `bun run data:apartments` | `scripts/data/apartments-raw.json` | 국토교통부 API, 좌표 없음 |
| 3 | `geocode-apartments.ts` | `bun run data:geocode` | `apartments-raw.json` (in-place) | Kakao Local Search API, `KAKAO_REST_API_KEY` 필요, ~20분, resume-safe |
| 4 | `calc-facing-batch.ts` | `bun run data:facing` | `scripts/data/apartments-enriched.json` | Overpass API, 구 단위 배치 (~81 req), `facing` 필드 채움 |
| 5 | `calc-distances.ts` | `bun run data:distances` | `src/data/apartments.json` | 자연지물 거리/방위 계산, 최종 서비스 데이터 |

### 환경변수 (`.env.local`)
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` — 지도 렌더링
- `NAVER_MAP_CLIENT_SECRET` — 서버사이드 (미사용 중)
- `DATA_API_KEY` — 국토교통부 API (Step 2)
- `KAKAO_REST_API_KEY` — Kakao 지오코딩 (Step 3)
