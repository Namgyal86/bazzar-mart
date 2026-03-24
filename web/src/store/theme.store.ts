import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemePreset {
  name: string;
  label: string;
  h: number;
  s: string;
  l: string;
  secondaryH: number;
  secondaryL: string;
  preview: string; // hex for visual preview
  previewTo: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: 'orange',  label: 'Orange',  h: 24,  s: '95%', l: '53%', secondaryH: 0,   secondaryL: '60%', preview: '#f97316', previewTo: '#ef4444' },
  { name: 'blue',    label: 'Blue',    h: 217, s: '91%', l: '60%', secondaryH: 239, secondaryL: '67%', preview: '#3b82f6', previewTo: '#6366f1' },
  { name: 'purple',  label: 'Purple',  h: 263, s: '70%', l: '50%', secondaryH: 330, secondaryL: '60%', preview: '#9333ea', previewTo: '#ec4899' },
  { name: 'green',   label: 'Green',   h: 142, s: '71%', l: '45%', secondaryH: 170, secondaryL: '40%', preview: '#22c55e', previewTo: '#10b981' },
  { name: 'red',     label: 'Red',     h: 0,   s: '84%', l: '60%', secondaryH: 15,  secondaryL: '55%', preview: '#ef4444', previewTo: '#f97316' },
  { name: 'cyan',    label: 'Cyan',    h: 188, s: '86%', l: '53%', secondaryH: 200, secondaryL: '60%', preview: '#06b6d4', previewTo: '#3b82f6' },
  { name: 'pink',    label: 'Pink',    h: 330, s: '82%', l: '60%', secondaryH: 300, secondaryL: '55%', preview: '#ec4899', previewTo: '#a855f7' },
  { name: 'indigo',  label: 'Indigo',  h: 239, s: '84%', l: '67%', secondaryH: 263, secondaryL: '50%', preview: '#818cf8', previewTo: '#9333ea' },
];

interface ThemeStore {
  themeName: string;
  logo: string;
  siteName: string;
  setTheme: (name: string) => void;
  setLogo: (url: string) => void;
  setSiteName: (name: string) => void;
  getPreset: () => ThemePreset;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeName: 'orange',
      logo: '',
      siteName: 'Bazzar',
      setTheme: (name) => set({ themeName: name }),
      setLogo: (url) => set({ logo: url }),
      setSiteName: (name) => set({ siteName: name }),
      getPreset: () => THEME_PRESETS.find(p => p.name === get().themeName) ?? THEME_PRESETS[0],
    }),
    { name: 'bazzar-theme' }
  )
);
