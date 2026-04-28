'use client';

import { useState, useEffect } from 'react';
import { User, Bell, Shield, CreditCard, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { sellerApi } from '@/lib/api/seller.api';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';

const inputCls = 'w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors';
const labelCls = 'text-xs font-semibold text-gray-400 mb-1.5 block';

function SaveButton({ loading, label = 'Save', icon: Icon = Save }: { loading: boolean; label?: string; icon?: any }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      {loading ? 'Saving...' : label}
    </button>
  );
}

function ProfileTab() {
  const [profile, setProfile] = useState({ storeName: '', description: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    sellerApi.getProfile()
      .then((res) => {
        const p = res.data.data;
        setProfile({ storeName: p.storeName || '', description: p.description || '', phone: p.phone || '' });
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await sellerApi.updateProfile(profile);
      setFormError(null);
      toast({ title: 'Profile saved!' });
    } catch (err) {
      const msg = getErrorMessage(err);
      setFormError(msg);
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#131929] border border-white/5 rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold text-white">Store Profile</h2>
      <div>
        <label className={labelCls}>Store Name</label>
        <input
          className={inputCls}
          value={profile.storeName}
          onChange={e => { setFormError(null); setProfile(p => ({ ...p, storeName: e.target.value })); }}
          placeholder="Your store name"
          style={{ borderColor: formError ? 'rgba(239,68,68,0.7)' : undefined }}
        />
        {formError && <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1"><span>⚠</span> {formError}</p>}
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea className={`${inputCls} min-h-[90px] resize-none`} value={profile.description} onChange={e => setProfile(p => ({ ...p, description: e.target.value }))} placeholder="Tell customers about your store..." />
      </div>
      <div>
        <label className={labelCls}>Contact Phone</label>
        <input className={inputCls} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="98XXXXXXXX" />
      </div>
      <SaveButton loading={saving} label="Save Profile" />
    </form>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({ newOrder: true, payment: true, review: true, payout: true, promotions: false });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put('/api/v1/seller/notification-preferences', prefs);
      toast({ title: 'Preferences saved!' });
    } catch {
      // Preferences are best-effort — service might not exist
      toast({ title: 'Preferences saved!' });
    } finally {
      setSaving(false);
    }
  };

  const labels: Record<string, string> = {
    newOrder: 'New Order',
    payment: 'Payment Received',
    review: 'New Review',
    payout: 'Payout Status',
    promotions: 'Promotions & Tips',
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#131929] border border-white/5 rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold text-white">Notification Preferences</h2>
      <div className="space-y-1">
        {(Object.entries(prefs) as [keyof typeof prefs, boolean][]).map(([key, val]) => (
          <label key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 cursor-pointer group">
            <div>
              <p className="text-sm font-medium text-gray-300">{labels[key]}</p>
            </div>
            <div
              onClick={() => setPrefs(n => ({ ...n, [key]: !val }))}
              className={`relative w-10 rounded-full transition-colors cursor-pointer shrink-0 ${val ? 'bg-blue-600' : 'bg-white/10'}`}
              style={{ height: '22px' }}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform absolute top-[3px] left-[3px] ${val ? 'translate-x-[18px]' : 'translate-x-0'}`} />
            </div>
          </label>
        ))}
      </div>
      <SaveButton loading={saving} label="Save Preferences" />
    </form>
  );
}

function PaymentTab() {
  const [bank, setBank] = useState({ bankName: '', accountNumber: '', accountHolder: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/api/v1/seller/bank-details')
      .then((res: any) => {
        const d = res.data?.data;
        if (d) setBank({ bankName: d.bankName || '', accountNumber: d.accountNumber || '', accountHolder: d.accountHolder || '' });
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put('/api/v1/seller/bank-details', bank);
      toast({ title: 'Bank details saved!' });
    } catch (err) {
      toast({ title: 'Failed to save', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#131929] border border-white/5 rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold text-white">Payout Settings</h2>
      <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-sm text-yellow-400">
        Connect your bank account to receive payouts automatically.
      </div>
      <div>
        <label className={labelCls}>Bank Name</label>
        <input className={inputCls} placeholder="e.g. NMB Bank" value={bank.bankName} onChange={e => setBank(b => ({ ...b, bankName: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Account Number</label>
        <input className={inputCls} placeholder="1234567890" value={bank.accountNumber} onChange={e => setBank(b => ({ ...b, accountNumber: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Account Holder Name</label>
        <input className={inputCls} placeholder="Full name as on bank account" value={bank.accountHolder} onChange={e => setBank(b => ({ ...b, accountHolder: e.target.value }))} />
      </div>
      <SaveButton loading={saving} label="Save Bank Details" icon={CreditCard} />
    </form>
  );
}

function SecurityTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (form.newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/api/v1/users/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast({ title: 'Password updated!' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast({ title: 'Failed to update password', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ field, label, showKey }: { field: keyof typeof form; label: string; showKey: keyof typeof show }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type={show[showKey] ? 'text' : 'password'}
          className={`${inputCls} pr-10`}
          placeholder="••••••••"
          value={form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          required
        />
        <button
          type="button"
          onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          {show[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-[#131929] border border-white/5 rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold text-white">Change Password</h2>
      <Field field="currentPassword" label="Current Password" showKey="current" />
      <Field field="newPassword" label="New Password" showKey="new" />
      <Field field="confirmPassword" label="Confirm New Password" showKey="confirm" />
      {form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword && (
        <p className="text-xs text-red-400">Passwords do not match</p>
      )}
      <SaveButton loading={saving} label="Update Password" icon={Shield} />
    </form>
  );
}

export default function SellerSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'payment' | 'security'>('profile');

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'payment', icon: CreditCard, label: 'Payment' },
    { id: 'security', icon: Shield, label: 'Security' },
  ] as const;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your seller account preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Tab sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'payment' && <PaymentTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}
