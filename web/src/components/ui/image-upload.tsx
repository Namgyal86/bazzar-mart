'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Link, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } catch {}
    setUploading(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-sm font-medium">{label}</label>}

      {/* Preview */}
      {value && (
        <div className={cn('relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border', aspectClass)}>
          <Image src={value} alt="Preview" fill className="object-cover" sizes="400px" />
          <button onClick={() => { onChange(''); setUrlInput(''); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {(['url', 'file'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
              tab === t ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-muted-foreground')}>
            {t === 'url' ? <Link className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
            {t === 'url' ? 'From URL' : 'Upload File'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'url' ? (
          <motion.div key="url" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="flex gap-2">
            <Input placeholder="https://example.com/image.jpg" value={urlInput}
              onChange={e => setUrlInput(e.target.value)} className="flex-1 text-sm" />
            <Button type="button" size="sm" variant="outline"
              onClick={() => { if (urlInput) onChange(urlInput); }}>
              Apply
            </Button>
          </motion.div>
        ) : (
          <motion.div key="file" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={cn('border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors',
                dragging ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-gray-200 dark:border-gray-700 hover:border-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800/50')}>
              {uploading ? (
                <><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /><p className="text-sm text-muted-foreground">Uploading...</p></>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-medium">Drop image here or click to browse</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP up to 10MB</p>
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
