'use client';

import { useEffect } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart.store';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { cartApi } from '@/lib/api/cart.api';
import { useAuthStore } from '@/store/auth.store';

export function CartDrawer() {
  const { items, isOpen, closeCart, updateItem, removeItem, totalAmount, totalItems } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // Sync cart from backend when drawer opens and user is logged in
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      cartApi.get()
        .then((res) => {
          const backendItems = res.data.data.items;
          if (backendItems.length > 0) {
            useCartStore.getState().setItems(backendItems);
          }
        })
        .catch(() => {}); // keep local cart on error
    }
  }, [isOpen, isAuthenticated]);

  // Sync item removal to backend
  const handleRemoveItem = async (id: string, productId: string) => {
    removeItem(id);
    if (isAuthenticated) {
      cartApi.removeItem(productId).catch(() => {});
    }
  };

  // Sync quantity update to backend
  const handleUpdateItem = async (id: string, productId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveItem(id, productId);
      return;
    }
    updateItem(id, quantity);
    if (isAuthenticated) {
      cartApi.updateItem(productId, quantity).catch(() => {});
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 dark:bg-gray-900',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold">My Cart ({totalItems()})</h2>
          </div>
          <button onClick={closeCart} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <ShoppingBag className="w-16 h-16 text-gray-200" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <Link
                href="/products"
                onClick={closeCart}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3 bg-gray-50 rounded-lg p-3 dark:bg-gray-800">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shrink-0 border overflow-hidden relative">
                  {item.productImage && (item.productImage.startsWith('http') || item.productImage.startsWith('/')) ? (
                    <Image src={item.productImage} alt={item.productName} fill className="object-contain p-1" sizes="64px" />
                  ) : (
                    <Package className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{item.sellerName}</p>
                  <h4 className="text-sm font-medium line-clamp-1">{item.productName}</h4>
                  <p className="text-orange-500 dark:text-orange-400 font-semibold text-sm mt-1">
                    {formatCurrency(item.unitPrice)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 border rounded-md">
                      <button
                        className="p-1 hover:bg-gray-100"
                        onClick={() => {
                          if (item.quantity > 1) handleUpdateItem(item.id, item.productId, item.quantity - 1);
                          else handleRemoveItem(item.id, item.productId);
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        className="p-1 hover:bg-gray-100"
                        onClick={() => {
                          if (item.quantity < item.stock) handleUpdateItem(item.id, item.productId, item.quantity + 1);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id, item.productId)}
                      className="text-red-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between font-semibold">
              <span>Subtotal</span>
              <span className="text-orange-500 dark:text-orange-400">{formatCurrency(totalAmount())}</span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout</p>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="w-full flex items-center justify-center py-3 text-white font-semibold rounded-xl transition-all hover:brightness-110 shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 4px 16px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.3)' }}
            >
              Proceed to Checkout →
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="w-full flex items-center justify-center py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
