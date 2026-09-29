import { ClientShell } from '@/features/client-portal/components/ClientShell';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
