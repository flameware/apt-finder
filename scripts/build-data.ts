/**
 * Orchestrator: runs all data pipeline steps in sequence.
 *
 * Run: bun run scripts/build-data.ts
 *
 * Steps:
 * 1. fetch-nature.ts        → public/data/nature.geojson
 * 2. fetch-apartments.ts    → scripts/data/apartments-raw.json  (lat/lng = null)
 * 3. geocode-apartments.ts  → scripts/data/apartments-raw.json  (lat/lng filled via Kakao API)
 * 4. calc-facing-batch.ts   → scripts/data/apartments-enriched.json  (facing via OSM MBR)
 * 5. calc-distances.ts      → src/data/apartments.json
 */

import { readFile, stat } from "fs/promises";
import path from "path";

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function validate(
  filePath: string,
  opts: { minItems?: number; isGeoJSON?: boolean }
) {
  if (!(await fileExists(filePath))) {
    throw new Error(`Validation failed: ${filePath} does not exist`);
  }
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content);

  if (opts.isGeoJSON) {
    const count = parsed.features?.length ?? 0;
    if (opts.minItems && count < opts.minItems) {
      throw new Error(
        `Validation failed: ${filePath} has only ${count} features (expected >= ${opts.minItems})`
      );
    }
    console.log(`  ✓ ${path.basename(filePath)}: ${count} features`);
  } else {
    const count = Array.isArray(parsed) ? parsed.length : 0;
    if (opts.minItems && count < opts.minItems) {
      throw new Error(
        `Validation failed: ${filePath} has only ${count} items (expected >= ${opts.minItems})`
      );
    }
    console.log(`  ✓ ${path.basename(filePath)}: ${count} items`);
  }
}

async function main() {
  const startTime = Date.now();
  console.log("=== 숲뷰 아파트 데이터 파이프라인 시작 ===\n");

  // Step 1: Fetch nature data
  console.log("Step 1/4: Fetching nature data from Overpass API...");
  const { run: runFetchNature } = await import("./fetch-nature");
  await runFetchNature();
  await validate("public/data/nature.geojson", {
    isGeoJSON: true,
    minItems: 100,
  });

  // Step 2: Fetch apartments
  console.log("\nStep 2/5: Fetching apartments from 국토교통부 API...");
  const { run: runFetchApartments } = await import("./fetch-apartments");
  await runFetchApartments();
  await validate("scripts/data/apartments-raw.json", { minItems: 1000 });

  // Step 3: Geocode apartments (Kakao Local Search API)
  console.log("\nStep 3/5: Geocoding apartments via Kakao Local Search API...");
  console.log("  Requires: KAKAO_REST_API_KEY in .env.local");
  console.log("  Rate limit: ~110ms/req → ~20 min for full dataset. Resume-safe.\n");
  const { main: runGeocode } = await import("./geocode-apartments");
  await runGeocode();
  await validate("scripts/data/apartments-raw.json", { minItems: 1000 });

  // Step 4: Calculate building facing (batched by district)
  console.log("\nStep 4/5: Estimating building facing directions (OSM MBR, district-batched)...");
  console.log("  Batches by sigungu (~81 queries vs 9,589). Expected time: ~10 minutes.\n");
  const { run: runFetchFacing } = await import("./calc-facing-batch");
  await runFetchFacing();
  await validate("scripts/data/apartments-enriched.json", { minItems: 1000 });

  // Step 5: Calculate distances
  console.log("\nStep 5/5: Calculating nature proximity distances...");
  const { run: runCalcDistances } = await import("./calc-distances");
  await runCalcDistances();
  await validate("src/data/apartments.json", { minItems: 100 });

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== 완료! 총 소요 시간: ${elapsed}초 ===`);
  console.log("\n다음 단계: bun dev 으로 개발 서버 시작 후 http://localhost:3000 확인");
}

main().catch((err) => {
  console.error("\n파이프라인 오류:", err.message);
  process.exit(1);
});
