'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from './cart.store';

interface GuestCartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  updateItem: (productId: string, quantity: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

function key(productId: string, variantId?: string) {
  return `${productId}__${variantId ?? 'default'}`;
}

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId,
          );
          if (existing) {
            const qty = Math.min(item.stock, existing.quantity + item.quantity);
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? { ...i, quantity: qty, totalPrice: (i.salePrice ?? i.unitPrice) * qty }
                  : i,
              ),
            };
          }
          const newItem: CartItem = {
            id: `guest-${key(item.productId, item.variantId)}`,
            ...item,
            totalPrice: (item.salePrice ?? item.unitPrice) * item.quantity,
          };
          return { items: [...state.items, newItem] };
        });
      },

      updateItem: (productId, quantity, variantId) => {
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter(
                  (i) => !(i.productId === productId && i.variantId === variantId),
                )
              : state.items.map((i) =>
                  i.productId === productId && i.variantId === variantId
                    ? { ...i, quantity, totalPrice: (i.salePrice ?? i.unitPrice) * quantity }
                    : i,
                ),
        }));
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalAmount: () =>
        get().items.reduce((sum, i) => sum + (i.salePrice ?? i.unitPrice) * i.quantity, 0),
    }),
    { name: 'bazzar-guest-cart' },
  ),
);
