/**
 * Step 3: Estimate building facing direction using OSM building polygons + MBR algorithm
 * Input:  scripts/data/apartments-raw.json
 * Output: scripts/data/apartments-enriched.json
 *
 * Run: bun run scripts/fetch-building-facing.ts
 */

import { readFile, writeFile } from "fs/promises";
import path from "path";
import * as turf from "@turf/turf";
import type { Feature, Polygon } from "geojson";
import { computeFacingFromPolygon } from "../src/lib/geo";
import type { FacingDirection } from "../src/types/index";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

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

async function fetchBuildingPolygons(
  lat: number,
  lng: number,
  name: string
): Promise<Feature<Polygon>[]> {
  // Sanitize name for Overpass regex (escape special chars)
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 20);

  const query = `
[out:json][timeout:10];
(
  way["building"]["name"~"${safeName}"](${lat - 0.003},${lng - 0.003},${lat + 0.003},${lng + 0.003});
  way["building:levels"]["name"~"${safeName}"](${lat - 0.003},${lng - 0.003},${lat + 0.003},${lng + 0.003});
);
out body;
>;
out skel qt;`;

  try {
    const res = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements: any[] = json.elements ?? [];

    // Build node map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodes = new Map<number, [number, number]>();
    for (const el of elements) {
      if (el.type === "node") nodes.set(el.id, [el.lon, el.lat]);
    }

    const polygons: Feature<Polygon>[] = [];
    for (const el of elements) {
      if (el.type !== "way" || !el.nodes) continue;
      const coords = el.nodes
        .map((nid: number) => nodes.get(nid))
        .filter(Boolean) as [number, number][];

      if (coords.length < 4) continue;

      try {
        polygons.push(turf.polygon([coords]));
      } catch {
        // invalid polygon, skip
      }
    }

    return polygons;
  } catch {
    return [];
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function run() {
  const inputPath = path.join(process.cwd(), "scripts", "data", "apartments-raw.json");
  const outputPath = path.join(process.cwd(), "scripts", "data", "apartments-enriched.json");

  const raw: RawApartment[] = JSON.parse(await readFile(inputPath, "utf-8"));
  console.log(`Processing ${raw.length} apartments...`);

  const results: EnrichedApartment[] = [];
  let withFacing = 0;
  let withoutFacing = 0;

  for (let i = 0; i < raw.length; i++) {
    const apt = raw[i];

    if (i % 100 === 0) {
      process.stdout.write(`\r  Progress: ${i}/${raw.length} (facing: ${withFacing}, none: ${withoutFacing})`);
    }

    if (!apt.lat || !apt.lng) {
      results.push({ ...apt, facing: null, facingConfidence: "none" });
      withoutFacing++;
      continue;
    }

    // Rate limit: Overpass has ~1 req/s for building queries
    await sleep(1100);

    const polygons = await fetchBuildingPolygons(apt.lat, apt.lng, apt.name);

    if (polygons.length === 0) {
      results.push({ ...apt, facing: null, facingConfidence: "none" });
      withoutFacing++;
      continue;
    }

    // Use the largest polygon (most likely the main building complex)
    const largest = polygons.reduce((best, poly) => {
      try {
        return turf.area(poly) > turf.area(best) ? poly : best;
      } catch {
        return best;
      }
    });

    const facing = computeFacingFromPolygon(largest);

    results.push({
      ...apt,
      facing,
      facingConfidence: facing ? "mbr" : "none",
    });

    if (facing) withFacing++;
    else withoutFacing++;
  }

  console.log(`\nDone! facing: ${withFacing}, none: ${withoutFacing}`);
  await writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`Written to: ${outputPath}`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
