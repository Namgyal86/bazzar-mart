import { apiClient } from './client';

export interface Notification {
  _id: string; userId: string; type: string;
  title: string; message: string; isRead: boolean;
  data?: Record<string, any>; createdAt: string;
}

export const notificationApi = {
  list: () =>
    apiClient.get<{ success: true; data: Notification[]; meta: { unread: number } }>('/api/v1/notifications'),

  markRead: (id: string) =>
    apiClient.patch(`/api/v1/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.patch('/api/v1/notifications/read-all'),
};
