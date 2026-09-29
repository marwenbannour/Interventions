import { ArrowRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

/** Carte de section du tableau de bord : icône, titre, lien « Voir tout », contenu. */
export function Panel({
  title,
  icon: Icon,
  iconClass = 'text-primary',
  action,
  children,
  className = '',
}: {
  title: string;
  icon: LucideIcon;
  iconClass?: string;
  action?: { label: string; href: string } | React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <Icon className={`size-5 flex-none ${iconClass}`} />
        <h2 className="min-w-0 flex-1 text-base font-bold leading-tight text-foreground">{title}</h2>
        {action && typeof action === 'object' && 'href' in action ? (
          <Link href={action.href} className="flex flex-none items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary hover:underline">
            {action.label}
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          action
        )}
      </div>
      {children}
    </section>
  );
}
