/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'framer-motion',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.bazzar.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'placeholder.com' },
      { protocol: 'https', hostname: 'loremflickr.com' },
      { protocol: 'https', hostname: '*.cloudinary.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    // Monolith handles all modules on a single port.
    // Only delivery-service and notification-service remain as separate processes.
    const M  = process.env.MONOLITH_URL          || 'http://localhost:8100';
    const D  = process.env.DELIVERY_SERVICE_URL  || 'http://localhost:8013';
    const N  = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8008';
    return [
      // ── Auth & Users ──────────────────────────────────────────────────────
      { source: '/api/v1/auth/:path*',                  destination: `${M}/api/v1/auth/:path*` },
      { source: '/api/v1/users/:path*',                 destination: `${M}/api/v1/users/:path*` },

      // ── Products, Categories, Banners, Upload ─────────────────────────────
      { source: '/api/v1/products',                     destination: `${M}/api/v1/products` },
      { source: '/api/v1/products/:path*',              destination: `${M}/api/v1/products/:path*` },
      { source: '/api/v1/categories',                   destination: `${M}/api/v1/categories` },
      { source: '/api/v1/categories/:path*',            destination: `${M}/api/v1/categories/:path*` },
      { source: '/api/v1/banners',                      destination: `${M}/api/v1/banners` },
      { source: '/api/v1/banners/:path*',               destination: `${M}/api/v1/banners/:path*` },
      { source: '/api/v1/upload/:path*',                destination: `${M}/api/v1/upload/:path*` },

      // ── Cart ──────────────────────────────────────────────────────────────
      { source: '/api/v1/cart/:path*',                  destination: `${M}/api/v1/cart/:path*` },

      // ── Orders & Coupons ──────────────────────────────────────────────────
      { source: '/api/v1/orders/:path*',                destination: `${M}/api/v1/orders/:path*` },
      { source: '/api/v1/coupons',                      destination: `${M}/api/v1/coupons` },
      { source: '/api/v1/coupons/:path*',               destination: `${M}/api/v1/coupons/:path*` },

      // ── Payments ──────────────────────────────────────────────────────────
      { source: '/api/v1/payments/:path*',              destination: `${M}/api/v1/payments/:path*` },

      // ── Reviews ───────────────────────────────────────────────────────────
      { source: '/api/v1/reviews/:path*',               destination: `${M}/api/v1/reviews/:path*` },

      // ── Sellers ───────────────────────────────────────────────────────────
      { source: '/api/v1/seller/:path*',                destination: `${M}/api/v1/seller/:path*` },

      // ── Search ────────────────────────────────────────────────────────────
      { source: '/api/v1/search/:path*',                destination: `${M}/api/v1/search/:path*` },

      // ── Recommendations ───────────────────────────────────────────────────
      { source: '/api/v1/recommendations/:path*',       destination: `${M}/api/v1/recommendations/:path*` },

      // ── Referrals ─────────────────────────────────────────────────────────
      { source: '/api/v1/referrals/:path*',             destination: `${M}/api/v1/referrals/:path*` },
      { source: '/api/v1/referral/:path*',              destination: `${M}/api/v1/referrals/:path*` }, // singular alias

      // ── Support ───────────────────────────────────────────────────────────
      { source: '/api/v1/support',                      destination: `${M}/api/v1/support` },
      { source: '/api/v1/support/:path*',               destination: `${M}/api/v1/support/:path*` },

      // ── Storefront ────────────────────────────────────────────────────────
      { source: '/api/v1/storefront',                   destination: `${M}/api/v1/storefront` },
      { source: '/api/v1/storefront/:path*',            destination: `${M}/api/v1/storefront/:path*` },

      // ── Analytics ─────────────────────────────────────────────────────────
      { source: '/api/v1/stats',                        destination: `${M}/api/v1/stats` },
      { source: '/api/v1/analytics/:path*',             destination: `${M}/api/v1/analytics/:path*` },
      { source: '/api/v1/settings/public',              destination: `${M}/api/v1/settings/public` },

      // ── Admin routes (all served by monolith) ─────────────────────────────
      { source: '/api/v1/admin/dashboard',              destination: `${M}/api/v1/analytics/admin/overview` },
      { source: '/api/v1/admin/users',                  destination: `${M}/api/v1/users/admin/list` },
      { source: '/api/v1/admin/users/:path*',           destination: `${M}/api/v1/users/admin/:path*` },
      { source: '/api/v1/admin/sellers',                destination: `${M}/api/v1/seller/admin/list` },
      { source: '/api/v1/admin/sellers/:path*',         destination: `${M}/api/v1/seller/admin/:path*` },
      { source: '/api/v1/admin/orders',                 destination: `${M}/api/v1/orders/all` },
      { source: '/api/v1/admin/orders/:path*',          destination: `${M}/api/v1/orders/:path*` },
      { source: '/api/v1/admin/referrals',              destination: `${M}/api/v1/admin/referrals` },
      { source: '/api/v1/admin/referrals/:path*',       destination: `${M}/api/v1/admin/referrals/:path*` },
      { source: '/api/v1/admin/referral-config',        destination: `${M}/api/v1/admin/referral-config` },
      { source: '/api/v1/admin/referral-config/:path*', destination: `${M}/api/v1/admin/referral-config/:path*` },

      // ── Delivery now served by monolith ──────────────────────────────────
      { source: '/api/v1/delivery/:path*',              destination: `${M}/api/v1/delivery/:path*` },
      // Notifications now served by monolith (same JWT secret, same DB)
      { source: '/api/v1/notifications',                destination: `${M}/api/v1/notifications` },
      { source: '/api/v1/notifications/:path*',         destination: `${M}/api/v1/notifications/:path*` },
    ];
  },
};

module.exports = nextConfig;
