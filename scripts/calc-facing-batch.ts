/**
 * Step 3 (optimized): Estimate building facing direction using OSM building polygons + MBR
 * Batches by sigungu (administrative district) to reduce API calls from ~9,589 to ~81.
 *
 * Input:  scripts/data/apartments-raw.json
 * Output: scripts/data/apartments-enriched.json
 *
 * Run: bun run scripts/calc-facing-batch.ts
 */

import { readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import * as turf from "@turf/turf";
import RBush from "rbush";
import type { Feature, Polygon } from "geojson";
import { computeFacingFromPolygon } from "../src/lib/geo";
import type { FacingDirection } from "../src/types/index";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const CACHE_DIR = path.join(process.cwd(), "scripts", "data", "buildings-cache");
const MATCH_RADIUS_DEG = 0.003; // ~300m — candidate building search radius
const BBOX_BUFFER_DEG = 0.01;   // ~1km buffer around district bounding box
const BASE_DELAY_MS = 3000;     // minimum pause between district queries
const RETRY_429_DELAY_MS = 60000; // wait 60s on rate-limit before retry
const RETRY_504_DELAY_MS = 15000; // wait 15s on timeout before retry
const MAX_RETRIES = 3;

interface RawApartment {
  id: string;
  name: string;
  address: string;
  sigungu: string;
  lat: number | null;
  lng: number | null;
  needsGeocoding: boolean;
}

interface EnrichedApartment extends RawApartment {
  facing: FacingDirection | null;
  facingConfidence: "mbr" | "none";
}

interface BuildingRecord {
  polygon: Feature<Polygon>;
  name: string;
  nameNorm: string; // normalized (no spaces/special chars, lowercase) for matching
  centroidLng: number;
  centroidLat: number;
}

interface RBushItem {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  buildingIdx: number;
}

async function fetchBuildingsInBbox(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number
): Promise<BuildingRecord[]> {
  const query = `
[out:json][timeout:60][maxsize:134217728];
(
  way["building"]["name"](${minLat},${minLng},${maxLat},${maxLng});
  way["building:levels"]["name"](${minLat},${minLng},${maxLat},${maxLng});
);
out body;
>;
out skel qt;`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(OVERPASS_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(90000),
      });

      if (res.status === 429) {
        process.stdout.write(`\n  429 rate-limited, waiting ${RETRY_429_DELAY_MS / 1000}s before retry ${attempt}/${MAX_RETRIES}...`);
        await sleep(RETRY_429_DELAY_MS);
        continue;
      }

      if (res.status === 504) {
        process.stdout.write(`\n  504 timeout, waiting ${RETRY_504_DELAY_MS / 1000}s before retry ${attempt}/${MAX_RETRIES}...`);
        await sleep(RETRY_504_DELAY_MS);
        continue;
      }

      if (!res.ok) {
        process.stdout.write(`\n  Overpass HTTP ${res.status}, skipping`);
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as { elements: any[] };
      const elements = json.elements ?? [];

      // Build node coordinate map
      const nodes = new Map<number, [number, number]>();
      for (const el of elements) {
        if (el.type === "node") nodes.set(el.id, [el.lon, el.lat]);
      }

      const buildings: BuildingRecord[] = [];
      for (const el of elements) {
        if (el.type !== "way" || !el.nodes || !el.tags?.name) continue;

        const coords = (el.nodes as number[])
          .map((nid) => nodes.get(nid))
          .filter(Boolean) as [number, number][];

        if (coords.length < 4) continue;

        try {
          const polygon = turf.polygon([coords]);
          const centroid = turf.centroid(polygon);
          const name: string = el.tags.name;
          buildings.push({
            polygon,
            name,
            nameNorm: normName(name),
            centroidLng: centroid.geometry.coordinates[0],
            centroidLat: centroid.geometry.coordinates[1],
          });
        } catch {
          // invalid polygon geometry, skip
        }
      }

      return buildings;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        process.stdout.write(`\n  Network error (attempt ${attempt}), retrying...`);
        await sleep(RETRY_504_DELAY_MS);
      } else {
        process.stdout.write(`\n  Overpass failed after ${MAX_RETRIES} attempts: ${err}`);
      }
    }
  }

  return [];
}

