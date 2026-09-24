'use client';

import { CheckCheck, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/features/auth/store/session.store';
import { canSendNotifications } from '@/lib/auth/permissions';
import { useMarkNotificationsRead, useNotifications } from '../hooks/useNotifications';
import type { NotificationRecord } from '../types';
import { SendNotificationDialog } from './SendNotificationDialog';

const channelLabel: Record<string, string> = { PUSH: 'Push', EMAIL: 'E-mail', SMS: 'SMS', IN_APP: 'App' };

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function NotificationsView() {
  const user = useSessionStore((s) => s.user);
  const router = useRouter();
  const [sendOpen, setSendOpen] = useState(false);
  const { data, isLoading } = useNotifications({ limit: 50 });
  const markRead = useMarkNotificationsRead();

  const notifications = data?.data ?? [];
  const unread = data?.unread ?? 0;

  const handleClick = (notification: NotificationRecord) => {
    if (notification.status !== 'READ') {
      markRead.mutate([notification.id]);
    }
    const taskId = notification.data?.taskId;
    if (typeof taskId === 'string') {
      router.push(`/dispatch?taskId=${taskId}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.meta.total} notification${data.meta.total > 1 ? 's' : ''}, ${unread} non lue(s)` : 'Chargement…'}
          </p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => markRead.mutate('all')} disabled={markRead.isPending}>
              <CheckCheck className="size-4" />
              Tout marquer comme lu
            </Button>
          )}
          {user && canSendNotifications(user.role) && (
            <Button size="sm" onClick={() => setSendOpen(true)}>
              <Plus className="size-4" />
              Nouvelle notification
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleClick(notification)}
              className={`flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50 ${
                notification.status !== 'READ' ? 'ring-1 ring-primary/20' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {notification.status !== 'READ' && <span className="size-1.5 flex-none rounded-full bg-primary" />}
                  <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {channelLabel[notification.channel] ?? notification.channel}
                  </Badge>
                </div>
                <span className="flex-none text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{notification.body}</p>
            </button>
          ))}
          {notifications.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucune notification.</p>
          )}
        </div>
      )}

      <SendNotificationDialog open={sendOpen} onOpenChange={setSendOpen} />
    </div>
  );
}
