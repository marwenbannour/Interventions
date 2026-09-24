export interface Client {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  contractReference?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [lng: number, lat: number];
}

export interface Site {
  id: string;
  clientId: string;
  client?: Client;
  name: string;
  address: string;
  postalCode?: string | null;
  city?: string | null;
  location: GeoJsonPoint | null;
  geofenceMeters?: number | null;
  zoneId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  accessInstructions?: string | null;
  isActive: boolean;
}

export interface CreateClientInput {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  contractReference?: string;
  notes?: string;
}

export type UpdateClientInput = Partial<CreateClientInput> & { isActive?: boolean };

export interface CreateSiteInput {
  clientId: string;
  name: string;
  address: string;
  postalCode?: string;
  city?: string;
  lat?: number;
  lng?: number;
  geofenceMeters?: number;
  zoneId?: string;
  contactName?: string;
  contactPhone?: string;
  accessInstructions?: string;
}

export type UpdateSiteInput = Partial<Omit<CreateSiteInput, 'clientId'>> & { isActive?: boolean };
