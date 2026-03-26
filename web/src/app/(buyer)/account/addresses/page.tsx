'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { userApi, Address } from '@/lib/api/user.api';
import { toast } from '@/hooks/use-toast';

const emptyForm = { label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', district: '', province: 'Bagmati', postalCode: '', isDefault: false };

const LABEL_COLORS: Record<string, string> = {
  Home: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  Office: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function AddressForm({
  initial,
  onSave,
  onCancel,
  saving,
  title,
}: {
  initial: typeof emptyForm;
  onSave: (data: typeof emptyForm) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  const [form, setForm] = useState(initial);
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Label</label>
            <select
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            >
              <option>Home</option><option>Office</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Full Name</label>
            <Input
              placeholder="Full name"
              className="border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 focus:border-orange-400 rounded-xl"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Phone</label>
            <Input
              placeholder="98XXXXXXXX"
              className="border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 focus:border-orange-400 rounded-xl"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Address Line 1</label>
            <Input
              placeholder="Street, Ward No."
              className="border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 focus:border-orange-400 rounded-xl"
              value={form.addressLine1}
              onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Address Line 2</label>
            <Input
              placeholder="Landmark (optional)"
              className="border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 focus:border-orange-400 rounded-xl"
              value={form.addressLine2}
              onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">City</label>
            <Input
              placeholder="City"
              className="border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 focus:border-orange-400 rounded-xl"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">District</label>
            <Input
              placeholder="District"
              className="border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 focus:border-orange-400 rounded-xl"
              value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Province</label>
            <select
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400"
              value={form.province}
              onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
            >
              {['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Postal Code</label>
            <Input
              placeholder="44700"
              className="border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 focus:border-orange-400 rounded-xl"
              value={form.postalCode}
              onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="accent-orange-500 w-4 h-4"
            checked={form.isDefault}
            onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
          />
          Set as default address
        </label>
        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="text-white border-0"
            style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Saving...</> : 'Save Address'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi.getAddresses()
      .then((res) => { if (Array.isArray(res.data?.data)) setAddresses(res.data.data); })
      .catch(() => {});
  }, []);

  const handleAdd = async (data: typeof emptyForm) => {
    setSaving(true);
    try {
      const res = await userApi.addAddress(data as Omit<Address, '_id'>);
      setAddresses(prev => [...prev, res.data.data]);
      toast({ title: 'Address added!' });
      setShowAdd(false);
    } catch {
      toast({ title: 'Failed to save address', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string, data: typeof emptyForm) => {
    setSaving(true);
    try {
      await userApi.updateAddress(id, data as Omit<Address, '_id'>);
      setAddresses(prev => prev.map(a => a._id === id ? { ...a, ...data } : a));
      toast({ title: 'Address updated!' });
      setEditingId(null);
    } catch {
      toast({ title: 'Failed to update address', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await userApi.deleteAddress(id);
      setAddresses(prev => prev.filter(a => a._id !== id));
      toast({ title: 'Address removed' });
    } catch {
      toast({ title: 'Failed to delete address', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Addresses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your delivery addresses</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-white border-0 shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
          onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}
        >
          <Plus className="w-4 h-4" /> Add Address
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <AddressForm
          initial={emptyForm}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
          saving={saving}
          title="New Address"
        />
      )}

      {/* Address cards */}
      <div className="space-y-4">
        {addresses.map((addr) => (
          <div key={addr._id}>
            {editingId === addr._id ? (
              <AddressForm
                initial={{ label: addr.label, fullName: addr.fullName, phone: addr.phone, addressLine1: addr.addressLine1, addressLine2: addr.addressLine2 || '', city: addr.city, district: addr.district, province: addr.province, postalCode: addr.postalCode || '', isDefault: addr.isDefault }}
                onSave={(data) => handleEdit(addr._id, data)}
                onCancel={() => setEditingId(null)}
                saving={saving}
                title="Edit Address"
              />
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                      <MapPin className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${LABEL_COLORS[addr.label] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditingId(addr._id); setShowAdd(false); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      onClick={() => handleDelete(addr._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm space-y-1 pl-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{addr.fullName}</p>
                  <p className="text-gray-500 dark:text-gray-400">{addr.phone}</p>
                  <p className="text-gray-500 dark:text-gray-400">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                  <p className="text-gray-500 dark:text-gray-400">{addr.city}, {addr.district}, {addr.province}{addr.postalCode ? ` – ${addr.postalCode}` : ''}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {addresses.length === 0 && !showAdd && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-orange-400 dark:text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-1">
              No Addresses Yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Save an address to speed up checkout</p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-white border-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              <Plus className="w-4 h-4" /> Add your first address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
