'use client';

import { useState, useEffect } from 'react';
import { Store, Image as ImageIcon, Save, Eye, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ImageUpload } from '@/components/ui/image-upload';
import { sellerApi, SellerProfile } from '@/lib/api/seller.api';
import { toast } from '@/hooks/use-toast';

const inputCls = 'w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors';
const labelCls = 'text-xs font-semibold text-gray-400 mb-1.5 block';

export default function StorefrontPage() {
  const [profile, setProfile] = useState<Partial<SellerProfile> & { category?: string; userId?: string }>({
    storeName: '',
    description: '',
    logo: '',
    banner: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sellerApi.getProfile()
      .then((res) => setProfile(res.data.data as any))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await sellerApi.updateProfile(profile);
      toast({ title: 'Storefront updated!' });
    } catch {
      toast({ title: 'Failed to save storefront', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Storefront</h1>
          <p className="text-gray-500 text-sm mt-0.5">Customize how your store appears to customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const slug = (profile as any).storeSlug || (profile as any).userId || (profile as any)._id;
              if (slug) window.open(`/store/${slug}`, '_blank');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-400 bg-[#131929] border border-white/10 rounded-xl hover:border-white/20 hover:text-gray-300 transition-all"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Store Info */}
          <div className="bg-[#131929] border border-white/5 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-400" /> Store Info
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Store Name</label>
                <input
                  className={inputCls}
                  value={profile.storeName || ''}
                  onChange={e => setProfile(p => ({ ...p, storeName: e.target.value }))}
                  placeholder="Your store name"
                />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  className={`${inputCls} min-h-[90px] resize-none`}
                  value={profile.description || ''}
                  onChange={e => setProfile(p => ({ ...p, description: e.target.value }))}
                  placeholder="Tell customers about your store..."
                />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-[#131929] border border-white/5 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-400" /> Branding
            </h2>
            <div className="space-y-5">
              <ImageUpload
                value={profile.logo || ''}
                onChange={url => setProfile(p => ({ ...p, logo: url }))}
                label="Store Logo"
                aspectRatio="square"
                className="[&_label]:text-gray-400 [&_label]:text-xs [&_label]:font-semibold"
              />
              <ImageUpload
                value={profile.banner || ''}
                onChange={url => setProfile(p => ({ ...p, banner: url }))}
                label="Store Banner (recommended 1200×300px)"
                aspectRatio="wide"
                className="[&_label]:text-gray-400 [&_label]:text-xs [&_label]:font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[#131929] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Live Preview</p>
            <Eye className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-700 relative overflow-hidden">
            {profile.banner && <img src={profile.banner} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-indigo-700/50" />
          </div>
          <div className="px-5 pb-5">
            <div className="flex items-end gap-3 -mt-8 mb-3">
              <div className="w-16 h-16 bg-[#0d1117] border-2 border-[#131929] rounded-2xl flex items-center justify-center text-3xl shadow-xl shrink-0">
                {profile.logo ? <img src={profile.logo} alt="Logo" className="w-full h-full object-cover rounded-2xl" /> : '🏪'}
              </div>
              <div className="pb-1">
                <h3 className="font-bold text-lg text-white">{profile.storeName || 'Your Store'}</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">{profile.description || 'Your store description will appear here'}</p>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                <CheckCircle className="w-3 h-3" /> APPROVED
              </span>
              {(profile as any).category && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                  {(profile as any).category}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
