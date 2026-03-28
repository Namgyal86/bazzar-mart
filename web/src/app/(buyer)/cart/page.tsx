'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { cartApi } from '@/lib/api/cart.api';

export default function CartPage() {
  const { items, fetchCart, updateItem, removeItem, clearCart, total, itemCount } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchCart().finally(() => setLoading(false));
  }, [fetchCart]);

  async function handleQty(itemId: string, newQty: number) {
    setUpdating(itemId);
    try {
      if (newQty <= 0) {
        await removeItem(itemId);
      } else {
        await updateItem(itemId, newQty);
      }
    } finally {
      setUpdating(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <ShoppingBag className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Sign in to view your cart</h2>
        <p className="text-gray-400">Your cart items will appear here</p>
        <Link href="/auth/login" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <ShoppingBag className="w-20 h-20 text-gray-200" />
        <h2 className="text-2xl font-bold text-gray-700">Your cart is empty</h2>
        <p className="text-gray-400">Add items to get started</p>
        <Link href="/products" className="bg-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2">
          Browse Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const deliveryFee = 0; // free delivery for now
  const finalTotal = total + deliveryFee;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
        <span className="text-sm text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Clear cart */}
          <div className="flex justify-end">
            <button
              onClick={() => clearCart()}
              className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear all
            </button>
          </div>

          {items.map(item => {
            const price = item.salePrice ?? item.unitPrice;
            const subtotal = price * item.quantity;
            const isUpdating = updating === item.id;

            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
                {/* Image */}
                <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50">
                  {item.productImage ? (
                    <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-gray-200" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.productId}`} className="font-medium text-gray-900 hover:text-orange-500 line-clamp-2 text-sm">
                    {item.productName}
                  </Link>
                  {item.sellerName && (
                    <p className="text-xs text-gray-400 mt-0.5">by {item.sellerName}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    {/* Qty controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQty(item.id, item.quantity - 1)}
                        disabled={isUpdating}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:border-orange-400 disabled:opacity-50 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">
                        {isUpdating ? '...' : item.quantity}
                      </span>
                      <button
                        onClick={() => handleQty(item.id, item.quantity + 1)}
                        disabled={isUpdating}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:border-orange-400 disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-bold text-orange-500">Rs {subtotal.toLocaleString()}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-400">Rs {price.toLocaleString()} each</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors self-start"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({itemCount} items)</span>
                <span>Rs {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                  {deliveryFee === 0 ? 'Free' : `Rs ${deliveryFee}`}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-orange-500">Rs {finalTotal.toLocaleString()}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-5 w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3.5 rounded-xl font-semibold text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/products"
              className="mt-3 w-full text-center text-sm text-orange-500 hover:text-orange-600 font-medium block"
            >
              Continue Shopping
            </Link>

            {/* Trust badges */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
              {[
                { icon: '🔒', text: 'Secure checkout' },
                { icon: '🚚', text: 'Fast delivery' },
                { icon: '↩️', text: 'Easy returns' },
                { icon: '💳', text: 'Multiple payments' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
