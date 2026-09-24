import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';
export interface AuditMeta {
  action: string;
  resource: string;
}
/** Marque un handler comme "opération sensible" à journaliser (§6.14). */
export const Audit = (action: string, resource: string) => SetMetadata(AUDIT_KEY, { action, resource } as AuditMeta);
