import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import type { Apartment, FacingDirection, NatureType } from "@/types";

let cache: Apartment[] | null = null;

async function loadApartments(): Promise<Apartment[]> {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "src", "data", "apartments.json");
  try {
    const raw = await readFile(filePath, "utf-8");
    cache = JSON.parse(raw) as Apartment[];
    return cache;
  } catch {
    // Return empty array if file doesn't exist yet (before pipeline runs)
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const maxDist = Number(searchParams.get("maxDist") ?? "300");
  const typesParam = searchParams.get("types");
  const facingParam = searchParams.get("facing");
  const sigungu = searchParams.get("sigungu");
  const boundsParam = searchParams.get("bounds"); // "minLng,minLat,maxLng,maxLat"

  const types = typesParam
    ? (typesParam.split(",") as NatureType[])
    : (["mountain", "forest", "water"] as NatureType[]);

  const facingDirs = facingParam
    ? (facingParam.split(",") as FacingDirection[])
    : [];

  const all = await loadApartments();

  let results = all.filter((apt) => {
    // Sigungu filter
    if (sigungu && apt.sigungu !== sigungu) return false;

    // Bounds filter (viewport)
    if (boundsParam) {
      const [minLng, minLat, maxLng, maxLat] = boundsParam.split(",").map(Number);
      if (
        apt.lng < minLng ||
        apt.lng > maxLng ||
        apt.lat < minLat ||
        apt.lat > maxLat
      )
        return false;
    }

    // Nature type + distance filter
    const hasMatchingNature = types.some((type) =>
      apt.nearbyNature.some(
        (n) => n.type === type && n.distanceMeters <= maxDist
      )
    );
    if (!hasMatchingNature) return false;

    // Facing filter
    if (facingDirs.length > 0) {
      if (!apt.facing) return false;
      if (!facingDirs.includes(apt.facing)) return false;
    }

    return true;
  });

  // Cap at 500 results
  const total = results.length;
  results = results.slice(0, 500);

  return NextResponse.json(results, {
    headers: {
      "X-Total-Count": String(total),
      "X-Returned-Count": String(results.length),
    },
  });
}
