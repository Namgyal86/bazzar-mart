import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client';

export interface SiteSettings {
  siteName: string;
  logo: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  appStoreUrl: string;
  playStoreUrl: string;
}

const DEFAULTS: SiteSettings = {
  siteName: 'Bazzar',
  logo: '',
  description: "Nepal's trusted online marketplace. Order fresh produce, daily essentials, and more.",
  phone: '',
  email: '',
  address: '',
  facebook: '',
  instagram: '',
  twitter: '',
  youtube: '',
  appStoreUrl: '',
  playStoreUrl: '',
};

interface SiteSettingsStore {
  settings: SiteSettings;
  loaded: boolean;
  setSettings: (s: Partial<SiteSettings>) => void;
  fetchSettings: () => Promise<void>;
}

export const useSiteSettingsStore = create<SiteSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULTS,
      loaded: false,
      setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
      fetchSettings: async () => {
        try {
          const res = await (apiClient.get('/api/v1/settings/public') as any);
          const data = res.data?.data ?? {};
          set({ settings: { ...DEFAULTS, ...data }, loaded: true });
        } catch {
          set({ loaded: true });
        }
      },
    }),
    {
      name: 'bazzar-site-settings',
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);
