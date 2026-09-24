/** Helpers PostGIS : les colonnes geography(Point,4326) sont manipulées en GeoJSON par TypeORM. */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export function toPoint(lat?: number | null, lng?: number | null): GeoJsonPoint | null {
  if (lat === undefined || lat === null || lng === undefined || lng === null) return null;
  return { type: 'Point', coordinates: [lng, lat] };
}

export function fromPoint(p?: GeoJsonPoint | null): { lat: number; lng: number } | null {
  if (!p) return null;
  return { lat: p.coordinates[1], lng: p.coordinates[0] };
}
