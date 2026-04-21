import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useWishlistStore } from './wishlist.store';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'DELIVERY';
  profilePhotoUrl?: string;
  referralCode?: string;
  sellerId?: string;
  createdAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  logout: () => void;
}

const COOKIE_KEY = 'bz_user';
const IS_PROD    = process.env.NODE_ENV === 'production';
const MAX_AGE    = 60 * 60 * 24 * 7; // 7 days

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user) => set({ user, isAuthenticated: true }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      logout: () => {
        useWishlistStore.getState().clearWishlist();
        // Fire-and-forget: clear HttpOnly cookies on the server
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: COOKIE_KEY,
      storage: {
        getItem: () => {
          if (typeof document === 'undefined') return null;
          const match = document.cookie.match(
            new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`)
          );
          if (!match) return null;
          try {
            return JSON.parse(decodeURIComponent(match[1]));
          } catch {
            return null;
          }
        },
        setItem: (_key, value) => {
          if (typeof document === 'undefined') return;
          const expires = new Date(Date.now() + MAX_AGE * 1000).toUTCString();
          document.cookie = `${COOKIE_KEY}=${encodeURIComponent(
            JSON.stringify(value)
          )};expires=${expires};path=/;SameSite=Lax${IS_PROD ? ';Secure' : ''}`;
        },
        removeItem: () => {
          if (typeof document === 'undefined') return;
          document.cookie = `${COOKIE_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        },
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
