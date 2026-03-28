/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async rewrites() {
    const U  = process.env.USER_SERVICE_URL             || 'http://localhost:8001';
    const P  = process.env.PRODUCT_SERVICE_URL          || 'http://localhost:8002';
    const CA = process.env.CART_SERVICE_URL             || 'http://localhost:8003';
    const O  = process.env.ORDER_SERVICE_URL            || 'http://localhost:8004';
    const PY = process.env.PAYMENT_SERVICE_URL          || 'http://localhost:8005';
    const RV = process.env.REVIEW_SERVICE_URL           || 'http://localhost:8006';
    const S  = process.env.SELLER_SERVICE_URL           || 'http://localhost:8007';
    const N  = process.env.NOTIFICATION_SERVICE_URL     || 'http://localhost:8008';
    const SE = process.env.SEARCH_SERVICE_URL           || 'http://localhost:8009';
    const RC = process.env.RECOMMENDATION_SERVICE_URL   || 'http://localhost:8010';
    const RF = process.env.REFERRAL_SERVICE_URL         || 'http://localhost:8012';
    const D  = process.env.DELIVERY_SERVICE_URL         || 'http://localhost:8013';
    const AN = process.env.ANALYTICS_SERVICE_URL        || 'http://localhost:8014';
    const SF = process.env.STOREFRONT_SERVICE_URL       || 'http://localhost:8011';
    return [
      { source: '/api/v1/auth/:path*',             destination: `${U}/api/v1/auth/:path*` },
      { source: '/api/v1/users/:path*',             destination: `${U}/api/v1/users/:path*` },
      { source: '/api/v1/products',                  destination: `${P}/api/v1/products` },
      { source: '/api/v1/products/:path*',          destination: `${P}/api/v1/products/:path*` },
      { source: '/api/v1/categories',               destination: `${P}/api/v1/categories` },
      { source: '/api/v1/categories/:path*',        destination: `${P}/api/v1/categories/:path*` },
      { source: '/api/v1/banners/:path*',           destination: `${P}/api/v1/banners/:path*` },
      { source: '/api/v1/banners',                  destination: `${P}/api/v1/banners` },
      { source: '/api/v1/cart/:path*',              destination: `${CA}/api/v1/cart/:path*` },
      { source: '/api/v1/orders/:path*',            destination: `${O}/api/v1/orders/:path*` },
      { source: '/api/v1/coupons/:path*',           destination: `${O}/api/v1/coupons/:path*` },
      { source: '/api/v1/coupons',                  destination: `${O}/api/v1/coupons` },
      { source: '/api/v1/payments/:path*',          destination: `${PY}/api/v1/payments/:path*` },
      { source: '/api/v1/reviews/:path*',           destination: `${RV}/api/v1/reviews/:path*` },
      { source: '/api/v1/seller/:path*',            destination: `${S}/api/v1/seller/:path*` },
      { source: '/api/v1/notifications/:path*',     destination: `${N}/api/v1/notifications/:path*` },
      { source: '/api/v1/search/:path*',            destination: `${SE}/api/v1/search/:path*` },
      { source: '/api/v1/recommendations/:path*',   destination: `${RC}/api/v1/recommendations/:path*` },
      { source: '/api/v1/referrals/:path*',           destination: `${RF}/api/v1/referrals/:path*` },
      { source: '/api/v1/referral/:path*',            destination: `${RF}/api/v1/referrals/:path*` },  // singular alias
      { source: '/api/v1/admin/referrals',              destination: `${RF}/api/v1/admin/referrals` },
      { source: '/api/v1/admin/referrals/:path*',     destination: `${RF}/api/v1/admin/referrals/:path*` },
      { source: '/api/v1/admin/referral-config/:path*', destination: `${RF}/api/v1/admin/referral-config/:path*` },
      { source: '/api/v1/admin/referral-config',      destination: `${RF}/api/v1/admin/referral-config` },
      { source: '/api/v1/delivery/:path*',          destination: `${D}/api/v1/delivery/:path*` },
      { source: '/api/v1/analytics/:path*',         destination: `${AN}/api/v1/analytics/:path*` },
      { source: '/api/v1/storefront/:path*',        destination: `${SF}/api/v1/storefront/:path*` },
      { source: '/api/v1/storefront',               destination: `${SF}/api/v1/storefront` },
    ];
  },
};

module.exports = nextConfig;
