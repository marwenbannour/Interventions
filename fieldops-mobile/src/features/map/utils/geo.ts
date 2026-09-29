import * as Location from 'expo-location';
import type { Task as TaskModel } from '../../tasks/db/models/Task';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Position du site de l'intervention (GeoJSON [lng, lat]). */
export function taskPosition(task: TaskModel): LatLng | null {
  const coords = task.site?.location?.coordinates;
  if (!coords || coords.length < 2) return null;
  return { lat: coords[1], lng: coords[0] };
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Position actuelle (dernière connue en priorité : rapide et sans réveiller le GPS). */
export async function currentPosition(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
  return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
}
