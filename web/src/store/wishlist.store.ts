'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client';

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  basePrice: number;
  rating: number;
  seller: string;
  inStock: boolean;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: WishlistItem) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  syncToServer: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        if (get().items.some((i) => i.productId === item.productId)) return;
        set((state) => ({ items: [...state.items, item] }));
        apiClient.post(`/api/v1/users/me/wishlist/${item.productId}`).catch(() => {});
      },

      removeItem: (productId) => {
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
        apiClient.delete(`/api/v1/users/me/wishlist/${productId}`).catch(() => {});
      },

      toggleItem: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId);
        if (exists) {
          get().removeItem(item.productId);
        } else {
          get().addItem(item);
        }
      },

      isInWishlist: (productId) => get().items.some((i) => i.productId === productId),

      clearWishlist: () => set({ items: [] }),

      syncToServer: () => {
        const productIds = get().items.map((i) => i.productId);
        apiClient.put('/api/v1/users/me/wishlist', { productIds }).catch(() => {});
      },
    }),
    {
      name: 'bazzar-wishlist',
    },
  ),
);
