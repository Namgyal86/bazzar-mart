'use client';

import { useState, useEffect } from 'react';
import { Gift, Settings, Ban, Search, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { referralApi } from '@/lib/api/referral.api';
import { toast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING:    { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  SIGNED_UP:  { bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  COMPLETED:  { bg: 'bg-green-500/10',  text: 'text-green-400' },
  REWARDED:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  EXPIRED:    { bg: 'bg-gray-500/10',   text: 'text-gray-400' },
  REVOKED:    { bg: 'bg-red-500/10',    text: 'text-red-400' },
};

const inputCls = 'w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[color:var(--ap-50)] transition-colors';

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [config, setConfig] = useState<{ key: string; value: string; description: string }[]>([]);
  const [tab, setTab] = useState<'referrals' | 'config'>('referrals');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    referralApi.adminList({ limit: 100 })
      .then(res => { if (Array.isArray(res.data?.data)) setReferrals(res.data.data); })
      .catch(() => {});

    referralApi.adminGetConfig()
      .then(res => {
        if (Array.isArray(res.data?.data)) {
          setConfig(res.data.data);
          const edits: Record<string, string> = {};
          res.data.data.forEach((c: any) => { edits[c.key] = c.value; });
          setConfigEdits(edits);
        }
      })
      .catch(() => {});
  }, []);

  const handleRevoke = async (id: string) => {
    if (!revokeReason.trim()) { toast({ title: 'Enter a reason', variant: 'destructive' }); return; }
    try {
      await referralApi.adminRevoke(id, revokeReason);
      setReferrals(prev => prev.map(r => (r.id || r._id) === id ? { ...r, status: 'REVOKED' } : r));
      setRevokeId(null);
      setRevokeReason('');
      toast({ title: 'Referral revoked' });
    } catch {
      toast({ title: 'Failed to revoke', variant: 'destructive' });
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await Promise.all(
        Object.entries(configEdits).map(([key, value]) => referralApi.adminUpdateConfig(key, value))
      );
      toast({ title: 'Config saved!' });
    } catch {
      toast({ title: 'Failed to save config', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const filtered = referrals.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.referrerEmail?.toLowerCase().includes(q) || r.refereeEmail?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = [
    { label: 'Total', value: referrals.length, gradient: 'from-brand-500 to-red-500' },
    { label: 'Rewarded', value: referrals.filter(r => r.status === 'REWARDED').length, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Pending', value: referrals.filter(r => r.status === 'PENDING').length, gradient: 'from-yellow-500 to-orange-500' },
    { label: 'Revoked', value: referrals.filter(r => r.status === 'REVOKED').length, gradient: 'from-red-500 to-rose-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Referrals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage referral program</p>
        </div>
        <div className="flex gap-1.5">
          {(['referrals', 'config'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${tab === t ? 'text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
              style={tab === t ? { backgroundColor: 'var(--ap)' } : {}}
            >
              {t === 'config' ? <><Settings className="w-3.5 h-3.5 inline mr-1" />Config</> : <><Gift className="w-3.5 h-3.5 inline mr-1" />Referrals</>}
            </button>
          ))}
        </div>
      </div>

      {tab === 'referrals' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className="bg-[#1a2035] border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-5`} />
                <p className="text-3xl font-black text-white relative">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1 relative">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                placeholder="Search by email or code..."
                className="w-full bg-[#1a2035] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['ALL', 'PENDING', 'REWARDED', 'COMPLETED', 'EXPIRED', 'REVOKED'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${statusFilter === s ? 'text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  style={statusFilter === s ? { backgroundColor: 'var(--ap)' } : {}}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1a2035] border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Referrer', 'Referee', 'Code', 'Status', 'Date', 'Action'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(r => {
                    const id = r.id || r._id;
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
                    return (
                      <tr key={id} className="hover:bg-white/3 transition-colors">
                        <td className="px-5 py-4 text-sm text-white">{r.referrerEmail || r.referrerId || '—'}</td>
                        <td className="px-5 py-4 text-sm text-gray-400">{r.refereeEmail || r.refereeId || '—'}</td>
                        <td className="px-5 py-4 font-mono text-xs text-brand-400">{r.code || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.text}`}>{r.status}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                        <td className="px-5 py-4">
                          {r.status !== 'REVOKED' && r.status !== 'EXPIRED' && (
                            revokeId === id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  className="bg-[#0f1117] border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-32 focus:outline-none"
                                  placeholder="Reason..."
                                  value={revokeReason}
                                  onChange={e => setRevokeReason(e.target.value)}
                                />
                                <button onClick={() => handleRevoke(id)} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">Confirm</button>
                                <button onClick={() => { setRevokeId(null); setRevokeReason(''); }} className="text-xs px-2 py-1 bg-white/5 text-gray-400 rounded-lg">Cancel</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRevokeId(id)}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
                              >
                                <Ban className="w-3 h-3" /> Revoke
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <Gift className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No referrals found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'config' && (
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-white mb-2">Referral Program Config</h2>
          {config.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">No config keys found</p>
          ) : (
            config.map(c => (
              <div key={c.key}>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">{c.key}</label>
                {c.description && <p className="text-[11px] text-gray-600 mb-1.5">{c.description}</p>}
                <input
                  className={inputCls}
                  value={configEdits[c.key] ?? c.value}
                  onChange={e => setConfigEdits(prev => ({ ...prev, [c.key]: e.target.value }))}
                />
              </div>
            ))
          )}
          {config.length > 0 && (
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="flex items-center gap-1.5 px-4 py-2 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--ap)' }}
            >
              {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              {savingConfig ? 'Saving…' : 'Save Config'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
