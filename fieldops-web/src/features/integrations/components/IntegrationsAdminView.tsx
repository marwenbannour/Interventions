'use client';

import { ApiKeysSection } from './ApiKeysSection';
import { WebhooksSection } from './WebhooksSection';

export function IntegrationsAdminView() {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <WebhooksSection />
      <ApiKeysSection />
    </div>
  );
}
