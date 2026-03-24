'use client';

import { useEffect } from 'react';
import { useThemeStore, THEME_PRESETS } from '@/store/theme.store';

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeName } = useThemeStore();

  useEffect(() => {
    const preset = THEME_PRESETS.find(p => p.name === themeName) ?? THEME_PRESETS[0];
    const root = document.documentElement;
    root.style.setProperty('--ap-h', String(preset.h));
    root.style.setProperty('--ap-s', preset.s);
    root.style.setProperty('--ap-l', preset.l);
    root.style.setProperty('--ap-sh', String(preset.secondaryH));
    root.style.setProperty('--ap-sl', preset.secondaryL);
  }, [themeName]);

  return <>{children}</>;
}
