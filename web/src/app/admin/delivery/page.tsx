'use client';

import { useState, useEffect } from 'react';
import { Truck, CheckCircle, Clock, AlertCircle, Search, MapPin, X, Loader2, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any; dot: string }> = {
  PENDING:    { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: Clock,         dot: 'bg-yellow-400' },
  IN_TRANSIT: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: Truck,         dot: 'bg-blue-400' },
  DELIVERED:  { bg: 'bg-green-500/10',  text: 'text-green-400',  icon: CheckCircle,   dot: 'bg-green-400' },
  FAILED:     { bg: 'bg-red-500/10',    text: 'text-red-400',    icon: AlertCircle,   dot: 'bg-red-400' },
};

function AssignDriverModal({ delivery, onClose, onAssigned }: { delivery: any; onClose: () => void; onAssigned: (deliveryId: string, driverName: string) => void }) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    apiClient.get('/api/v1/delivery/drivers/available')
      .then((res: any) => {
        const data = res.data?.data;
        setDrivers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // fallback demo drivers
        setDrivers([
          { id: 'd1', name: 'Ramesh Sharma', phone: '9841000001', zone: 'Kathmandu' },
          { id: 'd2', name: 'Bikash Thapa', phone: '9841000002', zone: 'Lalitpur' },
          { id: 'd3', name: 'Sunil Gurung', phone: '9841000003', zone: 'Bhaktapur' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selected) return;
    setAssigning(true);
    const driver = drivers.find(d => d.id === selected || d._id === selected);
    try {
      await apiClient.patch(`/api/v1/delivery/${delivery.id}/assign`, { driverId: selected });
      toast({ title: 'Driver assigned!', description: `${driver?.name} will handle this delivery.` });
      onAssigned(delivery.id, driver?.name ?? selected);
    } catch (err) {
      toast({ title: 'Assignment failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#131929] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="font-bold text-white">Assign Delivery Driver</h2>
            <p className="text-xs text-gray-500 mt-0.5">Order: <span className="text-brand-400 font-mono">{delivery.orderId}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Delivery info */}
          <div className="bg-white/5 rounded-xl p-3.5 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Customer</span>
              <span className="text-white font-medium">{delivery.customer}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-gray-400 shrink-0">Address</span>
              <span className="text-white text-xs text-right">{delivery.address}</span>
            </div>
          </div>

          {/* Driver list */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Available Drivers</p>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin ap-text" />
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No drivers available right now</div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {drivers.map(driver => {
                  const id = driver.id || driver._id;
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                      style={selected === id ? { borderColor: 'var(--ap-30)', background: 'var(--ap-10)' } : { borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <input type="radio" name="driver" value={id} checked={selected === id} onChange={() => setSelected(id)} className="sr-only" />
                      <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.phone}{driver.zone ? ` · ${driver.zone}` : ''}</p>
                      </div>
                      {selected === id && <div className="w-2 h-2 rounded-full shrink-0 ap-bg" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-white/5 hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selected || assigning}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--ap)' }}
            >
              {assigning ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</> : 'Assign Driver'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDeliveryPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [assigningDelivery, setAssigningDelivery] = useState<any | null>(null);

  useEffect(() => {
    apiClient.get('/api/v1/delivery/admin/list')
      .then((res: any) => { if (Array.isArray(res.data?.data)) setDeliveries(res.data.data); })
      .catch(() => {});
  }, []);

  const handleAssigned = (deliveryId: string, driverName: string) => {
    setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, driver: driverName, status: 'IN_TRANSIT' } : d));
    setAssigningDelivery(null);
  };

  const filtered = deliveries.filter(d => {
    const matchFilter = filter === 'All' || d.status === filter;
    const matchSearch = !search || d.orderId?.toLowerCase().includes(search.toLowerCase()) || d.customer?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = [
    { label: 'Pending', value: deliveries.filter(d => d.status === 'PENDING').length, gradient: 'from-yellow-500 to-orange-500' },
    { label: 'In Transit', value: deliveries.filter(d => d.status === 'IN_TRANSIT').length, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Delivered', value: deliveries.filter(d => d.status === 'DELIVERED').length, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Failed', value: deliveries.filter(d => d.status === 'FAILED').length, gradient: 'from-red-500 to-rose-500' },
  ];

  return (
    <div className="space-y-6">
      {assigningDelivery && (
        <AssignDriverModal
          delivery={assigningDelivery}
          onClose={() => setAssigningDelivery(null)}
          onAssigned={handleAssigned}
        />
      )}

      <div>
        <h1 className="text-2xl font-black text-white">Delivery Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">{deliveries.length} total deliveries</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#1a2035] border border-white/5 rounded-2xl p-4 relative overflow-hidden group hover:border-brand-500/20 transition-all">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
            <p className="text-3xl font-black text-white relative">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 relative">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            placeholder="Search order or customer..."
            className="w-full bg-[#1a2035] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['All', 'PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f === 'All' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1a2035] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Delivery ID', 'Order', 'Customer', 'Address', 'Driver', 'Status', 'ETA', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(delivery => {
                const cfg = STATUS_CONFIG[delivery.status] || STATUS_CONFIG.PENDING;
                const Icon = cfg.icon;
                const canAssign = delivery.status !== 'DELIVERED' && delivery.status !== 'FAILED';
                return (
                  <tr key={delivery.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">{delivery.id}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-brand-400">{delivery.orderId}</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-white">{delivery.customer}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 max-w-[150px]">
                        <MapPin className="w-3 h-3 text-gray-600 shrink-0" />
                        <span className="text-xs text-gray-400 truncate">{delivery.address}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {!delivery.driver || delivery.driver === 'Unassigned'
                        ? <span className="text-xs text-gray-600 italic">Unassigned</span>
                        : <span className="text-xs text-white">{delivery.driver}</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                        <Icon className="w-3 h-3" /> {delivery.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{delivery.eta ? formatDate(delivery.eta) : '—'}</td>
                    <td className="px-5 py-4">
                      {canAssign && (
                        <button
                          onClick={() => setAssigningDelivery(delivery)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-brand-500/20 text-gray-400 hover:text-brand-400 text-xs font-semibold rounded-xl transition-colors"
                        >
                          {!delivery.driver || delivery.driver === 'Unassigned' ? 'Assign Driver' : 'Reassign'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Truck className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No deliveries found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
