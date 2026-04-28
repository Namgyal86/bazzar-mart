import { Notification } from '../../modules/notifications/notification.model';

export const notify = (
  userId: string,
  title: string,
  message: string,
  type: 'ORDER' | 'ORDER_STATUS' | 'PAYMENT' | 'SYSTEM' | 'DELIVERY' = 'SYSTEM',
  data?: Record<string, unknown>,
) => Notification.create({ userId, title, message, type, isRead: false, data }).catch(() => {});
