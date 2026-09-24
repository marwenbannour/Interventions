export type NotificationChannel = 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ';

export interface NotificationRecord {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  status: NotificationStatus;
  attempts: number;
  lastError?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
}

export interface NotificationListResponse {
  data: NotificationRecord[];
  meta: { page: number; limit: number; total: number; pages: number };
  unread: number;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export type DevicePlatform = 'ios' | 'android' | 'web';
