'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { AgentListItem, LivePosition } from '../types';

function markerIcon(onDuty: boolean): L.DivIcon {
  const color = onDuty ? '#10B981' : '#9CA3AF';
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.round(minutes / 60)} h`;
}

interface AgentPin {
  agent: AgentListItem;
  position: LivePosition;
}

export function AgentMap({ agents, positions }: { agents: AgentListItem[]; positions: LivePosition[] }) {
  const pins = useMemo<AgentPin[]>(() => {
    return positions
      .map((position) => {
        const agent = agents.find((a) => a.userId === position.agentId);
        return agent ? { agent, position } : null;
      })
      .filter((p): p is AgentPin => p !== null);
  }, [agents, positions]);

  const center = useMemo<[number, number]>(() => {
    if (pins.length === 0) return [48.8566, 2.3522]; // Paris — centre par défaut sans position
    const lat = pins.reduce((sum, p) => sum + p.position.lat, 0) / pins.length;
    const lng = pins.reduce((sum, p) => sum + p.position.lng, 0) / pins.length;
    return [lat, lng];
  }, [pins]);

  return (
    <MapContainer center={center} zoom={pins.length > 0 ? 11 : 5} className="h-full w-full rounded-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map(({ agent, position }) => (
        <Marker key={agent.userId} position={[position.lat, position.lng]} icon={markerIcon(agent.isOnDuty)}>
          <Popup>
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-semibold">
                {agent.user.firstName} {agent.user.lastName}
              </span>
              <span className="text-muted-foreground">{position.stale ? 'Position ancienne' : 'Position récente'}</span>
              <span className="text-muted-foreground">{timeAgo(position.recordedAt)}</span>
              {position.speed != null && <span className="text-muted-foreground">{Math.round(position.speed)} km/h</span>}
              {position.battery != null && <span className="text-muted-foreground">Batterie {position.battery}%</span>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
