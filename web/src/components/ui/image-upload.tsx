'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Link, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
}

export function ImageUpload({ value, onChange, label = 'Image', className, aspectRatio = 'square' }: ImageUploadProps) {
  const [tab, setTab] = useState<'url' | 'file'>('url');
  const [urlInput, setUrlInput] = useState(value || '');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-video' : 'aspect-[3/1]';

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch('/api/v1/upload/image', { method: 'POST', body: form, headers });
      const data = await res.json();
      const url = data.data?.url ?? data.url;
      if (url) onChange(url);
    } catch {}
    setUploading(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      {value && (
        <div className={cn('relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border', aspectClass)}>
          <Image src={value} alt="Preview" fill className="object-cover" sizes="400px" />
          <button onClick={() => { onChange(''); setUrlInput(''); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['url', 'file'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
              tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'url' ? 'URL' : 'Upload'}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {tab === 'url' ? (
          <motion.div key="url" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex gap-2">
            <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/image.jpg" className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => { if (urlInput) onChange(urlInput); }}>
              <Link className="w-4 h-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div key="file" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className={cn('border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50')}>
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 5MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
