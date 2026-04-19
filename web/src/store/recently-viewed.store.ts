'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  salePrice?: number;
  rating: number;
  category: string;
}

interface RecentlyViewedState {
  products: RecentProduct[];
  track: (product: RecentProduct) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      products: [],

      track: (product) => {
        set((state) => {
          const rest = state.products.filter((p) => p.id !== product.id);
          return { products: [product, ...rest].slice(0, 10) };
        });
      },

      clear: () => set({ products: [] }),
    }),
    { name: 'bazzar-recently-viewed' },
  ),
);
