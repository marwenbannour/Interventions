'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarkNotificationsRead, useNotifications } from '../hooks/useNotifications';
import { useNotificationsRealtimeSync } from '../hooks/useNotificationsRealtimeSync';
import type { NotificationRecord } from '../types';

export function NotificationBell() {
  useNotificationsRealtimeSync();
  const router = useRouter();
  const { data } = useNotifications({ limit: 8 });
  const markRead = useMarkNotificationsRead();

  const notifications = data?.data ?? [];
  const unread = data?.unread ?? 0;

  const handleItemClick = (notification: NotificationRecord) => {
    if (notification.status !== 'READ') {
      markRead.mutate([notification.id]);
    }
    const taskId = notification.data?.taskId;
    if (typeof taskId === 'string') {
      router.push(`/dispatch?taskId=${taskId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground">
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-1.5 py-1">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                markRead.mutate('all');
              }}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              Tout marquer comme lu
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 && (
          <p className="px-1.5 py-4 text-center text-sm text-muted-foreground">Aucune notification.</p>
        )}

        {notifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            onClick={() => handleItemClick(notification)}
            className="flex-col items-start gap-0.5 whitespace-normal py-2"
          >
            <div className="flex w-full items-center gap-2">
              {notification.status !== 'READ' && <span className="size-1.5 flex-none rounded-full bg-primary" />}
              <p className="flex-1 truncate text-sm font-medium text-foreground">{notification.title}</p>
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
            </p>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/notifications" />} className="justify-center text-sm font-medium text-primary">
          Voir toutes les notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
