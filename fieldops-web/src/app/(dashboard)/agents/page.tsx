'use client';

import dynamic from 'next/dynamic';

const AgentsView = dynamic(() => import('@/features/agents/components/AgentsView').then((m) => m.AgentsView), {
  ssr: false,
});

export default function AgentsPage() {
  return <AgentsView />;
}
