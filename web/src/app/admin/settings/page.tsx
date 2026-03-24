'use client';

import { useState } from 'react';
import { Palette, Globe, Shield, Check, Save, Eye, Image as ImageIcon } from 'lucide-react';
import { useThemeStore, THEME_PRESETS } from '@/store/theme.store';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from '@/hooks/use-toast';

const inputCls = 'w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--ap)] transition-colors';
const labelCls = 'text-xs font-semibold text-gray-400 mb-1.5 block';

export default function AdminSettingsPage() {
  const { themeName, logo, siteName, setTheme, setLogo, setSiteName, getPreset } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'general' | 'security'>('appearance');
  const [localLogo, setLocalLogo] = useState(logo);
  const [localSiteName, setLocalSiteName] = useState(siteName);
  const [saving, setSaving] = useState(false);
  const preset = getPreset();

  const handleSave = async () => {
    setSaving(true);
    setLogo(localLogo);
    setSiteName(localSiteName);
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    toast({ title: 'Settings saved!', description: 'Your branding changes are now live.' });
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure your admin panel appearance and platform settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0f1117] border border-white/5 rounded-2xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            style={activeTab === tab.id ? { backgroundColor: 'var(--ap-20)', color: 'var(--ap)' } : {}}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Settings panel */}
          <div className="lg:col-span-3 space-y-6">
            {/* Theme color picker */}
            <div className="bg-[#131929] border border-white/5 rounded-2xl p-6">
              <h2 className="font-bold text-white mb-1 flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: 'var(--ap)' }} />
                Admin Theme Color
              </h2>
              <p className="text-xs text-gray-500 mb-5">Choose the accent color for the admin panel</p>
              <div className="grid grid-cols-4 gap-3">
                {THEME_PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setTheme(p.name)}
                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                      themeName === p.name
                        ? 'border-white/30 bg-white/5'
                        : 'border-white/5 hover:border-white/15 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-full shadow-lg relative flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${p.preview}, ${p.previewTo})` }}
                    >
                      {themeName === p.name && (
                        <Check className="w-5 h-5 text-white drop-shadow" />
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${themeName === p.name ? 'text-white' : 'text-gray-500'}`}>
                      {p.label}
                    </span>
                    {themeName === p.name && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ap)' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Branding */}
            <div className="bg-[#131929] border border-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4" style={{ color: 'var(--ap)' }} />
                Branding
              </h2>

              <div>
                <label className={labelCls}>Site Name</label>
                <input
                  className={inputCls}
                  value={localSiteName}
                  onChange={e => setLocalSiteName(e.target.value)}
                  placeholder="Bazzar"
                />
              </div>

              <div>
                <label className={labelCls}>Logo URL</label>
                <ImageUpload
                  value={localLogo}
                  onChange={setLocalLogo}
                  label="Admin Logo (shown in header)"
                  aspectRatio="square"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Leave empty to use the default shield icon
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 shadow-lg"
                style={{ backgroundColor: 'var(--ap)', boxShadow: 'var(--ap-30) 0 8px 20px' }}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:col-span-2">
            <div className="bg-[#131929] border border-white/5 rounded-2xl overflow-hidden sticky top-24">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Preview</p>
                <Eye className="w-3.5 h-3.5 text-gray-600" />
              </div>

              {/* Mini admin header */}
              <div className="p-4 bg-[#161b27] border-b border-white/5 flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${preset.preview}, ${preset.previewTo})` }}
                >
                  {localLogo ? (
                    <img src={localLogo} alt="logo" className="w-5 h-5 object-contain rounded" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <span className="text-xs font-bold text-white">{localSiteName || 'Bazzar'}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--ap)' }}>Admin</span>
              </div>

              {/* Mini sidebar */}
              <div className="p-3 space-y-1 bg-[#161b27]">
                {['Dashboard', 'Users', 'Orders', 'Settings'].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                    style={i === 0 ? {
                      background: `linear-gradient(90deg, ${preset.preview}30, ${preset.preview}10)`,
                      color: preset.preview,
                      border: `1px solid ${preset.preview}30`,
                    } : { color: '#6b7280' }}
                  >
                    <div className="w-3 h-3 rounded bg-current opacity-60" />
                    {item}
                    {i === 0 && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: preset.preview }} />}
                  </div>
                ))}
              </div>

              {/* Mini button preview */}
              <div className="p-4 border-t border-white/5 space-y-3">
                <button
                  className="w-full py-2 rounded-xl text-xs font-bold text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${preset.preview}, ${preset.previewTo})` }}
                >
                  Primary Button
                </button>
                <div className="flex gap-2">
                  <div
                    className="flex-1 h-8 rounded-lg border text-[10px] flex items-center justify-center font-medium"
                    style={{ borderColor: `${preset.preview}40`, color: preset.preview, background: `${preset.preview}10` }}
                  >
                    Badge Active
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-white/5 text-[10px] flex items-center justify-center font-medium text-gray-500">
                    Badge Default
                  </div>
                </div>
                <div
                  className="p-2 rounded-xl text-[10px] text-gray-400 border"
                  style={{ borderColor: `${preset.preview}20`, background: `${preset.preview}08` }}
                >
                  <span style={{ color: preset.preview }}>●</span> Active notification dot
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="bg-[#131929] border border-white/5 rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white">General Settings</h2>
          <div className="space-y-4">
            {[
              { label: 'Maintenance Mode', desc: 'Put the platform in maintenance mode', key: 'maintenance' },
              { label: 'User Registration', desc: 'Allow new users to register', key: 'registration' },
              { label: 'Seller Applications', desc: 'Accept new seller applications', key: 'sellerApps' },
              { label: 'Product Reviews', desc: 'Allow customers to leave reviews', key: 'reviews' },
            ].map(setting => (
              <div key={setting.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-white">{setting.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{setting.desc}</p>
                </div>
                <div
                  className="relative w-10 h-[22px] bg-white/10 rounded-full cursor-pointer transition-colors"
                  onClick={e => {
                    const el = e.currentTarget;
                    const isOn = el.dataset.on === 'true';
                    el.dataset.on = String(!isOn);
                    el.style.backgroundColor = !isOn ? 'var(--ap)' : '';
                    const knob = el.querySelector('div') as HTMLElement;
                    if (knob) knob.style.transform = !isOn ? 'translateX(18px)' : '';
                  }}
                  style={setting.key === 'registration' || setting.key === 'reviews' ? { backgroundColor: 'var(--ap)' } : {}}
                  data-on={setting.key === 'registration' || setting.key === 'reviews' ? 'true' : 'false'}
                >
                  <div
                    className="w-4 h-4 bg-white rounded-full shadow absolute top-[3px] left-[3px] transition-transform"
                    style={setting.key === 'registration' || setting.key === 'reviews' ? { transform: 'translateX(18px)' } : {}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-[#131929] border border-white/5 rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white">Security Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Session Timeout (minutes)', value: '60' },
              { label: 'Max Login Attempts', value: '5' },
              { label: 'Rate Limit (req/min)', value: '100' },
              { label: 'JWT Expiry (hours)', value: '24' },
            ].map(field => (
              <div key={field.label}>
                <label className={labelCls}>{field.label}</label>
                <input className={inputCls} defaultValue={field.value} type="number" />
              </div>
            ))}
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
            style={{ backgroundColor: 'var(--ap)' }}
            onClick={() => toast({ title: 'Security settings saved!' })}
          >
            <Save className="w-4 h-4" />
            Save Security Settings
          </button>
        </div>
      )}
    </div>
  );
}
