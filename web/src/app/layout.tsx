import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://bazzar.com'),
  title: {
    default: 'Bazzar — Nepal\'s Online Grocery & Mart Store',
    template: '%s | Bazzar',
  },
  description:
    'Order fresh groceries, daily essentials, and mart items online in Nepal. Fast delivery, secure payments with Khalti, eSewa, and more.',
  keywords: ['grocery', 'nepal', 'online grocery', 'khalti', 'esewa', 'fresh produce', 'mart', 'supermarket'],
  authors: [{ name: 'Bazzar Team' }],
  creator: 'Bazzar',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bazzar.com',
    title: 'Bazzar — Nepal\'s Online Grocery & Mart Store',
    description: 'Order fresh groceries and daily essentials online in Nepal.',
    siteName: 'Bazzar',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'var(--ap)' },
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
