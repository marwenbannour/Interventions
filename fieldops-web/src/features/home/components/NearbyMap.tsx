'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { TaskListItem } from '@/features/dispatch/types';
import { MAP_TONES, mapTone, type MapTone } from '../utils/visuals';

function pin(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 14 });
  }, [map, points]);
  return null;
}

interface Pin {
  task: TaskListItem;
  tone: MapTone;
  position: [number, number];
}

/** Carte des interventions localisées, colorées par état (légende texte toujours affichée). */
export function NearbyMap({ tasks }: { tasks: TaskListItem[] }) {
  const router = useRouter();
  const pins = useMemo<Pin[]>(
    () =>
      tasks.flatMap((task) => {
        const tone = mapTone(task);
        const coords = task.site?.location?.coordinates;
        if (!tone || !coords) return [];
        return [{ task, tone, position: [coords[1], coords[0]] as [number, number] }];
      }),
    [tasks],
  );
  const points = useMemo(() => pins.map((p) => p.position), [pins]);
  const tones = [...new Set(pins.map((p) => p.tone))];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-64 flex-1 overflow-hidden rounded-xl border border-border">
        <MapContainer center={[48.8566, 2.3522]} zoom={11} className="h-full min-h-64 w-full" scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {pins.map(({ task, tone, position }) => (
            <Marker
              key={task.id}
              position={position}
              icon={pin(MAP_TONES[tone].color)}
              eventHandlers={{ dblclick: () => router.push(`/dispatch?taskId=${task.id}`) }}
            >
              <Popup>
                <div className="flex flex-col gap-0.5 text-sm">
                  <span className="font-semibold">{task.reference}</span>
                  <span>{task.title}</span>
                  <span className="text-muted-foreground">{task.site?.name}</span>
                  <a href={`/dispatch?taskId=${task.id}`} className="mt-1 font-semibold text-primary">
                    Ouvrir →
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(Object.keys(MAP_TONES) as MapTone[])
          .filter((t) => tones.includes(t))
          .map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: MAP_TONES[t].color }} />
              {MAP_TONES[t].label} ({pins.filter((p) => p.tone === t).length})
            </span>
          ))}
        {pins.length === 0 ? <span>Aucune intervention localisée sur la période.</span> : null}
      </div>
    </div>
  );
}
