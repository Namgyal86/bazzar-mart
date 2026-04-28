import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  productImage?: string;
  sellerId?: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  salePrice?: number;
  totalPrice: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  total: number;
  itemCount: number;
  setItems: (items: CartItem[]) => void;
  fetchCart: () => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => Promise<void>;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

function computeTotals(items: CartItem[]) {
  return {
    total: items.reduce((s, i) => s + (i.salePrice ?? i.unitPrice) * i.quantity, 0),
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  total: 0,
  itemCount: 0,

  setItems: (items) => set({ items, ...computeTotals(items) }),

  fetchCart: async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>('/api/v1/cart');
      const raw = res.data?.data;
      const items: CartItem[] = (raw?.items ?? []).map((i: any) => ({
        id: i._id ?? i.productId,
        productId: i.productId,
        productName: i.productName ?? i.name ?? '',
        productImage: i.productImage ?? i.imageUrl,
        sellerId: i.sellerId,
        sellerName: i.sellerName ?? '',
        quantity: i.quantity ?? 1,
        unitPrice: i.unitPrice ?? i.price ?? 0,
        salePrice: i.salePrice,
        totalPrice: (i.unitPrice ?? i.price ?? 0) * (i.quantity ?? 1),
        stock: i.stock ?? 99,
      }));
      set({ items, ...computeTotals(items) });
    } catch {
      // cart fetch failed — keep current state
    }
  },

  addItem: async (item) => {
    try {
      await apiClient.post('/api/v1/cart/items', {
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        unitPrice: item.salePrice ?? item.unitPrice,
        quantity: item.quantity,
        stock: item.stock,
      });
      await get().fetchCart();
    } catch (err) {
      throw err;
    }
  },

  updateItem: async (id, quantity) => {
    try {
      if (quantity <= 0) {
        await apiClient.delete(`/api/v1/cart/items/${id}`);
      } else {
        await apiClient.patch(`/api/v1/cart/items/${id}`, { quantity });
      }
      await get().fetchCart();
    } catch {
      // optimistic update on failure
      set((state) => {
        const items = quantity <= 0
          ? state.items.filter(i => i.id !== id)
          : state.items.map(i => i.id === id ? { ...i, quantity, totalPrice: (i.salePrice ?? i.unitPrice) * quantity } : i);
        return { items, ...computeTotals(items) };
      });
    }
  },

  removeItem: async (id) => {
    try {
      await apiClient.delete(`/api/v1/cart/items/${id}`);
      await get().fetchCart();
    } catch {
      set((state) => {
        const items = state.items.filter(i => i.id !== id);
        return { items, ...computeTotals(items) };
      });
    }
  },

  clearCart: async () => {
    try {
      await apiClient.delete('/api/v1/cart');
    } catch {}
    set({ items: [], total: 0, itemCount: 0 });
  },

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
  totalAmount: () => get().items.reduce((sum, item) => sum + (item.salePrice ?? item.unitPrice) * item.quantity, 0),
}));
