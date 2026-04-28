'use client';

import { useState, useEffect, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, X, Package, DollarSign, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from '@/hooks/use-toast';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import { categoryApi, CategoryWithSubs } from '@/lib/api/product.api';
import Link from 'next/link';
import { useSiteSettingsStore } from '@/store/site-settings.store';

const schema = z.object({
  name:        z.string().min(3, 'At least 3 characters'),
  description: z.string().min(20, 'At least 20 characters'),
  price:       z.number({ invalid_type_error: 'Enter a valid price' }).min(1, 'Price is required'),
  salePrice:   z.preprocess(
    v => (typeof v === 'number' && isNaN(v)) ? undefined : v,
    z.number({ invalid_type_error: 'Enter a valid price' }).min(0).optional()
  ),
  stock:       z.number({ invalid_type_error: 'Enter a valid quantity' }).int().min(0, 'Enter a valid quantity'),
  category:    z.string().min(1, 'Select a category'),
  subCategory: z.string().min(1, 'Select a subcategory'),
  brand:       z.string().optional(),
  tags:        z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const sectionCls = 'rounded-2xl p-6 space-y-4';
const sectionStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all';
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };
const labelCls = 'text-sm font-medium text-gray-400 mb-1.5 block';

const FieldInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  ({ placeholder, type = 'text', error, ...props }, ref) => (
    <div>
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        className={inputCls}
        style={{ ...inputStyle, borderColor: error ? 'rgba(239,68,68,0.5)' : undefined }}
        {...props}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
);

export default function NewProductPage() {
  const router = useRouter();
  const { settings } = useSiteSettingsStore();
  const [images, setImages] = useState<string[]>(['']);
  const [apiError, setApiError] = useState<string | null>(null);
  const [catTree, setCatTree] = useState<CategoryWithSubs[]>([]);

  useEffect(() => {
    categoryApi.withSubs()
      .then((res: any) => setCatTree(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { stock: 10 },
  });

  const selectedCategory = watch('category');
  const subCats = catTree.find(c => c.name === selectedCategory)?.subcategories ?? [];

  const priceRaw     = watch('price');
  const salePriceRaw = watch('salePrice');
  const price        = Number(priceRaw) || 0;
  const salePrice    = Number(salePriceRaw) || 0;
  const discount     = price > 0 && salePrice > 0 && salePrice < price
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  const updateImage = (i: number, url: string) => setImages(p => p.map((img, idx) => idx === i ? url : img));
  const removeImage = (i: number)              => setImages(p => p.filter((_, idx) => idx !== i));
  const addImage    = ()                        => setImages(p => [...p, '']);

  const onSubmit = async (data: FormData) => {
    try {
      await apiClient.post('/api/v1/seller/products', {
        name:        data.name,
        description: data.description,
        price:       data.price,
        stock:       data.stock,
        category:    data.category,
        subCategory: data.subCategory,
        salePrice:   data.salePrice || undefined,
        brand:       data.brand || undefined,
        tags:        data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images:      images.filter(Boolean),
      });
      setApiError(null);
      toast({ title: 'Product created!', description: `${data.name} is now live.` });
      router.push('/seller/products');
    } catch (err) {
      const msg = getErrorMessage(err);
      setApiError(msg);
      toast({ title: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
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
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Add New Product
            <Sparkles className="w-5 h-5 text-indigo-400 opacity-70" />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the details to list your product on {settings.siteName || 'Bazzar'}</p>
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
            <FieldInput placeholder="e.g. Organic Tomatoes 1kg" error={errors.name?.message} {...register('name')} />
          </div>

          <div>
            <label className={labelCls}>Description *</label>
            <textarea
              {...register('description')}
              rows={5}
              placeholder="Describe your product — features, specifications, what's in the box..."
              className={`${inputCls} resize-none`}
              style={inputStyle}
            />
            {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
          </div>

          {/* Category → Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category *</label>
              <select
                {...register('category', {
                  onChange: () => setValue('subCategory', ''),
                })}
                className={inputCls}
                style={{ ...inputStyle, color: selectedCategory ? 'white' : '#6b7280', borderColor: errors.category ? 'rgba(239,68,68,0.5)' : undefined }}
              >
                <option value="" style={{ background: '#1a2035' }}>Select category</option>
                {catTree.map(c => (
                  <option key={c._id} value={c.name} style={{ background: '#1a2035' }}>{c.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Subcategory *</label>
              <select
                {...register('subCategory')}
                disabled={!selectedCategory}
                className={inputCls}
                style={{
                  ...inputStyle,
                  color: watch('subCategory') ? 'white' : '#6b7280',
                  borderColor: errors.subCategory ? 'rgba(239,68,68,0.5)' : undefined,
                  opacity: !selectedCategory ? 0.5 : 1,
                  cursor: !selectedCategory ? 'not-allowed' : 'default',
                }}
              >
                <option value="" style={{ background: '#1a2035' }}>
                  {!selectedCategory ? 'Select category first' : subCats.length === 0 ? 'No subcategories' : 'Select subcategory'}
                </option>
                {subCats.map(s => (
                  <option key={s._id} value={s.name} style={{ background: '#1a2035' }}>{s.name}</option>
                ))}
              </select>
              {errors.subCategory && <p className="text-xs text-red-400 mt-1">{errors.subCategory.message}</p>}
              {selectedCategory && subCats.length === 0 && (
                <p className="text-xs text-yellow-500 mt-1">No subcategories available for this category</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Brand</label>
              <FieldInput placeholder="e.g. Amul, Nestlé…" {...register('brand')} />
            </div>
            <div>
              <label className={labelCls}>Tags <span className="text-gray-600 font-normal">(comma separated)</span></label>
              <FieldInput placeholder="organic, fresh, local…" {...register('tags')} />
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
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
              <FieldInput type="number" placeholder="0" error={errors.price?.message} {...register('price', { valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelCls}>Sale Price (Rs.)</label>
              <FieldInput type="number" placeholder="0" {...register('salePrice', { valueAsNumber: true })} />
              {discount > 0 && <p className="text-xs text-green-400 mt-1">–{discount}% off</p>}
            </div>
            <div>
              <label className={labelCls}>Stock Quantity *</label>
              <FieldInput type="number" placeholder="0" error={errors.stock?.message} {...register('stock', { valueAsNumber: true })} />
            </div>
          </div>

          {price > 0 && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Price Preview</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-black text-white">Rs. {(salePrice > 0 ? salePrice : price).toLocaleString()}</span>
                {discount > 0 && (
                  <>
                    <span className="text-gray-600 line-through text-sm">Rs. {price.toLocaleString()}</span>
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
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,146,60,0.12)' }}>
                <ImageIcon className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">Product Images</h2>
                <p className="text-xs text-gray-600 mt-0.5">Add up to 5 images — paste a URL or upload</p>
              </div>
            </div>
            {images.length < 5 && (
              <button
                type="button"
                onClick={addImage}
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
        {apiError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <span>⚠</span> {apiError}
          </p>
        )}
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
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Create Product</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
