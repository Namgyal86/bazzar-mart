'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, Truck, ArrowRight, ShoppingBag, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';

interface OrderItem {
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  _id: string;
  orderNumber?: string;
  status: string;
  paymentMethod: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
  shippingAddress?: { fullName: string; city: string };
}

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<{ success: boolean; data: Order }>(`/api/v1/orders/${id}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => {});
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">

        {/* Success card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Order Placed!</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Thank you for shopping with Bazzar. We&apos;ll get this to you soon.
            </p>
            {order && (
              <p className="mt-3 text-xs font-mono bg-green-100 text-green-700 px-3 py-1.5 rounded-full inline-block">
                Order #{order.orderNumber ?? order._id.slice(-8).toUpperCase()}
              </p>
            )}
          </div>

          {/* Order details */}
          {order && (
            <div className="px-8 py-6 space-y-5">

              {/* Items preview */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Items Ordered</p>
                <div className="space-y-2">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="line-clamp-1">{item.productName} × {item.quantity}</span>
                      </span>
                      <span className="font-medium shrink-0 ml-2">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{order.items.length - 3} more items</p>
                  )}
                </div>
              </div>

              {/* Summary row */}
              <div className="flex items-center justify-between border-t pt-4">
                <span className="font-semibold">Total Paid</span>
                <span className="text-lg font-black text-orange-500">{formatCurrency(order.total)}</span>
              </div>

              {/* Info pills */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3.5 h-3.5" /> Payment
                  </div>
                  <p className="text-sm font-semibold capitalize">{order.paymentMethod.toLowerCase()}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Truck className="w-3.5 h-3.5" /> Delivery to
                  </div>
                  <p className="text-sm font-semibold">{order.shippingAddress?.city ?? 'Your address'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-8 pb-8 space-y-3">
            <Link
              href={`/account/orders/${id}`}
              className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              Track Your Order <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products"
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" /> Continue Shopping
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          A confirmation will be sent to your email. Questions?{' '}
          <Link href="/support" className="text-orange-500 hover:underline">Contact support</Link>
        </p>
      </div>
    </div>
  );
}
