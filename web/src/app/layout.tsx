import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://bazzar.com'),
  title: {
    default: 'Bazzar — Nepal\'s Multi-Vendor Marketplace',
    template: '%s | Bazzar',
  },
  description:
    'Shop from thousands of sellers across Nepal. Fast delivery, secure payments with Khalti, eSewa, and more.',
  keywords: ['ecommerce', 'nepal', 'online shopping', 'khalti', 'esewa', 'marketplace'],
  authors: [{ name: 'Bazzar Team' }],
  creator: 'Bazzar',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bazzar.com',
    title: 'Bazzar — Nepal\'s Multi-Vendor Marketplace',
    description: 'Shop from thousands of sellers across Nepal.',
    siteName: 'Bazzar',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f97316' },
    { media: '(prefers-color-scheme: dark)', color: '#ea580c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
