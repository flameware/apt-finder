import type { Apartment, FilterState } from "@/types";

/** Pure client-side filter function for apartments */
export function filterApartments(
  apartments: Apartment[],
  filter: FilterState
): Apartment[] {
  return apartments.filter((apt) => {
    // 1. Nature type: at least one selected type must be present within maxDistance
    const hasMatchingNature = filter.natureTypes.some((type) => {
      const withinDistance = apt.nearbyNature.some(
        (n) => n.type === type && n.distanceMeters <= filter.maxDistanceMeters
      );
      return withinDistance;
    });
    if (!hasMatchingNature) return false;

    // 2. Distance: min distance to any matching nature must be within threshold
    const nearestMatchingDist = apt.nearbyNature
      .filter(
        (n) =>
          filter.natureTypes.includes(n.type) &&
          n.distanceMeters <= filter.maxDistanceMeters
      )
      .reduce(
        (min, n) => (n.distanceMeters < min ? n.distanceMeters : min),
        Infinity
      );
    if (nearestMatchingDist === Infinity) return false;

    // 3. Facing: empty = any direction (including unknown)
    if (filter.facingDirections.length > 0) {
      if (!apt.facing) return false; // unknown facing excluded when direction filter is set
      if (!filter.facingDirections.includes(apt.facing)) return false;
    }

    // 4. Sigungu filter
    if (filter.sigungu && apt.sigungu !== filter.sigungu) return false;

    return true;
  });
}

/** Get list of unique sigungu values from apartment data */
export function getSigunguList(apartments: Apartment[]): string[] {
  const set = new Set<string>();
  for (const apt of apartments) {
    if (apt.sigungu) set.add(apt.sigungu);
  }
  return Array.from(set).sort();
}
