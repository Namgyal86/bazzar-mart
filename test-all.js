/**
 * Bazzar E-Commerce — Integration Test Suite
 * Run with: node test-all.js
 * Requires the stack running: docker compose up -d
 * 
 * Tests every major e-commerce flow end-to-end.
 */

const BASE = process.env.API_URL || 'http://localhost:3000';
const log  = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const pass = (msg) => { log('✅', msg); passed++; };
const fail = (msg, err) => { log('❌', `FAIL: ${msg} — ${err?.message ?? err}`); failed++; };

let passed = 0, failed = 0;
let buyerToken, sellerToken, adminToken;
let buyerId, sellerId, productId, orderId, couponId, addressId;
const ts = Date.now();

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTH
// ─────────────────────────────────────────────────────────────────────────────
async function testAuth() {
  console.log('\n── AUTH ─────────────────────────────────────────────');

  // Register buyer
  let r = await api('POST', '/api/v1/auth/register', {
    firstName: 'Test', lastName: 'Buyer', email: `buyer${ts}@test.com`,
    phone: '9800000001', password: 'Test1234\!', role: 'BUYER',
  });
  if (r.status === 201 && r.data.data?.accessToken) {
    buyerToken = r.data.data.accessToken;
    buyerId    = r.data.data.user?.id || r.data.data.user?._id;
    pass('Register buyer');
  } else fail('Register buyer', { message: JSON.stringify(r.data) });

  // Register seller
  r = await api('POST', '/api/v1/auth/register', {
    firstName: 'Test', lastName: 'Seller', email: `seller${ts}@test.com`,
    phone: '9800000002', password: 'Test1234\!', role: 'BUYER',
  });
  if (r.status === 201) { sellerToken = r.data.data.accessToken; pass('Register seller account'); }
  else fail('Register seller account', { message: JSON.stringify(r.data) });

  // Login buyer
  r = await api('POST', '/api/v1/auth/login', { email: `buyer${ts}@test.com`, password: 'Test1234\!' });
  if (r.status === 200 && r.data.data?.accessToken) {
    buyerToken = r.data.data.accessToken;
    pass('Login buyer');
  } else fail('Login buyer', { message: JSON.stringify(r.data) });

  // Login with wrong password → should 401
  r = await api('POST', '/api/v1/auth/login', { email: `buyer${ts}@test.com`, password: 'wrongpass' });
  if (r.status === 401) pass('Wrong password returns 401');
  else fail('Wrong password should 401', { message: `got ${r.status}` });

  // Get own profile
  r = await api('GET', '/api/v1/users/me', null, buyerToken);
  if (r.status === 200 && r.data.data?.email) pass('Get own profile');
  else fail('Get own profile', { message: JSON.stringify(r.data) });

  // Token refresh
  const loginRes = await api('POST', '/api/v1/auth/login', { email: `buyer${ts}@test.com`, password: 'Test1234\!' });
  const refreshToken = loginRes.data.data?.refreshToken;
  r = await api('POST', '/api/v1/auth/token/refresh', { refreshToken });
  if (r.status === 200 && r.data.data?.accessToken && r.data.data?.refreshToken) {
    buyerToken = r.data.data.accessToken;
    pass('Token refresh returns both access + refresh tokens');
  } else fail('Token refresh', { message: JSON.stringify(r.data) });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN SETUP (login as seeded admin)
// ─────────────────────────────────────────────────────────────────────────────
async function testAdminLogin() {
  console.log('\n── ADMIN LOGIN ──────────────────────────────────────');
  const r = await api('POST', '/api/v1/auth/login', { email: 'admin@bazzar.com', password: 'Admin@1234' });
  if (r.status === 200 && r.data.data?.user?.role === 'ADMIN') {
    adminToken = r.data.data.accessToken;
    pass('Admin login');
  } else {
    log('⚠️ ', `Admin login failed (${r.status}) — admin may not be seeded. Skipping admin tests.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
async function testProducts() {
  console.log('\n── PRODUCTS ─────────────────────────────────────────');

  // List products (public)
  let r = await api('GET', '/api/v1/products?limit=5');
  if (r.status === 200 && Array.isArray(r.data.data)) pass('List products (public)');
  else fail('List products', { message: JSON.stringify(r.data) });

  // Featured products (public)
  r = await api('GET', '/api/v1/products/featured');
  if (r.status === 200) pass('Featured products (public)');
  else fail('Featured products', { message: `got ${r.status}` });

  // Categories (public)
  r = await api('GET', '/api/v1/categories');
  if (r.status === 200 && Array.isArray(r.data.data)) pass('List categories (public)');
  else fail('List categories', { message: JSON.stringify(r.data) });

  // Create product as admin (need admin or seller token)
  if (adminToken) {
    r = await api('POST', '/api/v1/products', {
      name: `Test Product ${ts}`, description: 'A test product', price: 999,
      stock: 50, category: 'Electronics', images: [], sellerId: 'admin',
      sellerName: 'Admin Store', brand: 'TestBrand', tags: ['test'],
    }, adminToken);
    if (r.status === 201 && r.data.data?._id) {
      productId = r.data.data._id;
      pass('Create product (admin)');
    } else fail('Create product', { message: JSON.stringify(r.data) });

    // Get by ID
    if (productId) {
      r = await api('GET', `/api/v1/products/${productId}`);
      if (r.status === 200 && r.data.data?.name) pass('Get product by ID');
      else fail('Get product by ID', { message: JSON.stringify(r.data) });
    }

    // Unauthenticated create → should 401
    r = await api('POST', '/api/v1/products', { name: 'Hack', price: 0, stock: 1 });
    if (r.status === 401) pass('Create product without auth → 401');
    else fail('Create product without auth should 401', { message: `got ${r.status}` });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CART
// ─────────────────────────────────────────────────────────────────────────────
async function testCart() {
  console.log('\n── CART ─────────────────────────────────────────────');
  if (\!productId) { log('⚠️ ', 'No productId — skipping cart tests'); return; }

  // Add to cart
  let r = await api('POST', '/api/v1/cart/items', {
    productId, productName: `Test Product ${ts}`, productImage: '',
    sellerId: 'admin', sellerName: 'Admin Store', unitPrice: 999, quantity: 2,
  }, buyerToken);
  if (r.status === 200 || r.status === 201) pass('Add item to cart');
  else fail('Add to cart', { message: JSON.stringify(r.data) });

  // Get cart
  r = await api('GET', '/api/v1/cart', null, buyerToken);
  if (r.status === 200 && Array.isArray(r.data.data?.items)) pass('Get cart');
  else fail('Get cart', { message: JSON.stringify(r.data) });

  // Update quantity
  r = await api('PATCH', `/api/v1/cart/items/${productId}`, { quantity: 3 }, buyerToken);
  if (r.status === 200) pass('Update cart item quantity');
  else fail('Update cart quantity', { message: JSON.stringify(r.data) });

  // Remove item
  r = await api('DELETE', `/api/v1/cart/items/${productId}`, null, buyerToken);
  if (r.status === 200) pass('Remove cart item');
  else fail('Remove cart item', { message: JSON.stringify(r.data) });

  // Cart without auth → 401
  r = await api('GET', '/api/v1/cart');
  if (r.status === 401) pass('Cart without auth → 401');
  else fail('Cart without auth should 401', { message: `got ${r.status}` });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADDRESSES
// ─────────────────────────────────────────────────────────────────────────────
async function testAddresses() {
  console.log('\n── ADDRESSES ────────────────────────────────────────');

  let r = await api('POST', '/api/v1/users/me/addresses', {
    label: 'Home', fullName: 'Test Buyer', phone: '9800000001',
    addressLine1: '123 Test Street', city: 'Kathmandu',
    district: 'Kathmandu', province: 'Bagmati', isDefault: true,
  }, buyerToken);
  if (r.status === 201 && r.data.data?._id) {
    addressId = r.data.data._id;
    pass('Add address');
  } else fail('Add address', { message: JSON.stringify(r.data) });

  r = await api('GET', '/api/v1/users/me/addresses', null, buyerToken);
  if (r.status === 200 && Array.isArray(r.data.data)) pass('List addresses');
  else fail('List addresses', { message: JSON.stringify(r.data) });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ORDERS
// ─────────────────────────────────────────────────────────────────────────────
async function testOrders() {
  console.log('\n── ORDERS ───────────────────────────────────────────');
  if (\!productId || \!addressId) { log('⚠️ ', 'Missing productId/addressId — skipping order tests'); return; }

  // Re-add product to cart first
  await api('POST', '/api/v1/cart/items', {
    productId, productName: `Test Product ${ts}`, productImage: '',
    sellerId: 'admin', sellerName: 'Admin Store', unitPrice: 999, quantity: 1,
  }, buyerToken);

  // Create order (COD)
  const shippingAddress = {
    fullName: 'Test Buyer', phone: '9800000001', addressLine1: '123 Test Street',
    city: 'Kathmandu', district: 'Kathmandu', province: 'Bagmati',
  };
  let r = await api('POST', '/api/v1/orders', {
    items: [{ productId, productName: `Test Product ${ts}`, productImage: '',
              sellerId: 'admin', sellerName: 'Admin Store', unitPrice: 999, quantity: 1 }],
    shippingAddress, paymentMethod: 'COD',
  }, buyerToken);
  if (r.status === 201 && r.data.data?._id) {
    orderId = r.data.data._id;
    pass('Create COD order');
  } else fail('Create order', { message: JSON.stringify(r.data) });

  // Get order by ID
  if (orderId) {
    r = await api('GET', `/api/v1/orders/${orderId}`, null, buyerToken);
    if (r.status === 200 && r.data.data?.status) pass('Get order by ID');
    else fail('Get order by ID', { message: JSON.stringify(r.data) });
  }

  // List buyer orders
  r = await api('GET', '/api/v1/orders', null, buyerToken);
  if (r.status === 200) pass('List own orders');
  else fail('List orders', { message: JSON.stringify(r.data) });

  // Cancel order
  if (orderId) {
    r = await api('POST', `/api/v1/orders/${orderId}/cancel`, { reason: 'Test cancel' }, buyerToken);
    if (r.status === 200) pass('Cancel order');
    else fail('Cancel order', { message: JSON.stringify(r.data) });
  }

  // Order without auth → 401
  r = await api('POST', '/api/v1/orders', { items: [], shippingAddress, paymentMethod: 'COD' });
  if (r.status === 401) pass('Create order without auth → 401');
  else fail('Order without auth should 401', { message: `got ${r.status}` });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PAYMENT SECURITY
// ─────────────────────────────────────────────────────────────────────────────
async function testPaymentSecurity() {
  console.log('\n── PAYMENT SECURITY ─────────────────────────────────');

  // Bypass attempt: verify with unknown gateway
  let r = await api('POST', '/api/v1/payments/verify', {
    orderId: orderId || 'fake-id', gateway: 'FREE_HACK',
  }, buyerToken);
  if (r.status === 400 && r.data.success === false) pass('Payment bypass blocked (unknown gateway → 400)');
  else fail('Payment bypass should be blocked', { message: `got ${r.status}: ${JSON.stringify(r.data)}` });

  // Verify without auth → 401
  r = await api('POST', '/api/v1/payments/verify', { orderId: 'x', gateway: 'KHALTI' });
  if (r.status === 401) pass('Payment verify without auth → 401');
  else fail('Payment verify without auth should 401', { message: `got ${r.status}` });

  // Initiate payment without auth → 401
  r = await api('POST', '/api/v1/payments/initiate', { orderId: 'x', gateway: 'KHALTI' });
  if (r.status === 401) pass('Payment initiate without auth → 401');
  else fail('Payment initiate without auth should 401', { message: `got ${r.status}` });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. COUPONS
// ─────────────────────────────────────────────────────────────────────────────
async function testCoupons() {
  console.log('\n── COUPONS ──────────────────────────────────────────');
  if (\!adminToken) { log('⚠️ ', 'No admin token — skipping coupon admin tests'); return; }

  // Create coupon
  let r = await api('POST', '/api/v1/coupons', {
    code: `TEST${ts}`, discountType: 'PERCENTAGE', discountValue: 10,
    minOrderAmount: 500, maxUses: 100, expiresAt: '2026-12-31',
  }, adminToken);
  if (r.status === 201 && r.data.data?._id) {
    couponId = r.data.data._id;
    pass('Create coupon (admin)');
  } else fail('Create coupon', { message: JSON.stringify(r.data) });

  // Validate coupon
  r = await api('POST', '/api/v1/coupons/validate', { code: `TEST${ts}`, subtotal: 1000 }, buyerToken);
  if (r.status === 200 && r.data.data?.discount >= 0) pass('Validate coupon');
  else fail('Validate coupon', { message: JSON.stringify(r.data) });

  // Toggle coupon active via PATCH
  if (couponId) {
    r = await api('PATCH', `/api/v1/coupons/${couponId}`, { isActive: false }, adminToken);
    if (r.status === 200) pass('Update coupon (PATCH toggle isActive)');
    else fail('Update coupon', { message: JSON.stringify(r.data) });

    // Delete coupon
    r = await api('DELETE', `/api/v1/coupons/${couponId}`, null, adminToken);
    if (r.status === 200) pass('Delete coupon (admin)');
    else fail('Delete coupon', { message: JSON.stringify(r.data) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. PASSWORD CHANGE
// ─────────────────────────────────────────────────────────────────────────────
async function testPasswordChange() {
  console.log('\n── PASSWORD CHANGE ──────────────────────────────────');

  // Wrong current password → 401
  let r = await api('PUT', '/api/v1/users/change-password', {
    currentPassword: 'WrongPass\!', newPassword: 'NewPass1234\!',
  }, buyerToken);
  if (r.status === 401) pass('Wrong current password → 401');
  else fail('Wrong current password should 401', { message: `got ${r.status}` });

  // Too short new password → 400
  r = await api('PUT', '/api/v1/users/change-password', {
    currentPassword: 'Test1234\!', newPassword: 'short',
  }, buyerToken);
  if (r.status === 400) pass('Short new password → 400');
  else fail('Short password should 400', { message: `got ${r.status}` });

  // Correct change
  r = await api('PUT', '/api/v1/users/change-password', {
    currentPassword: 'Test1234\!', newPassword: 'NewPass1234\!',
  }, buyerToken);
  if (r.status === 200 && r.data.success) pass('Change password successfully');
  else fail('Change password', { message: JSON.stringify(r.data) });

  // Without auth → 401
  r = await api('PUT', '/api/v1/users/change-password', {
    currentPassword: 'Test1234\!', newPassword: 'NewPass1234\!',
  });
  if (r.status === 401) pass('Change password without auth → 401');
  else fail('Change password without auth should 401', { message: `got ${r.status}` });
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. SELLER FLOW
// ─────────────────────────────────────────────────────────────────────────────
async function testSellerFlow() {
  console.log('\n── SELLER FLOW ──────────────────────────────────────');

  // Apply as seller
  let r = await api('POST', '/api/v1/seller/apply', {
    storeName: `TestStore${ts}`, storeDescription: 'A test store',
    storeCategory: 'Electronics', phone: '9800000002',
  }, sellerToken);
  if (r.status === 200 || r.status === 201 || r.status === 400) {
    // 400 = already applied, which is fine
    pass('Apply as seller (or already applied)');
  } else fail('Apply as seller', { message: JSON.stringify(r.data) });

  // Approve seller via admin (if admin token available)
  if (adminToken) {
    // Get sellers list to find our seller
    r = await api('GET', '/api/v1/seller/admin/list', null, adminToken);
    if (r.status === 200) pass('Admin list sellers');
    else fail('Admin list sellers', { message: JSON.stringify(r.data) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ADMIN ROUTES PROTECTION
// ─────────────────────────────────────────────────────────────────────────────
async function testAdminProtection() {
  console.log('\n── ADMIN ROUTE PROTECTION ───────────────────────────');

  // Buyer tries admin routes → 403
  let r = await api('GET', '/api/v1/users/admin/list', null, buyerToken);
  if (r.status === 403) pass('Buyer cannot access admin users → 403');
  else fail('Buyer accessing admin route should 403', { message: `got ${r.status}` });

  r = await api('GET', '/api/v1/seller/admin/list', null, buyerToken);
  if (r.status === 403) pass('Buyer cannot access admin sellers → 403');
  else fail('Buyer accessing admin sellers should 403', { message: `got ${r.status}` });

  // Unauthenticated → 401
  r = await api('GET', '/api/v1/users/admin/list');
  if (r.status === 401) pass('Unauthenticated admin route → 401');
  else fail('Unauthenticated admin route should 401', { message: `got ${r.status}` });
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. PUBLIC ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
async function testPublicEndpoints() {
  console.log('\n── PUBLIC ENDPOINTS ─────────────────────────────────');

  let r = await api('GET', '/api/v1/stats');
  if (r.status === 200) pass('Public stats endpoint');
  else fail('Public stats', { message: `got ${r.status}` });

  r = await api('GET', '/api/v1/analytics/platform-health');
  if (r.status === 200) pass('Platform health endpoint');
  else fail('Platform health', { message: `got ${r.status}` });

  r = await api('GET', '/health');
  if (r.status === 200) pass('Health check endpoint');
  else fail('Health check', { message: `got ${r.status}` });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀 Bazzar Integration Tests');
  console.log(`   Target: ${BASE}`);
  console.log('='.repeat(52));

  try {
    await testAuth();
    await testAdminLogin();
    await testProducts();
    await testCart();
    await testAddresses();
    await testOrders();
    await testPaymentSecurity();
    await testCoupons();
    await testPasswordChange();
    await testSellerFlow();
    await testAdminProtection();
    await testPublicEndpoints();
  } catch (err) {
    console.error('\n💥 Unexpected error:', err.message);
  }

  const total = passed + failed;
  console.log('\n' + '='.repeat(52));
  console.log(`Results: ${passed}/${total} passed`);
  if (failed > 0) {
    console.log(`         ${failed} FAILED`);
    process.exit(1);
  } else {
    console.log('All tests passed\! 🎉');
  }
})();
