/**
 * Step 2: Fetch apartment list from 국토교통부 공동주택 단지 목록 API
 * Output: scripts/data/apartments-raw.json
 *
 * Run: bun run scripts/fetch-apartments.ts
 * Requires: DATA_API_KEY in .env.local
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "scripts", "data");
const BASE_URL =
  "https://apis.data.go.kr/1613000/AptListService3/getTotalAptList3";

// Load env
const API_KEY = process.env.DATA_API_KEY;
if (!API_KEY) {
  console.error("ERROR: DATA_API_KEY not set in .env.local");
  process.exit(1);
}

interface RawApartment {
  id: string;
  name: string;
  address: string;
  sigungu: string;
  lat: number | null;
  lng: number | null;
  needsGeocoding: boolean;
}

async function fetchPage(
  pageNo: number
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ items: any[]; totalCount: number }> {
  const params = new URLSearchParams({
    numOfRows: "1000",
    pageNo: String(pageNo),
    _type: "json",
  });

  const url = `${BASE_URL}?serviceKey=${API_KEY}&${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${pageNo}`);

  const json = await res.json();
  const body = json?.response?.body;
  if (!body) throw new Error(`Unexpected API response on page ${pageNo}`);

  // v3 API returns items as a direct array (not wrapped in .item)
  const raw = body.items;
  const items: unknown[] = Array.isArray(raw) ? raw : raw?.item ? (Array.isArray(raw.item) ? raw.item : [raw.item]) : [];
  const totalCount = Number(body.totalCount ?? 0);
  return { items, totalCount };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Seoul metro area sido names for filtering
const METRO_SIDO = ["서울특별시", "경기도", "인천광역시"];

export async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const allApartments = new Map<string, RawApartment>();
  let pageNo = 1;
  let totalCount = 0;

  console.log("  Fetching page 1 to get total count...");
  const first = await fetchPage(1);
  totalCount = first.totalCount;
  const totalPages = Math.ceil(totalCount / 1000);
  console.log(`  Total apartments (전국): ${totalCount}, Pages: ${totalPages}`);

  // Process first page
  for (const item of first.items) {
    processItem(item, allApartments);
  }

  // Fetch remaining pages
  for (pageNo = 2; pageNo <= totalPages; pageNo++) {
    process.stdout.write(`\r  Page ${pageNo}/${totalPages} (수도권 누적: ${allApartments.size}개)`);
    try {
      const { items } = await fetchPage(pageNo);
      for (const item of items) {
        processItem(item, allApartments);
      }
    } catch (err) {
      console.error(`\n  ERROR on page ${pageNo}:`, err);
    }
    await sleep(100);
  }

  const results = Array.from(allApartments.values());
  const outputPath = path.join(OUTPUT_DIR, "apartments-raw.json");
  await writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n\nTotal (수도권): ${results.length} apartments`);
  console.log(`All need geocoding via Naver API (v3 API has no coordinates)`);
  console.log(`Written to: ${outputPath}`);
}

function processItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  map: Map<string, RawApartment>
) {
  const id = String(item.kaptCode ?? "");
  if (!id || map.has(id)) return;

  const sido = String(item.as1 ?? "");
  if (!METRO_SIDO.includes(sido)) return; // 수도권만 포함

  const sigungu = `${sido.replace("특별시", "").replace("광역시", "").replace("도", "")} ${item.as2 ?? ""}`.trim();
  const dong = String(item.as3 ?? "");
  const address = [sido, item.as2, dong].filter(Boolean).join(" ");

  map.set(id, {
    id,
    name: String(item.kaptName ?? ""),
    address,
    sigungu,
    lat: null,
    lng: null,
    needsGeocoding: true,
  });
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
