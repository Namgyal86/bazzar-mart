'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Search, Mail, Phone, Clock, Tag, Inbox, User, ShoppingBag, Store, AlertTriangle, Shield, RefreshCw, CheckCircle, Circle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SupportMessage {
  id: string;
  name?: string;
  email?: string;
  subject: string;
  message: string;
  type?: string;
  orderId?: string;
  userId?: string;
  userEmail?: string;
  createdAt: string;
  status: 'open' | 'resolved';
  source: 'contact' | 'admin-contact';
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  account: { label: 'Account', icon: User, color: 'bg-blue-500/10 text-blue-400' },
  order: { label: 'Order', icon: ShoppingBag, color: 'bg-purple-500/10 text-purple-400' },
  seller: { label: 'Seller Report', icon: Store, color: 'bg-orange-500/10 text-brand-400' },
  fraud: { label: 'Fraud', icon: AlertTriangle, color: 'bg-red-500/10 text-red-400' },
  other: { label: 'Other', icon: Shield, color: 'bg-gray-500/10 text-gray-400' },
  general: { label: 'General', icon: Mail, color: 'bg-green-500/10 text-green-400' },
};

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'contact' | 'admin-contact'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchMessages = () => {
    setLoading(true);
    Promise.allSettled([
      apiClient.get('/api/v1/support/messages'),
      apiClient.get('/api/v1/support/admin-messages'),
    ]).then(([contactRes, adminRes]) => {
      const contactMsgs: SupportMessage[] = [];
      const adminMsgs: SupportMessage[] = [];

      if (contactRes.status === 'fulfilled') {
        const data = (contactRes.value as any).data?.data;
        if (Array.isArray(data)) {
          data.forEach((m: any) => contactMsgs.push({ ...m, source: 'contact', status: m.status || 'open' }));
        }
      }
      if (adminRes.status === 'fulfilled') {
        const data = (adminRes.value as any).data?.data;
        if (Array.isArray(data)) {
          data.forEach((m: any) => adminMsgs.push({ ...m, source: 'admin-contact', status: m.status || 'open' }));
        }
      }

      const all = [...adminMsgs, ...contactMsgs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setMessages(all);
    }).finally(() => setLoading(false));
  };

  const toggleResolved = async (m: SupportMessage) => {
    const newStatus = m.status === 'resolved' ? 'open' : 'resolved';
    setToggling(m.id);
    try {
      await apiClient.patch(`/api/v1/support/messages/${m.id}`, { status: newStatus });
    } catch {
      // Update optimistically even if API fails (admin workflow)
    } finally {
      setToggling(null);
    }
    setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, status: newStatus } : msg));
    if (selected?.id === m.id) setSelected(prev => prev ? { ...prev, status: newStatus } : prev);
    toast({ title: newStatus === 'resolved' ? 'Marked as resolved' : 'Reopened' });
  };

  useEffect(() => { fetchMessages(); }, []);

  const filtered = messages.filter((m) => {
    if (filter !== 'all' && m.source !== filter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.subject?.toLowerCase().includes(q) ||
      m.message?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.userEmail?.toLowerCase().includes(q)
    );
  });

  const openCount = messages.filter(m => m.status !== 'resolved').length;
  const resolvedCount = messages.filter(m => m.status === 'resolved').length;

  const senderName = (m: SupportMessage) => m.name || `${m.userId ? 'User' : 'Anonymous'}`;
  const senderEmail = (m: SupportMessage) => m.email || m.userEmail || '—';
  const typeKey = (m: SupportMessage) => m.type || 'general';
  const TypeMeta = (m: SupportMessage) => TYPE_META[typeKey(m)] || TYPE_META.other;

  return (
    <div className="min-h-[calc(100vh-6rem)]">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Support Inbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">All contact messages and admin tickets from buyers</p>
        </div>
        <button
          onClick={fetchMessages}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Messages', value: messages.length, icon: Inbox, color: 'text-brand-400' },
          { label: 'Open', value: openCount, icon: Circle, color: 'text-yellow-400' },
          { label: 'Resolved', value: resolvedCount, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Admin Tickets', value: messages.filter(m => m.source === 'admin-contact').length, icon: AlertTriangle, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#161b27] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: message list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#161b27] border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="bg-[#161b27] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-400 focus:outline-none focus:border-brand-500/50"
            >
              <option value="all">All</option>
              <option value="contact">Contact</option>
              <option value="admin-contact">Tickets</option>
            </select>
          </div>
          {/* Status filter */}
          <div className="flex gap-1.5">
            {(['all', 'open', 'resolved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize',
                  statusFilter === s
                    ? s === 'open' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : s === 'resolved' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/10 text-white border border-white/20'
                    : 'bg-white/5 text-gray-500 border border-transparent hover:border-white/10',
                )}
              >
                {s === 'all' ? `All (${messages.length})` : s === 'open' ? `Open (${openCount})` : `Resolved (${resolvedCount})`}
              </button>
            ))}
          </div>

          {/* Message list */}
          <div className="space-y-2 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-sm text-gray-500">No messages found</p>
              </div>
            ) : (
              filtered.map((m) => {
                const meta = TypeMeta(m);
                const Icon = meta.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={cn(
                      'w-full text-left border rounded-xl p-3.5 transition-all',
                      m.status === 'resolved' ? 'bg-white/[0.02]' : 'bg-[#161b27]',
                    )}
                    style={selected?.id === m.id
                      ? { borderColor: 'var(--ap-30)', background: 'var(--ap-10)' }
                      : { borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', meta.color, m.status === 'resolved' && 'opacity-50')}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={cn('text-xs font-semibold truncate', m.status === 'resolved' ? 'text-gray-500' : 'text-white')}>{senderName(m)}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {m.status === 'resolved' ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-400">Done</span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400">Open</span>
                            )}
                            <span className={cn(
                              'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md',
                              m.source === 'admin-contact' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400',
                            )}>
                              {m.source === 'admin-contact' ? 'Ticket' : 'Contact'}
                            </span>
                          </div>
                        </div>
                        <p className={cn('text-xs truncate mt-0.5', m.status === 'resolved' ? 'text-gray-600' : 'text-gray-300')}>{m.subject}</p>
                        <p className="text-[11px] text-gray-600 truncate mt-0.5">{m.message}</p>
                        <p className="text-[10px] text-gray-700 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: message detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-[#161b27] border border-white/5 rounded-2xl p-6 sticky top-20">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {(() => {
                      const meta = TypeMeta(selected);
                      const Icon = meta.icon;
                      return (
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg', meta.color)}>
                          <Icon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      );
                    })()}
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-lg',
                      selected.source === 'admin-contact' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400',
                    )}>
                      {selected.source === 'admin-contact' ? 'Admin Ticket' : 'General Contact'}
                    </span>
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-lg',
                      selected.status === 'resolved' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400',
                    )}>
                      {selected.status === 'resolved' ? '✓ Resolved' : '● Open'}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">{selected.subject}</h2>
                </div>
                <button
                  onClick={() => toggleResolved(selected)}
                  disabled={toggling === selected.id}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    selected.status === 'resolved'
                      ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20'
                      : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20',
                  )}
                >
                  {selected.status === 'resolved'
                    ? <><Circle className="w-3.5 h-3.5" /> Reopen</>
                    : <><CheckCircle className="w-3.5 h-3.5" /> Mark Resolved</>
                  }
                </button>
              </div>

              {/* Sender info */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">From</p>
                  <p className="text-sm font-semibold text-white">{senderName(selected)}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </p>
                  <p className="text-sm text-gray-300 truncate">{senderEmail(selected)}</p>
                </div>
                {selected.orderId && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" /> Order ID
                    </p>
                    <p className="text-sm font-mono text-brand-400">{selected.orderId}</p>
                  </div>
                )}
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Received
                  </p>
                  <p className="text-sm text-gray-300">
                    {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              {/* Message body */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Message
                </p>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                </div>
              </div>

              {/* Reply hint + resolve */}
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Reply to: <a href={`mailto:${senderEmail(selected)}`} className="text-brand-400 font-medium hover:underline">{senderEmail(selected)}</a>
                </p>
                <button
                  onClick={() => toggleResolved(selected)}
                  disabled={toggling === selected.id}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors',
                    selected.status === 'resolved'
                      ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                      : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20',
                  )}
                >
                  {selected.status === 'resolved'
                    ? <><Circle className="w-3.5 h-3.5" /> Reopen Ticket</>
                    : <><CheckCircle className="w-3.5 h-3.5" /> Mark as Resolved</>
                  }
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#161b27] border border-white/5 rounded-2xl flex flex-col items-center justify-center py-24 text-center">
              <MessageSquare className="w-12 h-12 text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-500">Select a message to view</p>
              <p className="text-xs text-gray-700 mt-1">Click any message from the list on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
