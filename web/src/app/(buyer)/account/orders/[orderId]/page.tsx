'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Package, MapPin, CreditCard, Truck,
  CheckCircle, Clock, XCircle, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils';
import { orderApi } from '@/lib/api/order.api';

/* ─── constants ─────────────────────────────────────────────────── */
const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const STATUS_LABELS_TIMELINE: Record<string, string> = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Being Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function buildTimeline(status: string) {
  if (status === 'CANCELLED')
    return [{ status: 'CANCELLED', label: 'Cancelled', done: true }];
  const idx = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER.map((s, i) => ({
    status: s,
    label: STATUS_LABELS_TIMELINE[s],
    done: i <= idx,
  }));
}

/* ─── status badge ───────────────────────────────────────────────── */
const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING:    'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
  CONFIRMED:  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  SHIPPED:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
  DELIVERED:  'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-800',
  CANCELLED:  'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800',
  RETURNED:   'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
};

/* ─── card shell ─────────────────────────────────────────────────── */
const CARD = 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-5';

/* ─── timeline icons ─────────────────────────────────────────────── */
const timelineIcons: Record<string, any> = {
  PENDING:    Clock,
  CONFIRMED:  CheckCircle,
  PROCESSING: Package,
  SHIPPED:    Truck,
  DELIVERED:  CheckCircle,
  CANCELLED:  XCircle,
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function OrderDetailPage() {
  const params  = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    orderApi.getById(orderId)
      .then((res: any) => {
        const o = res.data?.data ?? res.data;
        if (!o) return;
        setOrder({
          id:               o.orderNumber || o._id,
          orderNumber:      o.orderNumber || o._id,
          status:           o.status,
          createdAt:        o.createdAt,
          updatedAt:        o.updatedAt,
          total:            o.total,
          subtotal:         o.subtotal ?? o.total,
          shippingFee:      o.shippingFee ?? 0,
          discount:         o.discount ?? 0,
          paymentMethod:    o.paymentMethod ?? 'N/A',
          paymentStatus:    o.paymentStatus ?? 'PENDING',
          trackingNumber:   o.trackingNumber,
          estimatedDelivery:o.estimatedDelivery,
          deliveryAddress:  o.shippingAddress ?? o.deliveryAddress ?? {},
          items: (o.items || []).map((i: any) => ({
            name:       i.productName,
            qty:        i.quantity,
            unitPrice:  i.unitPrice ?? i.price,
            totalPrice: i.totalPrice ?? i.price * i.quantity,
            image:      i.productImage || '',
            productId:  i.productId,
          })),
          timeline: buildTimeline(o.status),
        });
      })
      .catch(() => {});
  }, [orderId]);

  /* ── loading state ── */
  if (!order) return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* back button skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account/orders">
          <button className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </button>
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center py-24 gap-4">
        {/* branded spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-orange-100 dark:border-orange-950/30" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading order details…</p>
      </div>
    </div>
  );

  const badgeClass = STATUS_BADGE_CLASSES[order.status] ?? STATUS_BADGE_CLASSES.RETURNED;

  /* ── main render ── */
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">

      {/* ── back button ── */}
      <div className="mb-6">
        <Link href="/account/orders">
          <button className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:text-orange-500 transition-colors" />
            </span>
            Back to Orders
          </button>
        </Link>
      </div>

      {/* ── page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Order <span className="text-orange-500">#{order.orderNumber}</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>

        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide ${badgeClass}`}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── order timeline ── */}
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-5">Order Timeline</h2>

            <div className="relative">
              {order.timeline.map((step: any, idx: number) => {
                const Icon       = timelineIcons[step.status] ?? Clock;
                const isLast     = idx === order.timeline.length - 1;
                const isDone     = step.done;
                const isCancelled= step.status === 'CANCELLED';

                return (
                  <div key={idx} className="relative flex gap-4">
                    {/* vertical connecting line */}
                    {!isLast && (
                      <div
                        className={`absolute left-[19px] top-10 w-0.5 bottom-0 ${
                          isDone ? 'bg-green-200 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                        style={{ height: 'calc(100% - 8px)' }}
                      />
                    )}

                    {/* dot / icon column */}
                    <div className="flex flex-col items-center shrink-0 z-10">
                      {/* outer ring + icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ${
                          isCancelled
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-500 ring-red-100 dark:ring-red-950/20'
                            : isDone
                              ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 ring-green-100 dark:ring-green-950/20'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 ring-gray-50 dark:ring-gray-900'
                        }`}
                      >
                        {isDone && !isCancelled
                          ? <Check className="w-4 h-4 stroke-[2.5]" />
                          : <Icon className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* text */}
                    <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                      <p
                        className={`text-sm font-semibold leading-tight mt-2.5 ${
                          isCancelled
                            ? 'text-red-600 dark:text-red-400'
                            : isDone
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{step.time}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── order items ── */}
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-5">
              Order Items
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                ({order.items.length} {order.items.length === 1 ? 'item' : 'items'})
              </span>
            </h2>

            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                  {/* image */}
                  <div className="w-16 h-16 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 overflow-hidden relative">
                    {item.image && (item.image.startsWith('http') || item.image.startsWith('/'))
                      ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-1.5"
                          sizes="64px"
                        />
                      )
                      : (
                        /* gradient placeholder */
                        <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/20 flex items-center justify-center">
                          <Package className="w-6 h-6 text-orange-300 dark:text-orange-700" />
                        </div>
                      )}
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Qty: {item.qty} &times; {formatCurrency(item.unitPrice)}
                    </p>
                  </div>

                  {/* line total */}
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 shrink-0 self-center">
                    {formatCurrency(item.totalPrice)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN ════════════ */}
        <div className="space-y-4">

          {/* ── order summary ── */}
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-800 dark:text-gray-200">{formatCurrency(order.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Shipping</span>
                <span className={order.shippingFee === 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-800 dark:text-gray-200'}>
                  {order.shippingFee === 0 ? 'Free' : formatCurrency(order.shippingFee)}
                </span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Discount</span>
                  <span className="text-red-500 dark:text-red-400 font-medium">
                    -{formatCurrency(order.discount)}
                  </span>
                </div>
              )}

              {/* divider */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-2.5 flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
                <span
                  className="font-bold text-base bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent"
                  style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}
                >
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* ── payment ── */}
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-500">
                <CreditCard className="w-3.5 h-3.5" />
              </span>
              Payment
            </h2>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{order.paymentMethod}</p>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* ── delivery address ── */}
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              Delivery Address
            </h2>

            <div className="text-sm space-y-1">
              {order.deliveryAddress.fullName && (
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {order.deliveryAddress.fullName}
                </p>
              )}
              {order.deliveryAddress.phone && (
                <p className="text-gray-500 dark:text-gray-400">{order.deliveryAddress.phone}</p>
              )}
              {order.deliveryAddress.addressLine1 && (
                <p className="text-gray-600 dark:text-gray-300">{order.deliveryAddress.addressLine1}</p>
              )}
              {(order.deliveryAddress.city || order.deliveryAddress.province) && (
                <p className="text-gray-500 dark:text-gray-400">
                  {[order.deliveryAddress.city, order.deliveryAddress.province].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* ── tracking ── */}
          {order.trackingNumber && (
            <div className={CARD}>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500">
                  <Truck className="w-3.5 h-3.5" />
                </span>
                Tracking
              </h2>

              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Tracking number</p>
              <p className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700 break-all">
                {order.trackingNumber}
              </p>

              {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                <Link href={`/account/track/${order.id}`} className="block mt-3">
                  <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-200 dark:shadow-orange-950/30 transition-all active:scale-[0.98]">
                    <Truck className="w-4 h-4" />
                    Track Package
                  </button>
                </Link>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
