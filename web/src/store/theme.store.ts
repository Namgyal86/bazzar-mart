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

/** Convert a #rrggbb hex string to HSL components */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else                h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

interface ThemeStore {
  themeName: string;
  customColor: string;   // hex, used when themeName === 'custom'
  logo: string;
  siteName: string;
  setTheme: (name: string) => void;
  setCustomColor: (hex: string) => void;
  setLogo: (url: string) => void;
  setSiteName: (name: string) => void;
  getPreset: () => ThemePreset;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeName: 'orange',
      customColor: '#6366f1',
      logo: '',
      siteName: 'Bazzar',
      setTheme: (name) => set({ themeName: name }),
      setCustomColor: (hex) => set({ customColor: hex, themeName: 'custom' }),
      setLogo: (url) => set({ logo: url }),
      setSiteName: (name) => set({ siteName: name }),
      getPreset: () => {
        const { themeName, customColor } = get();
        if (themeName === 'custom') {
          const { h, s, l } = hexToHsl(customColor);
          // Secondary is the complementary hue offset by ~30 degrees
          return {
            name: 'custom',
            label: 'Custom',
            h,
            s: `${s}%`,
            l: `${l}%`,
            secondaryH: (h + 30) % 360,
            secondaryL: `${Math.max(l - 5, 30)}%`,
            preview: customColor,
            previewTo: customColor,
          };
        }
        return THEME_PRESETS.find(p => p.name === themeName) ?? THEME_PRESETS[0];
      },
    }),
    { name: 'bazzar-theme' }
  )
);
