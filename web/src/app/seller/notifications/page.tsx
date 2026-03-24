'use client';

import { useState, useEffect } from 'react';
import { Bell, ShoppingBag, DollarSign, Star, CheckCheck, Zap } from 'lucide-react';
import { notificationApi, Notification } from '@/lib/api/notification.api';

const TYPE_ICONS: Record<string, any> = {
  ORDER:   ShoppingBag,
  PAYMENT: DollarSign,
  REVIEW:  Star,
  SYSTEM:  Bell,
};

const TYPE_CONFIG: Record<string, { bg: string; iconCls: string; dot: string; border: string; glow: string }> = {
  ORDER:   { bg: 'bg-blue-500/10',   iconCls: 'text-blue-400',   dot: 'bg-blue-400',   border: 'border-blue-500/25',  glow: 'shadow-blue-500/10' },
  PAYMENT: { bg: 'bg-green-500/10',  iconCls: 'text-green-400',  dot: 'bg-green-400',  border: 'border-green-500/25', glow: 'shadow-green-500/10' },
  REVIEW:  { bg: 'bg-yellow-500/10', iconCls: 'text-yellow-400', dot: 'bg-yellow-400', border: 'border-yellow-500/25',glow: 'shadow-yellow-500/10' },
  SYSTEM:  { bg: 'bg-gray-500/10',   iconCls: 'text-gray-400',   dot: 'bg-gray-400',   border: 'border-white/10',     glow: '' },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SellerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    notificationApi.list()
      .then((res) => { if (Array.isArray(res.data.data)) setNotifications(res.data.data); })
      .catch(() => {});
  }, []);

  const markRead = (id: string) => {
    try { notificationApi.markRead(id); } catch {}
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = () => {
    try { notificationApi.markAllRead(); } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unread > 0
              ? <><span className="text-blue-400 font-semibold">{unread}</span> unread message{unread !== 1 ? 's' : ''}</>
              : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-300 rounded-xl transition-all hover:text-white hover:border-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {notifications.map((n) => {
          const Icon = TYPE_ICONS[n.type] ?? Bell;
          const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;
          return (
            <div
              key={n._id}
              onClick={() => !n.isRead && markRead(n._id)}
              className={`group rounded-2xl p-4 flex gap-3.5 cursor-pointer transition-all duration-200 ${
                !n.isRead
                  ? `border ${cfg.border} hover:brightness-110 shadow-lg ${cfg.glow}`
                  : 'border border-white/5 hover:bg-white/3'
              }`}
              style={!n.isRead
                ? { background: 'rgba(20,28,48,0.9)' }
                : { background: 'rgba(14,20,36,0.6)' }}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.iconCls}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold leading-tight ${!n.isRead ? 'text-white' : 'text-gray-400'}`}>
                    {n.title}
                  </p>
                  <span className="text-[11px] text-gray-600 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
              </div>

              {/* Unread dot */}
              {!n.isRead && (
                <div className={`w-2 h-2 ${cfg.dot} rounded-full mt-1.5 shrink-0 shadow-sm`}
                  style={{ boxShadow: `0 0 6px currentColor` }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <Zap className="w-8 h-8 text-blue-400 opacity-60" />
          </div>
          <div>
            <p className="text-white font-semibold">No notifications yet</p>
            <p className="text-xs text-gray-600 mt-0.5">New orders and activity will show here</p>
          </div>
        </div>
      )}
    </div>
  );
}
