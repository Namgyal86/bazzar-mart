'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, X, Loader2, Package, DollarSign, Image as ImageIcon, Save } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from '@/hooks/use-toast';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import Link from 'next/link';

const schema = z.object({
  name:        z.string().min(3, 'At least 3 characters'),
  description: z.string().min(20, 'At least 20 characters'),
  price:       z.coerce.number().min(1, 'Required'),
  salePrice:   z.coerce.number().optional(),
  stock:       z.coerce.number().min(0),
  category:    z.string().min(1, 'Select a category'),
  brand:       z.string().optional(),
  tags:        z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  'Fruits & Vegetables', 'Dairy & Eggs', 'Grains & Pulses', 'Meat & Seafood',
  'Snacks & Beverages', 'Spices & Condiments', 'Personal Care', 'Household Items',
  'Frozen Foods', 'Bakery & Bread',
];

const sectionCls = 'rounded-2xl p-6 space-y-4';
const sectionStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all';
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };
const labelCls = 'text-sm font-medium text-gray-400 mb-1.5 block';

function FieldInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        className={inputCls}
        style={{ ...inputStyle, borderColor: error ? 'rgba(239,68,68,0.5)' : undefined }}
        {...props}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [images, setImages] = useState<string[]>(['']);
  const [fetching, setFetching] = useState(true);

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const price = watch('price');
  const salePrice = watch('salePrice');
  const discount = price && salePrice && salePrice < price
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/api/v1/products/${id}`)
      .then((res: any) => {
        const p = res.data?.data ?? res.data;
        if (!p) return;
        reset({
          name:        p.name ?? '',
          description: p.description ?? '',
          price:       p.price ?? p.basePrice ?? 0,
          salePrice:   p.salePrice ?? p.price ?? 0,
          stock:       p.stock ?? 0,
          category:    p.category?.name ?? p.category ?? '',
          brand:       p.brand ?? '',
          tags:        Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags ?? ''),
        });
        if (Array.isArray(p.images) && p.images.length > 0) setImages(p.images);
      })
      .catch(() => toast({ title: 'Could not load product', variant: 'destructive' }))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const updateImage = (i: number, url: string) => setImages(p => p.map((img, idx) => idx === i ? url : img));
  const removeImage = (i: number)              => setImages(p => p.filter((_, idx) => idx !== i));

  const onSubmit = async (data: FormData) => {
    try {
      await apiClient.put(`/api/v1/seller/products/${id}`, {
        ...data,
        images: images.filter(Boolean),
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
      });
      toast({ title: 'Product updated!', description: `${data.name} has been saved.` });
      router.push('/seller/products');
    } catch (err) {
      toast({ title: 'Update failed', description: getErrorMessage(err), variant: 'destructive' });
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/seller/products">
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:brightness-125"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white">Edit Product</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update product details and pricing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic Info */}
        <div className={sectionCls} style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="font-semibold text-white text-sm">Basic Information</h2>
          </div>

          <div>
            <label className={labelCls}>Product Name *</label>
            <FieldInput placeholder="e.g. Samsung Galaxy S24 Ultra" error={errors.name?.message} {...register('name')} />
          </div>

          <div>
            <label className={labelCls}>Description *</label>
            <textarea
              {...register('description')}
              rows={5}
              placeholder="Describe your product in detail..."
              className={`${inputCls} resize-none`}
              style={inputStyle}
            />
            {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category *</label>
              <select
                {...register('category')}
                className={inputCls}
                style={{ ...inputStyle, color: 'white' }}
              >
                <option value="" style={{ background: '#1a2035' }}>Select category</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c} style={{ background: '#1a2035' }}>{c}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <FieldInput placeholder="e.g. Samsung, Nike…" {...register('brand')} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Tags <span className="text-gray-600 font-normal">(comma separated)</span></label>
            <FieldInput placeholder="smartphone, 5g, android…" {...register('tags')} />
          </div>
        </div>

        {/* Pricing */}
        <div className={sectionCls} style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="font-semibold text-white text-sm">Pricing & Inventory</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Original Price (Rs.) *</label>
              <FieldInput type="number" placeholder="0" error={errors.price?.message} {...register('price')} />
            </div>
            <div>
              <label className={labelCls}>Sale Price (Rs.)</label>
              <FieldInput type="number" placeholder="0" {...register('salePrice')} />
              {discount > 0 && <p className="text-xs text-green-400 mt-1">{discount}% off</p>}
            </div>
            <div>
              <label className={labelCls}>Stock *</label>
              <FieldInput type="number" placeholder="0" error={errors.stock?.message} {...register('stock')} />
            </div>
          </div>

          {price > 0 && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Price Preview</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-black text-white">Rs. {(salePrice || price)?.toLocaleString()}</span>
                {discount > 0 && (
                  <>
                    <span className="text-gray-600 line-through text-sm">Rs. {price?.toLocaleString()}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold text-green-400" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Images */}
        <div className={sectionCls} style={sectionStyle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)' }}>
                <ImageIcon className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">Product Images</h2>
                <p className="text-xs text-gray-600 mt-0.5">Paste a URL or upload from your device</p>
              </div>
            </div>
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => setImages(p => [...p, ''])}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 rounded-xl transition-all hover:brightness-125"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Image
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((url, i) => (
              <div key={i} className="relative">
                <ImageUpload
                  value={url}
                  onChange={newUrl => updateImage(i, newUrl)}
                  label={i === 0 ? 'Main Image' : `Image ${i + 1}`}
                  aspectRatio="video"
                />
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0 right-0 mt-6 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-400 rounded-xl transition-all hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:brightness-110 disabled:opacity-60 shadow-lg flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
