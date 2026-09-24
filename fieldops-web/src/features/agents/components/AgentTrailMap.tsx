'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import type { LocationHistoryPoint } from '../types';

function dotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -9],
  });
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export function AgentTrailMap({ points }: { points: LocationHistoryPoint[] }) {
  const positions = useMemo<[number, number][]>(() => points.map((p) => [p.lat, p.lng]), [points]);
  const center = positions[Math.floor(positions.length / 2)] ?? [48.8566, 2.3522];
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#1D4ED8', weight: 3 }} />}
      {first && (
        <Marker position={[first.lat, first.lng]} icon={dotIcon('#10B981')}>
          <Popup>Départ — {formatTime(first.recordedAt)}</Popup>
        </Marker>
      )}
      {last && last !== first && (
        <Marker position={[last.lat, last.lng]} icon={dotIcon('#EF4444')}>
          <Popup>Dernière position — {formatTime(last.recordedAt)}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
