/**
 * Step 4: Calculate distances from each apartment to nearby natural features
 * Input:  scripts/data/apartments-enriched.json + public/data/nature.geojson
 * Output: src/data/apartments.json
 *
 * Run: bun run scripts/calc-distances.ts
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import * as turf from "@turf/turf";
import RBush from "rbush";
import { distanceToGeometry, bearingTo } from "../src/lib/geo";
import type { Apartment, NatureFeature, NearbyNature } from "../src/types/index";

const MAX_NEARBY_FEATURES = 10;
const MAX_DISTANCE_METERS = 1000;
const GEOMETRY_SEARCH_BUFFER_DEG = 0.009; // ~1km buffer around actual geometry bbox

interface RBushItem {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  id: string;
}

interface EnrichedApartment {
  id: string;
  name: string;
  address: string;
  sigungu: string;
  lat: number | null;
  lng: number | null;
  facing?: string | null;
  facingConfidence?: string;
}

export async function run() {
  // Use enriched file if available (after facing step), otherwise fall back to raw
  const enrichedPath = path.join(process.cwd(), "scripts", "data",
    await import("fs/promises").then(fs => fs.stat(path.join(process.cwd(), "scripts", "data", "apartments-enriched.json")).then(() => "apartments-enriched.json").catch(() => "apartments-raw.json"))
  );
  const naturePath = path.join(process.cwd(), "public", "data", "nature.geojson");
  const outputDir = path.join(process.cwd(), "src", "data");
  const outputPath = path.join(outputDir, "apartments.json");

  await mkdir(outputDir, { recursive: true });

  console.log("Loading data...");
  const enriched: EnrichedApartment[] = JSON.parse(await readFile(enrichedPath, "utf-8"));
  const natureGeojson = JSON.parse(await readFile(naturePath, "utf-8"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const natureFeatures: NatureFeature[] = natureGeojson.features.map((f: any) => ({
    id: f.id ?? f.properties.id,
    type: f.properties.type,
    name: f.properties.name,
    geometry: f.geometry,
    centroidLat: f.properties.centroidLat,
    centroidLng: f.properties.centroidLng,
  }));

  console.log(`Apartments: ${enriched.length}, Nature features: ${natureFeatures.length}`);

  // Build R-tree for fast spatial queries
  // Index by actual geometry bbox (not centroid) so large polygons like big mountains
  // don't miss apartments near their edges.
  const tree = new RBush<RBushItem>();
  const treeItems: RBushItem[] = natureFeatures
    .filter((f) => f.centroidLat && f.centroidLng)
    .map((f) => {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(f.geometry);
      return {
        minX: minLng - GEOMETRY_SEARCH_BUFFER_DEG,
        maxX: maxLng + GEOMETRY_SEARCH_BUFFER_DEG,
        minY: minLat - GEOMETRY_SEARCH_BUFFER_DEG,
        maxY: maxLat + GEOMETRY_SEARCH_BUFFER_DEG,
        id: f.id,
      };
    });

  tree.load(treeItems);

  // Build feature lookup map
  const featureMap = new Map<string, NatureFeature>();
  for (const f of natureFeatures) featureMap.set(f.id, f);

  const results: Apartment[] = [];
  let skipped = 0;

  for (let i = 0; i < enriched.length; i++) {
    const apt = enriched[i];

    if (i % 500 === 0) {
      process.stdout.write(`\r  Progress: ${i}/${enriched.length}`);
    }

    if (!apt.lat || !apt.lng) {
      skipped++;
      continue;
    }

    const aptLng = apt.lng;
    const aptLat = apt.lat;

    // R-tree bbox query: find nature features whose geometry bbox overlaps apt ± 1km
    const candidates = tree.search({
      minX: aptLng - GEOMETRY_SEARCH_BUFFER_DEG,
      maxX: aptLng + GEOMETRY_SEARCH_BUFFER_DEG,
      minY: aptLat - GEOMETRY_SEARCH_BUFFER_DEG,
      maxY: aptLat + GEOMETRY_SEARCH_BUFFER_DEG,
    });

    const nearbyNature: NearbyNature[] = [];

    for (const candidate of candidates) {
      const feature = featureMap.get(candidate.id);
      if (!feature) continue;

      const dist = distanceToGeometry([aptLng, aptLat], feature.geometry);
      if (dist > MAX_DISTANCE_METERS) continue;

      const bearing = bearingTo(
        [aptLng, aptLat],
        [feature.centroidLng, feature.centroidLat]
      );

      nearbyNature.push({
        featureId: feature.id,
        type: feature.type,
        name: feature.name,
        distanceMeters: Math.round(dist),
        bearing: Math.round(bearing),
      });
    }

    // Sort by distance, keep top N
    nearbyNature.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const topNearby = nearbyNature.slice(0, MAX_NEARBY_FEATURES);

    const minDist = topNearby[0]?.distanceMeters ?? null;

    results.push({
      id: apt.id,
      name: apt.name,
      address: apt.address,
      sigungu: apt.sigungu,
      lat: aptLat,
      lng: aptLng,
      facing: (apt.facing ?? null) as Apartment["facing"],
      facingConfidence: (apt.facingConfidence ?? "none") as Apartment["facingConfidence"],
      nearbyNature: topNearby,
      minNatureDistanceMeters: minDist,
      hasForest: topNearby.some((n) => n.type === "forest"),
      hasMountain: topNearby.some((n) => n.type === "mountain"),
      hasWater: topNearby.some((n) => n.type === "water"),
    });
  }

  console.log(`\nProcessed: ${results.length}, Skipped (no coords): ${skipped}`);

  const withNature = results.filter((a) => a.nearbyNature.length > 0).length;
  const withFacing = results.filter((a) => a.facing !== null).length;
  console.log(`With nature within 1km: ${withNature} (${Math.round(withNature / results.length * 100)}%)`);
  console.log(`With facing data: ${withFacing} (${Math.round(withFacing / results.length * 100)}%)`);

  await writeFile(outputPath, JSON.stringify(results));
  console.log(`Written to: ${outputPath}`);

  // Summary stats
  const byType = {
    mountain: results.filter((a) => a.hasMountain).length,
    forest: results.filter((a) => a.hasForest).length,
    water: results.filter((a) => a.hasWater).length,
  };
  console.log(`By type (within 1km): mountain=${byType.mountain}, forest=${byType.forest}, water=${byType.water}`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
