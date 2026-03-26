'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Save, X, Image as ImageIcon,
  Loader2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, FolderOpen, Folder,
} from 'lucide-react';
import { categoryApi, type Category } from '@/lib/api/product.api';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

type CatWithSubs = Category & { subcategories?: Category[] };

const EMPTY = (parentSlug?: string): Partial<Category> => ({
  name: '', slug: '', description: '', image: '', sortOrder: 0,
  isActive: true, showInNav: true,
  parentCategory: parentSlug ?? '',
});

export default function AdminCategoriesPage() {
  const [all, setAll] = useState<Category[]>([]);
  const [tree, setTree] = useState<CatWithSubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Partial<Category>>(EMPTY());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const buildTree = (cats: Category[]): CatWithSubs[] => {
    const parents = cats.filter(c => !c.parentCategory);
    return parents.map(p => ({
      ...p,
      subcategories: cats.filter(c => c.parentCategory === p.slug),
    }));
  };

  const load = () => {
    setLoading(true);
    categoryApi.listAll()
      .then(res => {
        const cats = res.data.data;
        setAll(cats);
        setTree(buildTree(cats));
        // auto-expand all parents
        setExpanded(new Set(cats.filter(c => !c.parentCategory).map(c => c._id)));
      })
      .catch(() => toast({ title: 'Failed to load categories', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = (parentSlug?: string) => {
    setForm(EMPTY(parentSlug));
    setEditId('new');
  };

  const openEdit = (cat: Category) => {
    setForm({ ...cat });
    setEditId(cat._id);
  };

  const closeForm = () => { setEditId(null); setForm(EMPTY()); };

  const handleNameChange = (name: string) => {
    setForm(f => ({
      ...f, name,
      slug: editId === 'new'
        ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : f.slug,
    }));
  };

  const save = async () => {
    if (!form.name?.trim()) return toast({ title: 'Name is required', variant: 'destructive' });
    setSaving(true);
    try {
      if (editId === 'new') {
        await categoryApi.create(form);
        toast({ title: `${form.parentCategory ? 'Subcategory' : 'Category'} created` });
      } else if (editId) {
        await categoryApi.update(editId, form);
        toast({ title: 'Saved' });
      }
      closeForm();
      load();
    } catch (e: any) {
      toast({ title: e?.response?.data?.error || 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (cat: Category, field: 'showInNav' | 'isActive') => {
    try {
      await categoryApi.update(cat._id, { [field]: !cat[field] });
      setAll(prev => prev.map(c => c._id === cat._id ? { ...c, [field]: !c[field] } : c));
      setTree(buildTree(all.map(c => c._id === cat._id ? { ...c, [field]: !c[field] } : c)));
    } catch { toast({ title: 'Update failed', variant: 'destructive' }); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    // also delete subcategories whose parent matches
    const toDelete = all.filter(c => c._id === deleteId || c.parentCategory === all.find(x => x._id === deleteId)?.slug);
    try {
      await Promise.all(toDelete.map(c => categoryApi.delete(c._id)));
      toast({ title: `Deleted ${toDelete.length > 1 ? `${toDelete.length} items` : 'category'}` });
      setDeleteId(null);
      load();
    } catch { toast({ title: 'Delete failed', variant: 'destructive' }); }
  };

  const parentCategories = all.filter(c => !c.parentCategory);

  const CategoryRow = ({ cat, isSubcat = false }: { cat: Category; isSubcat?: boolean }) => (
    <tr className="transition-colors hover:bg-white/[0.02] group">
      {/* Image */}
      <td className={`px-4 py-3 ${isSubcat ? 'pl-12' : ''}`}>
        <div className="flex items-center gap-3">
          {isSubcat && <div className="w-3 border-l-2 border-b-2 border-white/10 h-3 rounded-bl shrink-0" />}
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 shrink-0">
            {cat.image ? (
              <Image src={cat.image} alt={cat.name} width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-3.5 h-3.5 text-gray-600" />
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Name */}
      <td className="px-4 py-3">
        <p className={`font-semibold text-white ${isSubcat ? 'text-xs' : 'text-sm'}`}>{cat.name}</p>
        <p className="text-[11px] text-gray-600 mt-0.5">/{cat.slug}</p>
        {cat.description && <p className="text-[11px] text-gray-700 mt-0.5 truncate max-w-[200px]">{cat.description}</p>}
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={isSubcat
            ? { background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }
            : { background: 'var(--ap-10)', color: 'var(--ap)' }
          }
        >
          {isSubcat ? 'Sub' : 'Parent'}
        </span>
      </td>

      {/* Show in Nav */}
      <td className="px-4 py-3">
        {!isSubcat && (
          <button onClick={() => toggle(cat, 'showInNav')} className="flex items-center gap-1.5 text-xs font-medium transition-all">
            {cat.showInNav
              ? <ToggleRight className="w-5 h-5" style={{ color: 'var(--ap)' }} />
              : <ToggleLeft className="w-5 h-5 text-gray-600" />
            }
            <span style={{ color: cat.showInNav ? 'var(--ap)' : '#4b5563' }}>
              {cat.showInNav ? 'Shown' : 'Hidden'}
            </span>
          </button>
        )}
      </td>

      {/* Active */}
      <td className="px-4 py-3">
        <button onClick={() => toggle(cat, 'isActive')} className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: cat.isActive ? '#22c55e' : '#4b5563' }}>
          {cat.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {cat.isActive ? 'Active' : 'Inactive'}
        </button>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {!isSubcat && (
            <button
              onClick={() => openNew(cat.slug)}
              title="Add subcategory"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-white transition-colors text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => openEdit(cat)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => setDeleteId(cat._id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage categories &amp; subcategories · Control navbar visibility
          </p>
        </div>
        <button
          onClick={() => openNew()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Categories', value: all.filter(c => !c.parentCategory).length, color: 'var(--ap)' },
          { label: 'Subcategories', value: all.filter(c => !!c.parentCategory).length, color: '#a78bfa' },
          { label: 'Shown in Navbar', value: all.filter(c => !c.parentCategory && c.showInNav).length, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            <div className="mt-2 h-0.5 rounded-full w-8" style={{ background: s.color }} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-600">
            <FolderOpen className="w-10 h-10 opacity-30" />
            <p className="text-sm">No categories yet — add your first one</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Image', 'Name / Slug', 'Type', 'Navbar', 'Active', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tree.map((parent, pi) => (
                <React.Fragment key={parent._id}>
                  {/* Parent row with expand toggle */}
                  <tr
                    className="transition-colors hover:bg-white/[0.02]"
                    style={pi < tree.length - 1 || (parent.subcategories?.length ?? 0) > 0
                      ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                  >
                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(parent.subcategories?.length ?? 0) > 0 ? (
                          <button
                            onClick={() => setExpanded(e => {
                              const n = new Set(e);
                              n.has(parent._id) ? n.delete(parent._id) : n.add(parent._id);
                              return n;
                            })}
                            className="text-gray-500 hover:text-white transition-colors shrink-0"
                          >
                            {expanded.has(parent._id)
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />
                            }
                          </button>
                        ) : <div className="w-3.5 h-3.5 shrink-0" />}
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 shrink-0">
                          {parent.image ? (
                            <Image src={parent.image} alt={parent.name} width={36} height={36} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-3.5 h-3.5 text-gray-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {expanded.has(parent._id) ? <FolderOpen className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                        <div>
                          <p className="text-sm font-bold text-white">{parent.name}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">/{parent.slug}
                            {(parent.subcategories?.length ?? 0) > 0 && (
                              <span className="ml-2 text-gray-700">{parent.subcategories!.length} subcategories</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--ap-10)', color: 'var(--ap)' }}>Parent</span>
                    </td>
                    {/* Nav */}
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(parent, 'showInNav')} className="flex items-center gap-1.5 text-xs font-medium">
                        {parent.showInNav
                          ? <ToggleRight className="w-5 h-5" style={{ color: 'var(--ap)' }} />
                          : <ToggleLeft className="w-5 h-5 text-gray-600" />
                        }
                        <span style={{ color: parent.showInNav ? 'var(--ap)' : '#4b5563' }}>
                          {parent.showInNav ? 'Shown' : 'Hidden'}
                        </span>
                      </button>
                    </td>
                    {/* Active */}
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(parent, 'isActive')} className="flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: parent.isActive ? '#22c55e' : '#4b5563' }}>
                        {parent.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {parent.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openNew(parent.slug)} title="Add subcategory"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => openEdit(parent)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDeleteId(parent._id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Subcategory rows */}
                  {expanded.has(parent._id) && parent.subcategories?.map((sub, si) => (
                    <tr
                      key={sub._id}
                      className="transition-colors hover:bg-white/[0.015]"
                      style={{
                        borderBottom: si < (parent.subcategories!.length - 1) || pi < tree.length - 1
                          ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        background: 'rgba(0,0,0,0.15)',
                      }}
                    >
                      {/* Image */}
                      <td className="pl-10 pr-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-px h-6 bg-white/10 shrink-0" />
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/5 shrink-0">
                            {sub.image ? (
                              <Image src={sub.image} alt={sub.name} width={28} height={28} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-gray-700" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Name */}
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-300">{sub.name}</p>
                        <p className="text-[10px] text-gray-700 mt-0.5">/{sub.slug}</p>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>Sub</span>
                      </td>
                      {/* Nav (N/A for subs) */}
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] text-gray-700">—</span>
                      </td>
                      {/* Active */}
                      <td className="px-4 py-2.5">
                        <button onClick={() => toggle(sub, 'isActive')} className="flex items-center gap-1.5 text-xs font-medium"
                          style={{ color: sub.isActive ? '#22c55e' : '#4b5563' }}>
                          {sub.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {sub.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(sub)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => setDeleteId(sub._id)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit / New Form Modal */}
      {editId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5"
            style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editId === 'new' ? (form.parentCategory ? 'New Subcategory' : 'New Category') : 'Edit'}
                </h2>
                {form.parentCategory && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Under: <span style={{ color: 'var(--ap)' }}>{form.parentCategory}</span>
                  </p>
                )}
              </div>
              <button onClick={closeForm} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Name *</label>
                <input value={form.name || ''} onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Fresh Fruits"
                  className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>

              {/* Slug */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Slug</label>
                <input value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="fresh-fruits"
                  className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none font-mono transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>

              {/* Parent category selector (only for edit mode, to move between parents) */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Parent Category</label>
                <select
                  value={form.parentCategory || ''}
                  onChange={e => setForm(f => ({ ...f, parentCategory: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="">— None (top-level category) —</option>
                  {parentCategories.map(p => (
                    <option key={p._id} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short description..." rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>

              {/* Image URL */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Image URL</label>
                <input value={form.image || ''} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                {form.image && (
                  <div className="mt-2 w-14 h-14 rounded-xl overflow-hidden">
                    <Image src={form.image} alt="preview" width={56} height={56} className="object-cover w-full h-full" />
                  </div>
                )}
              </div>

              {/* Sort + Toggles row */}
              <div className="flex items-center gap-4 flex-wrap pt-1">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1 block">Sort Order</label>
                  <input type="number" value={form.sortOrder ?? 0}
                    onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="w-20 px-3 py-2 rounded-xl text-sm text-white outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>

                {!form.parentCategory && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none mt-4">
                    <div onClick={() => setForm(f => ({ ...f, showInNav: !f.showInNav }))}
                      className="relative rounded-full transition-all cursor-pointer"
                      style={{ background: form.showInNav ? 'var(--ap)' : 'rgba(255,255,255,0.1)', width: 40, height: 22 }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: form.showInNav ? 22 : 2 }} />
                    </div>
                    <span className="text-xs font-medium text-gray-300">Show in Navbar</span>
                  </label>
                )}

                <label className="flex items-center gap-2.5 cursor-pointer select-none mt-4">
                  <div onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className="relative rounded-full transition-all cursor-pointer"
                    style={{ background: form.isActive ? '#22c55e' : 'rgba(255,255,255,0.1)', width: 40, height: 22 }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: form.isActive ? 22 : 2 }} />
                  </div>
                  <span className="text-xs font-medium text-gray-300">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editId === 'new' ? 'Create' : 'Save Changes'}
              </button>
              <button onClick={closeForm}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete?</h3>
              <p className="text-sm text-gray-500 mt-1">
                {(() => {
                  const cat = all.find(c => c._id === deleteId);
                  const subCount = cat && !cat.parentCategory ? all.filter(c => c.parentCategory === cat.slug).length : 0;
                  return subCount > 0
                    ? `This will also delete ${subCount} subcategori${subCount > 1 ? 'es' : 'y'}.`
                    : 'This cannot be undone.';
                })()}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
