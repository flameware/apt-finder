/**
 * Geocode apartments using Kakao Local Search API (keyword search)
 * Input:  scripts/data/apartments-raw.json
 * Output: scripts/data/apartments-raw.json (updated in-place with lat/lng)
 *
 * Run: bun run scripts/geocode-apartments.ts
 * Requires: KAKAO_REST_API_KEY in .env.local
 *
 * Kakao Local Search: searches by place name → returns coordinates
 * Free tier: 300,000 req/day
 * Rate limit: ~10 req/s → 110ms delay
 * Resume-safe: skips apartments that already have lat/lng
 */

import { readFile, writeFile } from "fs/promises";
import path from "path";

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
if (!KAKAO_KEY) {
  console.error("ERROR: KAKAO_REST_API_KEY not set in .env.local");
  process.exit(1);
}

const KAKAO_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const FILE_PATH = path.join(process.cwd(), "scripts", "data", "apartments-raw.json");
const SAVE_INTERVAL = 200;

interface RawApartment {
  id: string;
  name: string;
  address: string;
  sigungu: string;
  lat: number | null;
  lng: number | null;
  needsGeocoding: boolean;
}

async function search(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${KAKAO_URL}?query=${encodeURIComponent(query)}&size=1`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;
  const json = await res.json();
  const docs = json?.documents ?? [];
  if (docs.length === 0) return null;

  return {
    lat: parseFloat(docs[0].y),
    lng: parseFloat(docs[0].x),
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function main() {
  const apartments: RawApartment[] = JSON.parse(await readFile(FILE_PATH, "utf-8"));

  const todo = apartments.filter((a) => !a.lat || !a.lng);
  const done = apartments.length - todo.length;

  console.log(`Total: ${apartments.length}, Already geocoded: ${done}, Todo: ${todo.length}`);
  if (todo.length === 0) {
    console.log("All apartments already geocoded!");
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < todo.length; i++) {
    const apt = todo[i];
    process.stdout.write(`\r  ${i + 1}/${todo.length} | ✓${succeeded} ✗${failed} | ${apt.name.slice(0, 15).padEnd(15)}`);

    // Try 1: 아파트명 + 시군구 (most specific)
    let result = await search(`${apt.name} ${apt.sigungu}`);

    // Try 2: 아파트명 + 주소
    if (!result) result = await search(`${apt.name} ${apt.address}`);

    // Try 3: 아파트명만
    if (!result) result = await search(apt.name);

    if (result) {
      apt.lat = result.lat;
      apt.lng = result.lng;
      apt.needsGeocoding = false;
      succeeded++;
    } else {
      failed++;
    }

    if ((i + 1) % SAVE_INTERVAL === 0) {
      await writeFile(FILE_PATH, JSON.stringify(apartments, null, 2));
      process.stdout.write(` [저장]`);
    }

    await sleep(110);
  }

  await writeFile(FILE_PATH, JSON.stringify(apartments, null, 2));

  console.log(`\n\nDone! ✓${succeeded} geocoded, ✗${failed} failed`);
  console.log(`Success rate: ${Math.round(succeeded / todo.length * 100)}%`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