const STRIP_SUFFIXES = ["아파트먼트", "아파트", "단지", "apt"];

/** Normalize: remove spaces, lowercase, strip common apartment suffixes */
function normName(name: string): string {
  let n = name.replace(/\s+/g, "").toLowerCase();
  for (const s of STRIP_SUFFIXES) {
    if (n.endsWith(s)) { n = n.slice(0, -s.length); break; }
  }
  return n;
}

/** Strip trailing unit indicators: "경희궁자이3" → "경희궁자이" */
function stripUnit(s: string): string {
  return s.replace(/\d+(단지|차|동)?$/, "");
}

/** Check if building name matches apartment name */
function nameMatches(aptNorm: string, buildingNorm: string): boolean {
  const aptKey = stripUnit(aptNorm).slice(0, 8);
  const buildKey = stripUnit(buildingNorm).slice(0, 8);
  if (aptKey.length < 4) return aptKey === buildKey; // short names: exact match only
  return buildingNorm.includes(aptKey) || aptNorm.includes(buildKey);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cacheKey(sigungu: string): string {
  return path.join(CACHE_DIR, sigungu.replace(/\s+/g, "_") + ".json");
}

async function readBuildingCache(sigungu: string): Promise<BuildingRecord[] | null> {
  try {
    await stat(cacheKey(sigungu));
    const data = await readFile(cacheKey(sigungu), "utf-8");
    return JSON.parse(data) as BuildingRecord[];
  } catch {
    return null;
  }
}

async function writeBuildingCache(sigungu: string, buildings: BuildingRecord[]): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cacheKey(sigungu), JSON.stringify(buildings));
}

