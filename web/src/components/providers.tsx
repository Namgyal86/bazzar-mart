'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { useThemeStore, THEME_PRESETS } from '@/store/theme.store';

function GlobalThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeName } = useThemeStore();

  useEffect(() => {
    const preset = THEME_PRESETS.find(p => p.name === themeName) ?? THEME_PRESETS[0];
    const root = document.documentElement;
    root.style.setProperty('--ap-h', String(preset.h));
    root.style.setProperty('--ap-s', preset.s);
    root.style.setProperty('--ap-l', preset.l);
    root.style.setProperty('--ap-sh', String(preset.secondaryH));
    root.style.setProperty('--ap-sl', preset.secondaryL);
    // Update browser chrome theme-color meta tag dynamically
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', preset.preview);
  }, [themeName]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <GlobalThemeProvider>
          {children}
        </GlobalThemeProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
