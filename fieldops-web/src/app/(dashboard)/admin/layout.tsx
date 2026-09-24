'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminGuard } from '@/features/auth/components/AdminGuard';

const tabs = [
  { href: '/admin/organization', label: 'Organisation' },
  { href: '/admin/users', label: 'Comptes' },
  { href: '/admin/workflows', label: 'Workflows' },
  { href: '/admin/audit', label: 'Audit' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="flex h-full flex-col gap-4">
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </AdminGuard>
  );
}
