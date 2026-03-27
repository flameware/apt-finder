/**
 * Step 1: Fetch natural environment data from OpenStreetMap Overpass API
 * Output: public/data/nature.geojson
 *
 * Run: bun run scripts/fetch-nature.ts
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import * as turf from "@turf/turf";
import osmtogeojson from "osmtogeojson";
import type { NatureType } from "../src/types/index";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const OVERPASS_MIRROR = "https://overpass.kumi.systems/api/interpreter";
const OUTPUT_DIR = path.join(process.cwd(), "public", "data");

// Seoul metro area bounding box (south, west, north, east)
const BBOX = "37.1,126.6,37.8,127.9";

interface QueryConfig {
  type: NatureType;
  label: string;
  query: string;
}

const QUERIES: QueryConfig[] = [
  {
    type: "mountain",
    label: "산/능선",
    query: `
[out:json][timeout:120][maxsize:536870912];
(
  node["natural"="peak"](${BBOX});
  way["natural"="peak"](${BBOX});
  way["natural"="ridge"](${BBOX});
  relation["natural"="peak"](${BBOX});
);
out body;
>;
out skel qt;`,
  },
  {
    type: "forest",
    label: "숲/공원",
    query: `
[out:json][timeout:120][maxsize:536870912];
(
  way["natural"="wood"](${BBOX});
  relation["natural"="wood"](${BBOX});
  way["landuse"="forest"](${BBOX});
  relation["landuse"="forest"](${BBOX});
  way["leisure"="park"](${BBOX});
  relation["leisure"="park"](${BBOX});
  way["leisure"="nature_reserve"](${BBOX});
  relation["leisure"="nature_reserve"](${BBOX});
);
out body;
>;
out skel qt;`,
  },
  {
    type: "water",
    label: "호수/하천",
    query: `
[out:json][timeout:120][maxsize:536870912];
(
  way["natural"="water"](${BBOX});
  relation["natural"="water"](${BBOX});
  way["water"="lake"](${BBOX});
  way["water"="reservoir"](${BBOX});
  way["waterway"="river"](${BBOX});
  relation["waterway"="river"](${BBOX});
);
out body;
>;
out skel qt;`,
  },
];

async function fetchOverpass(query: string, retries = 3): Promise<object> {
  const delays = [10000, 30000, 60000];

  for (let attempt = 0; attempt < retries; attempt++) {
    const api = attempt === 0 ? OVERPASS_API : OVERPASS_MIRROR;
    try {
      console.log(`  Querying ${api} (attempt ${attempt + 1})...`);
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.error(`  Attempt ${attempt + 1} failed:`, err);
      if (attempt < retries - 1) {
        console.log(`  Retrying in ${delays[attempt] / 1000}s...`);
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }
  throw new Error("All Overpass API attempts failed");
}

function classifyType(tags: Record<string, string>): NatureType {
  if (tags.natural === "peak" || tags.natural === "ridge") return "mountain";
  if (
    tags.natural === "wood" ||
    tags.landuse === "forest" ||
    tags.leisure === "park" ||
    tags.leisure === "nature_reserve"
  )
    return "forest";
  return "water";
}

export async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const allFeatures: object[] = [];
  let totalCount = 0;

  for (const cfg of QUERIES) {
    console.log(`\nFetching ${cfg.label}...`);
    const osmData = await fetchOverpass(cfg.query);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geojson = osmtogeojson(osmData as any) as any;

    let count = 0;
    for (const feature of geojson.features ?? []) {
      if (!feature.geometry) continue;

      // Compute centroid
      let centroid: [number, number];
      try {
        const c = turf.centroid(feature);
        centroid = c.geometry.coordinates as [number, number];
      } catch {
        continue;
      }

      const tags = feature.properties ?? {};
      const type = classifyType(tags);

      allFeatures.push({
        type: "Feature",
        id: feature.id,
        geometry: feature.geometry,
        properties: {
          id: feature.id,
          type,
          name: tags.name ?? tags["name:ko"] ?? null,
          centroidLng: centroid[0],
          centroidLat: centroid[1],
        },
      });
      count++;
    }

    console.log(`  Found ${count} ${cfg.label} features`);
    totalCount += count;
  }

  const featureCollection = {
    type: "FeatureCollection",
    features: allFeatures,
  };

  const outputPath = path.join(OUTPUT_DIR, "nature.geojson");
  await writeFile(outputPath, JSON.stringify(featureCollection));

  const metaPath = path.join(OUTPUT_DIR, "nature-meta.json");
  await writeFile(
    metaPath,
    JSON.stringify({
      totalFeatures: totalCount,
      bbox: BBOX,
      generatedAt: new Date().toISOString(),
      byType: {
        mountain: allFeatures.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any) => f.properties.type === "mountain"
        ).length,
        forest: allFeatures.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any) => f.properties.type === "forest"
        ).length,
        water: allFeatures.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any) => f.properties.type === "water"
        ).length,
      },
    }, null, 2)
  );

  console.log(`\nDone! ${totalCount} total features written to ${outputPath}`);
}

// Run directly
run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
