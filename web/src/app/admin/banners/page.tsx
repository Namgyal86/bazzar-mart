'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Loader2, Save, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { bannerApi, type Banner } from '@/lib/api/product.api';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const EMPTY_BANNER: Partial<Banner> = {
  title: '',
  subtitle: '',
  description: '',
  eyebrow: '',
  badge: '',
  cta: 'Shop Now',
  ctaLink: '/products',
  image: '',
  accentColor: '#6366f1',
  order: 0,
  isActive: true,
};

function BannerForm({
  initial,
  onSave,
  onCancel,
  saving,
  formError,
  onClearError,
}: {
  initial: Partial<Banner>;
  onSave: (data: Partial<Banner>) => void;
  onCancel: () => void;
  saving: boolean;
  formError?: string | null;
  onClearError?: () => void;
}) {
  const [form, setForm] = useState<Partial<Banner>>(initial);
  const set = (key: keyof Banner, value: any) => { setForm(f => ({ ...f, [key]: value })); if (key === 'title') onClearError?.(); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-[#1a2035] rounded-2xl border border-white/10 p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{initial._id ? 'Edit Banner' : 'New Banner'}</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Eyebrow Text</label>
            <Input
              value={form.eyebrow || ''}
              onChange={e => set('eyebrow', e.target.value)}
              placeholder="e.g. New Arrivals"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Title *</label>
            <Input
              value={form.title || ''}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Premium Electronics"
              className={`bg-white/5 text-white placeholder:text-gray-600 ${formError ? 'border-red-500/70' : 'border-white/10'}`}
            />
            {formError && <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1"><span>⚠</span> {formError}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Subtitle</label>
            <Input
              value={form.subtitle || ''}
              onChange={e => set('subtitle', e.target.value)}
              placeholder="e.g. Up to 40% off"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Description</label>
            <textarea
              value={form.description || ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Short description for this banner slide"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 text-sm resize-none outline-none ap-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Badge Text</label>
              <Input
                value={form.badge || ''}
                onChange={e => set('badge', e.target.value)}
                placeholder="e.g. Limited Time"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.accentColor || '#6366f1'}
                  onChange={e => set('accentColor', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
                />
                <Input
                  value={form.accentColor || ''}
                  onChange={e => set('accentColor', e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">CTA Button Text</label>
              <Input
                value={form.cta || ''}
                onChange={e => set('cta', e.target.value)}
                placeholder="Shop Now"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">CTA Link</label>
              <Input
                value={form.ctaLink || ''}
                onChange={e => set('ctaLink', e.target.value)}
                placeholder="/products"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Display Order</label>
              <Input
                type="number"
                value={form.order ?? 0}
                onChange={e => set('order', Number(e.target.value))}
                min={0}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Status</label>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={cn(
                  'w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors border',
                  form.isActive
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-white/5 border-white/10 text-gray-500',
                )}
              >
                {form.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {form.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        </div>

        {/* Right column – Image upload */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Banner Image</label>
          <ImageUpload
            value={form.image}
            onChange={url => set('image', url)}
            aspectRatio="wide"
            label=""
          />
          {form.image && (
            <p className="text-xs text-gray-500 mt-2 truncate">{form.image}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-white/5">
        <Button
          onClick={() => onSave(form)}
          disabled={saving || !form.title}
          className="gap-2 text-white"
          style={{ backgroundColor: 'var(--ap)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Banner'}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-white">
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

function BannerCard({
  banner,
  onEdit,
  onDelete,
  onToggle,
}: {
  banner: Banner;
  onEdit: (b: Banner) => void;
  onDelete: (id: string) => void;
  onToggle: (b: Banner) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-[#1a2035] rounded-2xl border border-white/10 overflow-hidden"
    >
      <div className="flex items-stretch gap-0">
        {/* Drag handle */}
        <div className="flex items-center px-3 text-gray-700 cursor-grab hover:text-gray-500">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Image preview */}
        <div className="w-36 h-24 bg-gray-800 shrink-0 relative overflow-hidden">
          {banner.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-600" />
            </div>
          )}
          {banner.accentColor && (
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: banner.accentColor }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {banner.eyebrow && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-400 mb-0.5">{banner.eyebrow}</p>
              )}
              <h3 className="font-bold text-white text-sm truncate">{banner.title}</h3>
              {banner.subtitle && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{banner.subtitle}</p>
              )}
              {banner.description && (
                <p className="text-xs text-gray-600 truncate mt-1 hidden md:block">{banner.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={banner.isActive ? 'default' : 'secondary'}
                className={banner.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-gray-500 border-white/10'}
              >
                {banner.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">Order: {banner.order ?? 0}</span>
            {banner.cta && (
              <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">CTA: {banner.cta}</span>
            )}
            {banner.badge && (
              <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{banner.badge}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 justify-center px-3 border-l border-white/5">
          <button
            onClick={() => onToggle(banner)}
            title={banner.isActive ? 'Deactivate' : 'Activate'}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          >
            {banner.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onEdit(banner)}
            title="Edit"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 transition-colors ap-text hover:opacity-80"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(banner._id)}
            title="Delete"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadBanners = async () => {
    try {
      const res = await bannerApi.listAll();
      setBanners(res.data.data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch {
      toast({ title: 'Failed to load banners', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBanners(); }, []);

  const handleSave = async (data: Partial<Banner>) => {
    if (!data.title) return;
    setSaving(true);
    try {
      if (data._id) {
        await bannerApi.update(data._id, data);
        toast({ title: 'Banner updated!' });
      } else {
        await bannerApi.create(data);
        toast({ title: 'Banner created!' });
      }
      setEditing(null);
      await loadBanners();
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to save banner';
      setFormError(msg);
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await bannerApi.delete(id);
      toast({ title: 'Banner deleted' });
      await loadBanners();
    } catch {
      toast({ title: 'Failed to delete banner', variant: 'destructive' });
    }
  };

  const handleToggle = async (banner: Banner) => {
    try {
      await bannerApi.update(banner._id, { isActive: !banner.isActive });
      toast({ title: banner.isActive ? 'Banner deactivated' : 'Banner activated' });
      await loadBanners();
    } catch {
      toast({ title: 'Failed to update banner', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hero Banners</h1>
          <p className="text-sm text-gray-500 mt-1">Manage the hero carousel slides shown on the home page</p>
        </div>
        <Button
          onClick={() => setEditing({ ...EMPTY_BANNER, order: banners.length })}
          disabled={!!editing}
          className="gap-2 text-white"
          style={{ backgroundColor: 'var(--ap)' }}
        >
          <Plus className="w-4 h-4" />
          Add Banner
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Banners', value: banners.length },
          { label: 'Active', value: banners.filter(b => b.isActive).length },
          { label: 'Inactive', value: banners.filter(b => !b.isActive).length },
        ].map(stat => (
          <div key={stat.label} className="bg-[#161b27] rounded-xl border border-white/5 px-4 py-3">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Form (create / edit) */}
      <AnimatePresence mode="wait">
        {editing && (
          <BannerForm
            key={editing._id || 'new'}
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setFormError(null); }}
            saving={saving}
            formError={formError}
            onClearError={() => setFormError(null)}
          />
        )}
      </AnimatePresence>

      {/* Banner list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin ap-text" />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No banners yet</p>
          <p className="text-sm mt-1">Click "Add Banner" to create your first hero slide</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {banners.map(banner => (
              <BannerCard
                key={banner._id}
                banner={banner}
                onEdit={b => setEditing({ ...b })}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-xl p-4" style={{ background: 'var(--ap-10)', border: '1px solid var(--ap-20)' }}>
        <p className="text-xs font-semibold mb-1 ap-text">How Hero Banners Work</p>
        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
          <li>Only <strong className="text-gray-400">Active</strong> banners appear in the home page hero carousel</li>
          <li>Banners are displayed in <strong className="text-gray-400">Order</strong> (lowest number first)</li>
          <li>Image dimensions of <strong className="text-gray-400">1200×600px</strong> or wider recommended</li>
          <li>Use the <strong className="text-gray-400">Accent Color</strong> to match your product theme</li>
        </ul>
      </div>
    </div>
  );
}
