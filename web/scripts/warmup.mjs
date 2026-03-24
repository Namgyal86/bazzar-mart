/**
 * Warmup script — hits every app route so Next.js compiles them all on startup.
 * HMR (auto-recompile on file change) still works normally after this.
 */

const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;

const ROUTES = [
  // Public
  '/',
  '/auth/login',
  '/auth/register',
  '/contact',
  '/contact/admin',
  '/sellers/register',
  '/privacy',
  '/terms',
  '/deals',
  '/wishlist',
  // Buyer account
  '/account/orders',
  '/account/profile',
  '/account/addresses',
  '/account/notifications',
  // Admin
  '/admin/dashboard',
  '/admin/analytics',
  '/admin/users',
  '/admin/sellers',
  '/admin/products',
  '/admin/orders',
  '/admin/delivery',
  '/admin/coupons',
  '/admin/reviews',
  '/admin/banners',
  '/admin/notifications',
  '/admin/settings',
  '/admin/support',
  // Seller
  '/seller/dashboard',
  '/seller/products',
  '/seller/orders',
  '/seller/analytics',
  '/seller/payouts',
  '/seller/storefront',
  '/seller/notifications',
  '/seller/settings',
  '/seller/products/new',
];

async function waitForServer(maxAttempts = 40, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(3000) });
      if (res.status < 600) return true;
    } catch {}
    process.stdout.write(`\r[warmup] Waiting for server on :${PORT}... (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function main() {
  const ready = await waitForServer();
  if (!ready) {
    console.log('\n[warmup] Server did not become ready — skipping pre-compilation.');
    return;
  }

  console.log(`\n[warmup] Server ready! Pre-compiling ${ROUTES.length} routes...`);

  let ok = 0;
  let fail = 0;
  for (const route of ROUTES) {
    try {
      await fetch(`${BASE}${route}`, { signal: AbortSignal.timeout(90_000) });
      console.log(`[warmup] ✓ ${route}`);
      ok++;
    } catch (err) {
      console.log(`[warmup] ✗ ${route}  (${err.message})`);
      fail++;
    }
  }

  console.log(`\n[warmup] Done — ${ok} compiled, ${fail} failed.\n`);
}

main().catch(console.error);
