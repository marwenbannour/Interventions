export type NotificationChannel = 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ';

export interface NotificationRecord {
  id: string;
  createdAt: string;
  userId: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  status: NotificationStatus;
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

export interface SendNotificationInput {
  userIds: string[];
  title: string;
  body: string;
  channels?: NotificationChannel[];
}

export interface SimpleUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}
