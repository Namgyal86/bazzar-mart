'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Truck, CheckCircle, Clock, Phone, MapPin, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { orderApi } from '@/lib/api/order.api';

const DELIVERY_STEPS = [
  { key: 'CONFIRMED',  label: 'Order Confirmed',             done: true  },
  { key: 'PROCESSING', label: 'Being Packed',                done: true  },
  { key: 'PICKED_UP',  label: 'Picked Up by Delivery Agent', done: true  },
  { key: 'IN_TRANSIT', label: 'On the Way',                  done: true, active: true },
  { key: 'DELIVERED',  label: 'Delivered',                   done: false },
];

function LiveMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    (async () => {
      const L = (await import('leaflet')).default;
      if ((mapRef.current as any)?._leaflet_id) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const deliveryIcon = L.divIcon({
        html: '<div style="background:linear-gradient(135deg,#f97316,#ef4444);width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: '',
      });

      const marker = L.marker([lat, lng], { icon: deliveryIcon }).addTo(map)
        .bindPopup('Delivery agent is here!').openPopup();

      mapInstanceRef.current = map;
      markerRef.current = marker;
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={mapRef} style={{ width: '100%', height: '320px', borderRadius: '16px', zIndex: 0 }} />;
}

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const [agentLat, setAgentLat] = useState(27.7172);
  const [agentLng, setAgentLng] = useState(85.3240);
  const [eta, setEta] = useState(18);
  const [order, setOrder] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    orderApi.getById(orderId as string)
      .then(res => setOrder(res.data.data))
      .catch(() => {});
    apiClient.get(`/api/v1/delivery/track/${orderId}`)
      .then((res: any) => {
        const d = res.data.data;
        if (d?.currentLocation) { setAgentLat(d.currentLocation.lat); setAgentLng(d.currentLocation.lng); }
        if (d?.agent) setAgent(d.agent);
        if (d?.eta) setEta(d.eta);
      })
      .catch(() => {});
  }, [orderId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAgentLat(prev => prev + (Math.random() - 0.5) * 0.001);
      setAgentLng(prev => prev + (Math.random() - 0.5) * 0.001);
      setEta(prev => Math.max(1, prev - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Live Order Tracking
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Order #{orderId}</p>
      </div>

      {/* ETA Banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 8px 32px rgba(249,115,22,0.3)' }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 -translate-y-12 translate-x-12"
          style={{ background: 'radial-gradient(circle, white, transparent)' }} />
        <div className="flex items-center justify-between relative">
          <div>
            <p className="text-white/70 text-sm font-medium">Estimated Arrival</p>
            <p className="text-5xl font-black mt-1">{eta}<span className="text-2xl font-semibold ml-1 opacity-80">min</span></p>
            <p className="text-white/70 text-sm mt-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Your order is on the way!
            </p>
          </div>
          <div className="text-6xl select-none">🛵</div>
        </div>
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <LiveMap lat={agentLat} lng={agentLng} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Delivery Agent */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-orange-500" /> Your Delivery Agent
          </h2>
          {agent ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(239,68,68,0.1))', border: '2px solid rgba(249,115,22,0.2)' }}>
                🧑
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{agent.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{agent.vehicle} · {agent.vehicleNumber}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0">
                <Truck className="w-7 h-7 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Driver Assigned</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">En route to your location</p>
              </div>
            </div>
          )}
          <button
            onClick={() => agent?.phone ? (window.location.href = `tel:${agent.phone}`) : undefined}
            disabled={!agent?.phone}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40 disabled:scale-100 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            <Phone className="w-4 h-4" /> Call Agent
          </button>
        </div>

        {/* Status Timeline */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" /> Delivery Status
          </h2>
          <div>
            {DELIVERY_STEPS.map((step, idx) => (
              <div key={step.key} className="flex gap-3 pb-3 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    step.done
                      ? 'text-white'
                      : (step as any).active
                      ? 'border-2 border-orange-500 text-orange-500 bg-orange-50 dark:bg-orange-950/20'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}
                    style={step.done ? { background: 'linear-gradient(135deg, #f97316, #ef4444)' } : undefined}
                  >
                    {step.done ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  {idx < DELIVERY_STEPS.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[20px] mt-1 ${
                      step.done ? 'bg-orange-300 dark:bg-orange-700/50' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className={`text-sm font-medium ${
                    (step as any).active
                      ? 'text-orange-600 dark:text-orange-400'
                      : step.done
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {step.label}
                    {(step as any).active && <span className="ml-1">📍</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