export async function run() {
  const inputPath = path.join(process.cwd(), "scripts", "data", "apartments-raw.json");
  const outputPath = path.join(process.cwd(), "scripts", "data", "apartments-enriched.json");

  const raw: RawApartment[] = JSON.parse(await readFile(inputPath, "utf-8"));
  console.log(`Loaded ${raw.length} apartments`);

  // Separate apartments with/without coordinates, group by district
  const byDistrict = new Map<string, RawApartment[]>();
  const noCoords: RawApartment[] = [];

  for (const apt of raw) {
    if (!apt.lat || !apt.lng) {
      noCoords.push(apt);
    } else {
      const group = byDistrict.get(apt.sigungu) ?? [];
      group.push(apt);
      byDistrict.set(apt.sigungu, group);
    }
  }

  console.log(`Districts: ${byDistrict.size}, no-coords: ${noCoords.length}`);

  // Map from apartment id → enriched result (preserves order at the end)
  const resultsMap = new Map<string, EnrichedApartment>();
  for (const apt of noCoords) {
    resultsMap.set(apt.id, { ...apt, facing: null, facingConfidence: "none" });
  }

  let districtIdx = 0;
  let totalWithFacing = 0;
  let totalWithoutFacing = 0;

  for (const [sigungu, apts] of byDistrict) {
    districtIdx++;

    // Bounding box of all apartments in this district
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    for (const apt of apts) {
      minLat = Math.min(minLat, apt.lat!);
      maxLat = Math.max(maxLat, apt.lat!);
      minLng = Math.min(minLng, apt.lng!);
      maxLng = Math.max(maxLng, apt.lng!);
    }

    const cached = await readBuildingCache(sigungu);
    let buildings: BuildingRecord[];

    if (cached) {
      buildings = cached;
      process.stdout.write(
        `\r[${districtIdx}/${byDistrict.size}] ${sigungu} (${apts.length} apts): ${buildings.length} buildings (cached)   `
      );
    } else {
      process.stdout.write(
        `\r[${districtIdx}/${byDistrict.size}] ${sigungu} (${apts.length} apts): fetching buildings...    `
      );

      if (districtIdx > 1) await sleep(BASE_DELAY_MS);

      buildings = await fetchBuildingsInBbox(
        minLat - BBOX_BUFFER_DEG,
        minLng - BBOX_BUFFER_DEG,
        maxLat + BBOX_BUFFER_DEG,
        maxLng + BBOX_BUFFER_DEG
      );

      await writeBuildingCache(sigungu, buildings);
    }

    // Build R-tree spatial index over building centroids
    const tree = new RBush<RBushItem>();
    const items: RBushItem[] = buildings.map((b, buildingIdx) => ({
      minX: b.centroidLng - MATCH_RADIUS_DEG,
      maxX: b.centroidLng + MATCH_RADIUS_DEG,
      minY: b.centroidLat - MATCH_RADIUS_DEG,
      maxY: b.centroidLat + MATCH_RADIUS_DEG,
      buildingIdx,
    }));
    tree.load(items);

    let districtWithFacing = 0;

    for (const apt of apts) {
      const aptLng = apt.lng!;
      const aptLat = apt.lat!;
      const aptNorm = normName(apt.name);

      // Candidate buildings within ~300m
      const candidates = tree.search({
        minX: aptLng - MATCH_RADIUS_DEG,
        maxX: aptLng + MATCH_RADIUS_DEG,
        minY: aptLat - MATCH_RADIUS_DEG,
        maxY: aptLat + MATCH_RADIUS_DEG,
      });

      // Filter by name match
      const matching = candidates
        .map((c) => buildings[c.buildingIdx])
        .filter((b): b is BuildingRecord => b !== undefined)
        .filter((b) => nameMatches(aptNorm, b.nameNorm));

      if (matching.length === 0) {
        // Fallback: largest building within 200m (no name requirement), area > 500m²
        const FALLBACK_RADIUS = 0.002; // ~200m
        const fallbackCandidates = tree.search({
          minX: aptLng - FALLBACK_RADIUS,
          maxX: aptLng + FALLBACK_RADIUS,
          minY: aptLat - FALLBACK_RADIUS,
          maxY: aptLat + FALLBACK_RADIUS,
        });

        const largest = fallbackCandidates
          .map((c) => buildings[c.buildingIdx])
          .filter((b): b is BuildingRecord => b !== undefined)
          .reduce<{ building: BuildingRecord; area: number } | null>((best, b) => {
            try {
              const a = turf.area(b.polygon);
              if (a < 500) return best;
              return !best || a > best.area ? { building: b, area: a } : best;
            } catch { return best; }
          }, null);

        if (largest) {
          const facing = computeFacingFromPolygon(largest.building.polygon);
          resultsMap.set(apt.id, { ...apt, facing, facingConfidence: facing ? "mbr" : "none" });
          if (facing) { districtWithFacing++; totalWithFacing++; }
          else { totalWithoutFacing++; }
        } else {
          resultsMap.set(apt.id, { ...apt, facing: null, facingConfidence: "none" });
          totalWithoutFacing++;
        }
        continue;
      }

      // Largest polygon = main complex building
      const largest = matching.reduce((best, b) => {
        try {
          return turf.area(b.polygon) > turf.area(best.polygon) ? b : best;
        } catch {
          return best;
        }
      });

      const facing = computeFacingFromPolygon(largest.polygon);
      resultsMap.set(apt.id, {
        ...apt,
        facing,
        facingConfidence: facing ? "mbr" : "none",
      });

      if (facing) {
        districtWithFacing++;
        totalWithFacing++;
      } else {
        totalWithoutFacing++;
      }
    }

    console.log(
      `\r[${districtIdx}/${byDistrict.size}] ${sigungu}: ${buildings.length} buildings, facing ${districtWithFacing}/${apts.length}`
    );
  }

  console.log(`\nTotal: facing=${totalWithFacing}, none=${totalWithoutFacing}`);

  // Restore original order from raw input
  const results: EnrichedApartment[] = raw.map((apt) => resultsMap.get(apt.id)!);

  await writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`Written to: ${outputPath}`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
