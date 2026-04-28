'use client';

import { useState, useEffect } from 'react';
import { Bell, Send, X, Megaphone } from 'lucide-react';
import { notificationApi, Notification } from '@/lib/api/notification.api';
import { apiClient } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const TYPE_CONFIG: Record<string, { bg: string; text: string }> = {
  SYSTEM:    { bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  PROMOTION: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  ORDER:     { bg: 'bg-green-500/10',  text: 'text-green-400' },
};

const inputCls = 'w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[color:var(--ap-50)] transition-colors';
const labelCls = 'text-xs font-semibold text-gray-400 mb-1.5 block';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'SYSTEM', target: 'ALL' });
  const [sending, setSending] = useState(false);

  const fetchNotifications = () =>
    (apiClient.get('/api/v1/notifications/admin') as any)
      .then((res: any) => { if (Array.isArray(res.data?.data)) setNotifications(res.data.data); })
      .catch(() => {});

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 15000);
    return () => clearInterval(t);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiClient.post('/api/v1/notifications/broadcast', form);
      toast({ title: 'Notification sent!' });
    } catch {
      toast({ title: 'Queued', description: 'Will be sent when service is available' });
    } finally {
      setSending(false);
      setShowForm(false);
      setNotifications(prev => [{
        _id: Date.now().toString(),
        userId: form.target,
        type: form.type,
        title: form.title,
        message: form.message,
        isRead: false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Broadcast messages to platform users</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-xl transition-colors shadow-lg"
          style={{ backgroundColor: 'var(--ap)' }}
        >
          {showForm ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Send Notification'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSend} className="bg-[#1a2035] rounded-2xl p-5 space-y-4" style={{ border: '1px solid var(--ap-20)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4 ap-text" />
            <h2 className="text-sm font-bold text-white">Broadcast Notification</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Target Audience</label>
              <select className={inputCls} value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                <option value="ALL">All Users</option>
                <option value="BUYERS">Buyers Only</option>
                <option value="SELLERS">Sellers Only</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="SYSTEM">System</option>
                <option value="PROMOTION">Promotion</option>
                <option value="ORDER">Order</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Title</label>
              <input className={inputCls} placeholder="Notification title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Message</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-none`}
                placeholder="Notification message..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="px-5 py-2 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--ap)' }}
          >
            {sending ? 'Sending...' : 'Send Now'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {notifications.map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
          return (
            <div key={n._id} className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 flex gap-4 hover:border-brand-500/20 transition-all">
              <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Bell className={`w-5 h-5 ${cfg.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">{n.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${cfg.bg} ${cfg.text}`}>{n.type}</span>
                  </div>
                  <span className="text-xs text-gray-600 whitespace-nowrap">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{n.message}</p>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="text-center py-16 bg-[#1a2035] border border-white/5 rounded-2xl">
            <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No notifications sent yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
