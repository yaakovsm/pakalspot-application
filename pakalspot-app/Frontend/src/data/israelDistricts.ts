/**
 * Approximate district grouping for UX (carousel sections). Boundaries are coarse;
 * Jerusalem area coverage is simplified — adjust polygons if you need stricter CBS alignment.
 */
import type { Spot } from '../types/spot';

export type DistrictId = 'north' | 'center' | 'south' | 'jerusalem' | 'unknown';

const IL_BOUNDS = { minLat: 29.45, maxLat: 33.42, minLon: 34.2, maxLon: 35.92 };

type Rule = { id: DistrictId; test: (lat: number, lon: number) => boolean };

/** First matching rule wins (more specific regions before broader ones). */
const RULES: Rule[] = [
  {
    id: 'jerusalem',
    test: (la, lo) => la >= 31.4 && la <= 32.22 && lo >= 35.05 && lo <= 35.58,
  },
  { id: 'south', test: (la, lo) => la < 31.55 && lo >= 34.2 && lo <= 35.55 },
  { id: 'north', test: (la) => la >= 32.42 },
  { id: 'center', test: () => true },
];

/** Preferred carousel order for non-empty districts. */
export const DISTRICT_DISPLAY_ORDER: DistrictId[] = [
  'north',
  'center',
  'south',
  'jerusalem',
  'unknown',
];

export function getDistrictForSpot(lat: number, lon: number): DistrictId {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'unknown';
  if (
    lat < IL_BOUNDS.minLat ||
    lat > IL_BOUNDS.maxLat ||
    lon < IL_BOUNDS.minLon ||
    lon > IL_BOUNDS.maxLon
  ) {
    return 'unknown';
  }
  for (const { id, test } of RULES) {
    if (test(lat, lon)) return id;
  }
  return 'center';
}

export function groupSpotsByDistrict(spots: Spot[]): Record<DistrictId, Spot[]> {
  const out: Record<DistrictId, Spot[]> = {
    north: [],
    center: [],
    south: [],
    jerusalem: [],
    unknown: [],
  };
  for (const spot of spots) {
    const id = getDistrictForSpot(spot.lat, spot.lon);
    out[id].push(spot);
  }
  return out;
}

/** Ordered non-empty district keys for horizontal sections. */
export function districtsWithSpots(
  grouped: Record<DistrictId, Spot[]>
): { id: DistrictId; spots: Spot[] }[] {
  const res: { id: DistrictId; spots: Spot[] }[] = [];
  for (const id of DISTRICT_DISPLAY_ORDER) {
    const list = grouped[id];
    if (list.length > 0) res.push({ id, spots: list });
  }
  return res;
}
