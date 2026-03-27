// Coordinate safety layer: all Turf.js operations use GeoJSON [lng, lat] order.
// Naver Maps LatLng(lat, lng) conversion happens ONLY in this file.

import * as turf from "@turf/turf";
import type { Feature, Point, Geometry, Polygon, MultiPolygon } from "geojson";

/** Convert [lng, lat] GeoJSON coord to Naver Maps LatLng */
export function toNaverLatLng(lng: number, lat: number): naver.maps.LatLng {
  return new naver.maps.LatLng(lat, lng);
}

/** Convert Naver Maps LatLng to GeoJSON Point feature */
export function fromNaverLatLng(latlng: naver.maps.LatLng): Feature<Point> {
  return turf.point([latlng.lng(), latlng.lat()]);
}

/** Naver Maps LatLngBounds to Turf.js BBox [minLng, minLat, maxLng, maxLat] */
export function boundsToTurfBBox(
  bounds: naver.maps.LatLngBounds
): [number, number, number, number] {
  const sw = bounds.getSW();
  const ne = bounds.getNE();
  return [sw.lng(), sw.lat(), ne.lng(), ne.lat()];
}

/**
 * Calculate distance in meters from a point to the nearest edge of a geometry.
 * Returns 0 if the point is inside the polygon.
 */
export function distanceToGeometry(
  lngLat: [number, number],
  geometry: Geometry
): number {
  const pt = turf.point(lngLat);

  if (geometry.type === "Point") {
    return turf.distance(pt, turf.point(geometry.coordinates as [number, number]), {
      units: "meters",
    });
  }

  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    // If inside, distance is 0
    if (turf.booleanPointInPolygon(pt, geometry as Polygon | MultiPolygon)) {
      return 0;
    }
    const line = turf.polygonToLine(geometry as Polygon | MultiPolygon);
    const nearest = turf.nearestPointOnLine(line as Parameters<typeof turf.nearestPointOnLine>[0], pt, { units: "meters" });
    return nearest.properties?.dist ?? Infinity;
  }

  if (geometry.type === "LineString") {
    const line = turf.lineString(geometry.coordinates as [number, number][]);
    const nearest = turf.nearestPointOnLine(line, pt, { units: "meters" });
    return nearest.properties?.dist ?? Infinity;
  }

  if (geometry.type === "MultiLineString") {
    let minDist = Infinity;
    for (const coords of geometry.coordinates) {
      const line = turf.lineString(coords as [number, number][]);
      const nearest = turf.nearestPointOnLine(line, pt, { units: "meters" });
      const d = nearest.properties?.dist ?? Infinity;
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  return Infinity;
}

/**
 * Bearing in degrees (0-360) from [lngLat] toward [targetLngLat].
 * 0 = North, 90 = East, 180 = South, 270 = West.
 */
export function bearingTo(
  lngLat: [number, number],
  targetLngLat: [number, number]
): number {
  const bearing = turf.bearing(turf.point(lngLat), turf.point(targetLngLat));
  return (bearing + 360) % 360;
}

/** Convert bearing angle to cardinal/intercardinal direction label */
export function angleToDirection(
  angle: number
): "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" {
  const a = ((angle % 360) + 360) % 360;
  if (a >= 337.5 || a < 22.5) return "N";
  if (a < 67.5) return "NE";
  if (a < 112.5) return "E";
  if (a < 157.5) return "SE";
  if (a < 202.5) return "S";
  if (a < 247.5) return "SW";
  if (a < 292.5) return "W";
  return "NW";
}

/**
 * MBR (Minimum Bounding Rectangle) algorithm to estimate building facing direction.
 * Returns the direction the building's primary facade faces.
 */
export function computeFacingFromPolygon(
  polygon: Feature<Polygon>
): "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | null {
  try {
    const coords = polygon.geometry.coordinates[0];
    if (coords.length < 4) return null;

    // Find rotation angle that minimizes bounding box area (oriented MBR)
    let minArea = Infinity;
    let bestAngle = 0;

    for (let deg = 0; deg < 90; deg += 0.5) {
      const rotated = turf.transformRotate(polygon, deg);
      const bbox = turf.bbox(rotated);
      const w = bbox[2] - bbox[0];
      const h = bbox[3] - bbox[1];
      if (w * h < minArea) {
        minArea = w * h;
        bestAngle = deg;
      }
    }

    // Building's long axis is at angle (90 - bestAngle) from geographic north.
    // Facade normals are perpendicular: (longAxis + 90) and (longAxis - 90).
    const longAxisAngle = 90 - bestAngle;
    const normal1 = (longAxisAngle + 90 + 360) % 360;
    const normal2 = (longAxisAngle - 90 + 360) % 360;

    // Choose the normal closest to due south (180°)
    const diff1 = Math.abs(((normal1 - 180 + 180) % 360) - 180);
    const diff2 = Math.abs(((normal2 - 180 + 180) % 360) - 180);
    const facingAngle = diff1 < diff2 ? normal1 : normal2;

    return angleToDirection(facingAngle);
  } catch {
    return null;
  }
}

/** Human-readable Korean label for facing direction */
export function facingLabel(dir: string | null): string {
  if (!dir) return "방향 미확인";
  const map: Record<string, string> = {
    N: "북향",
    NE: "북동향",
    E: "동향",
    SE: "남동향",
    S: "남향",
    SW: "남서향",
    W: "서향",
    NW: "북서향",
  };
  return map[dir] ?? dir;
}

/** Nature type Korean label */
export function natureTypeLabel(type: string): string {
  const map: Record<string, string> = {
    mountain: "산",
    forest: "숲/공원",
    water: "호수/하천",
  };
  return map[type] ?? type;
}
