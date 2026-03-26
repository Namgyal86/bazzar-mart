'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Package, ShoppingBag, Tag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationApi, Notification } from '@/lib/api/notification.api';
import { formatDate } from '@/lib/utils';


const TYPE_ICONS: Record<string, any> = {
  ORDER_STATUS: Package,
  ORDER: ShoppingBag,
  PROMOTION: Tag,
  SYSTEM: AlertCircle,
};

const TYPE_COLORS: Record<string, { icon: string; badge: string }> = {
  ORDER_STATUS: {
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  },
  ORDER: {
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  },
  PROMOTION: {
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  },
  SYSTEM: {
    icon: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    notificationApi.list()
      .then((res) => { if (Array.isArray(res.data?.data)) setNotifications(res.data.data); })
      .catch(() => {});
  }, []);

  const markRead = async (id: string) => {
    try { await notificationApi.markRead(id); } catch {}
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    try { await notificationApi.markAllRead(); } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'You are all caught up'}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-700"
            onClick={markAllRead}
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {notifications.map((n) => {
          const Icon = TYPE_ICONS[n.type] ?? Bell;
          const colors = TYPE_COLORS[n.type] ?? TYPE_COLORS.SYSTEM;
          return (
            <div
              key={n._id}
              className={`relative rounded-2xl p-4 flex gap-4 cursor-pointer transition-all ${
                !n.isRead
                  ? 'border-l-4 border-l-orange-500 border border-gray-100 dark:border-gray-800 bg-orange-50/30 dark:bg-orange-950/10 hover:border-orange-200 dark:hover:border-orange-800'
                  : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800 hover:shadow-sm'
              }`}
              onClick={() => !n.isRead && markRead(n._id)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colors.icon}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                      {n.title}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                      {n.type === 'ORDER_STATUS' ? 'Order' : n.type.charAt(0) + n.type.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0" />
              )}
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shadow-[0_0_30px_hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.15)] dark:shadow-[0_0_30px_hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.1)]">
              <Bell className="w-10 h-10 text-orange-400 dark:text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-1">
              No Notifications Yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We&apos;ll let you know when something arrives
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
