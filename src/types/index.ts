export type NatureType = "mountain" | "forest" | "water";
export type FacingDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type FacingConfidence = "api" | "mbr" | "none";

export interface NatureFeature {
  id: string; // "osm_way_12345678"
  type: NatureType;
  name: string | null;
  geometry: GeoJSON.Geometry;
  centroidLat: number;
  centroidLng: number;
}

export interface NearbyNature {
  featureId: string;
  type: NatureType;
  name: string | null;
  distanceMeters: number; // distance to nearest polygon edge
  bearing: number; // 0-360 degrees from apartment toward feature centroid
}

export interface Apartment {
  id: string; // 단지코드
  name: string;
  address: string;
  sigungu: string;
  lat: number;
  lng: number;
  facing: FacingDirection | null;
  facingConfidence: FacingConfidence;
  nearbyNature: NearbyNature[]; // sorted by distanceMeters ASC, up to 10 entries
  minNatureDistanceMeters: number | null;
  hasForest: boolean;
  hasMountain: boolean;
  hasWater: boolean;
}

export interface FilterState {
  maxDistanceMeters: number; // default 300
  natureTypes: NatureType[]; // default all three
  facingDirections: FacingDirection[]; // default [S, SE]; empty = any direction
  sigungu: string | null;
}

export const DEFAULT_FILTER: FilterState = {
  maxDistanceMeters: 300,
  natureTypes: ["mountain"],
  facingDirections: [],
  sigungu: null,
};
