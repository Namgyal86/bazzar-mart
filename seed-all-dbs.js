const mongoose = require('mongoose');

async function seedAll() {
  // Read users
  const userConn = await mongoose.createConnection('mongodb://localhost:27017/user_db').asPromise();
  const users = await userConn.db.collection('users').find({ role: 'BUYER' }, { projection: { _id: 1, firstName: 1, lastName: 1, email: 1 } }).limit(10).toArray();
  await userConn.close();

  // Read products
  const prodConn = await mongoose.createConnection('mongodb://localhost:27018/product_db').asPromise();
  const products = await prodConn.db.collection('products').find({}, { projection: { _id: 1, name: 1, images: 1, category: 1, price: 1, sellerId: 1, sellerName: 1 } }).toArray();
  await prodConn.close();

  console.log('Users:', users.length, '| Products:', products.length);
  const userList = users.length > 0 ? users : [{ _id: 'demo-user-001', firstName: 'Demo', lastName: 'User', email: 'demo@test.com' }];

  // ── ORDERS + COUPONS (port 27019) ────────────────────────────────────────────
  const orderConn = await mongoose.createConnection('mongodb://localhost:27019/order_db').asPromise();
  await orderConn.db.collection('orders').deleteMany({});

  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'CANCELLED'];
  const payMethods = ['COD', 'KHALTI', 'ESEWA', 'COD', 'KHALTI'];
  const payStatuses = { DELIVERED: 'PAID', SHIPPED: 'PAID', PROCESSING: 'PAID', CONFIRMED: 'PENDING', PENDING: 'PENDING', CANCELLED: 'FAILED' };
  const cities = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Biratnagar'];
  const districts = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kaski', 'Morang'];

  const orders = [];
  for (let i = 0; i < 25; i++) {
    const user = userList[i % userList.length];
    const status = statuses[i % statuses.length];
    const numItems = (i % 3) + 1;
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const prod = products[(i * 3 + j) % products.length];
      const qty = (j % 3) + 1;
      const price = prod.price || 100;
      items.push({
        productId: prod._id.toString(),
        productName: prod.name,
        productImage: (prod.images || [])[0] || '',
        sellerId: prod.sellerId || 'demo-seller-001',
        sellerName: prod.sellerName || 'FreshMart Nepal',
        unitPrice: price,
        quantity: qty,
        totalPrice: price * qty,
      });
      subtotal += price * qty;
    }
    const cityIdx = i % cities.length;
    const payMethod = payMethods[i % payMethods.length];
    const createdAt = new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000);
    const discount = i % 5 === 0 ? Math.round(subtotal * 0.1) : 0;
    orders.push({
      orderNumber: 'ORD-' + (1000 + i).toString(),
      userId: user._id.toString(),
      userEmail: user.email,
      items,
      shippingAddress: {
        fullName: user.firstName + ' ' + user.lastName,
        phone: '984100000' + i,
        addressLine1: (i + 1) + ' Main Street',
        city: cities[cityIdx],
        district: districts[cityIdx],
        province: 'Bagmati',
      },
      paymentMethod: payMethod,
      paymentStatus: payStatuses[status] || 'PENDING',
      status,
      subtotal,
      shippingFee: subtotal > 500 ? 0 : 60,
      discount,
      total: subtotal + (subtotal > 500 ? 0 : 60) - discount,
      statusHistory: [{ status, timestamp: createdAt }],
      estimatedDelivery: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
      createdAt,
      updatedAt: new Date(),
    });
  }
  await orderConn.db.collection('orders').insertMany(orders);
  console.log('Seeded orders:', orders.length);

  await orderConn.db.collection('coupons').deleteMany({});
  await orderConn.db.collection('coupons').insertMany([
    { code: 'FRESH10', type: 'PERCENTAGE', value: 10, minOrder: 200, usageLimit: 500, usageCount: 142, validUntil: new Date('2026-12-31'), isActive: true, description: '10% off on all orders', createdAt: new Date() },
    { code: 'DAIRY50', type: 'FIXED', value: 50, minOrder: 300, usageLimit: 200, usageCount: 67, validUntil: new Date('2026-06-30'), isActive: true, description: 'Rs. 50 off on dairy products', createdAt: new Date() },
    { code: 'NEWUSER20', type: 'PERCENTAGE', value: 20, minOrder: 100, usageLimit: 1000, usageCount: 389, validUntil: new Date('2026-12-31'), isActive: true, description: '20% off for new users', createdAt: new Date() },
    { code: 'FREESHIP', type: 'FIXED', value: 60, minOrder: 0, usageLimit: 300, usageCount: 201, validUntil: new Date('2026-09-30'), isActive: true, description: 'Free shipping on any order', createdAt: new Date() },
    { code: 'FESTIVAL25', type: 'PERCENTAGE', value: 25, minOrder: 500, usageLimit: 100, usageCount: 100, validUntil: new Date('2026-01-01'), isActive: false, description: 'Festival season discount', createdAt: new Date() },
  ]);
  console.log('Seeded coupons: 5');
  await orderConn.close();

  // ── REVIEWS (port 27021) ─────────────────────────────────────────────────────
  const reviewConn = await mongoose.createConnection('mongodb://localhost:27021/review_db').asPromise();
  await reviewConn.db.collection('reviews').deleteMany({});
  const reviewBodies = [
    'Excellent quality! Very fresh and delivered on time.',
    'Good product, packaging was intact. Will order again.',
    'Loved it! The taste is amazing and very fresh.',
    'Decent quality for the price. Delivery was a bit slow.',
    'Premium quality. Exactly as described. Highly recommend!',
    'Fresh and clean. My family loved it.',
    'Great value for money. Will definitely reorder.',
    'Average quality. Expected better for the price.',
    'Super fresh! Delivered within 2 hours. Impressive.',
    'Good product but quantity was slightly less than expected.',
  ];
  const reviewTitles = ['Great product!', 'Very fresh', 'Good quality', 'Worth buying', 'Excellent!', 'Loved it', 'Will buy again', 'Decent', 'Amazing quality', 'Satisfied'];
  const reviewers = [
    { userId: 'u1', userName: 'Ramesh S.' },
    { userId: 'u2', userName: 'Sita K.' },
    { userId: 'u3', userName: 'Bikash T.' },
    { userId: 'u4', userName: 'Priya M.' },
    { userId: 'u5', userName: 'Sunil G.' },
  ];
  const reviewStatuses = ['APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'PENDING', 'APPROVED', 'APPROVED', 'REJECTED'];
  const reviews = [];
  for (let i = 0; i < products.length * 2; i++) {
    const prod = products[i % products.length];
    const reviewer = reviewers[i % reviewers.length];
    reviews.push({
      productId: prod._id.toString(),
      productName: prod.name,
      userId: reviewer.userId + '_' + i,
      userName: reviewer.userName,
      rating: [3, 4, 4, 5, 5][i % 5],
      title: reviewTitles[i % reviewTitles.length],
      body: reviewBodies[i % reviewBodies.length],
      images: [],
      isVerifiedPurchase: i % 3 !== 0,
      helpfulCount: Math.floor(Math.random() * 20),
      isActive: true,
      status: reviewStatuses[i % reviewStatuses.length],
      createdAt: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
  }
  await reviewConn.db.collection('reviews').insertMany(reviews);
  console.log('Seeded reviews:', reviews.length);
  await reviewConn.close();

  // ── NOTIFICATIONS (port 27023) ───────────────────────────────────────────────
  const notifConn = await mongoose.createConnection('mongodb://localhost:27023/notification_db').asPromise();
  await notifConn.db.collection('notifications').deleteMany({});
  const notifData = userList.slice(0, 5).flatMap((u, i) => [
    { userId: u._id.toString(), type: 'ORDER', title: 'Order Confirmed', message: 'Your order ORD-100' + i + ' has been confirmed!', isRead: true, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { userId: u._id.toString(), type: 'ORDER', title: 'Order Shipped', message: 'Your order is on the way. Expected delivery in 2 hours.', isRead: i > 2, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    { userId: u._id.toString(), type: 'PROMOTION', title: 'Special Offer!', message: 'Get 20% off on all dairy products today. Use code DAIRY50.', isRead: false, createdAt: new Date() },
    { userId: u._id.toString(), type: 'SYSTEM', title: 'Welcome to Bazzar!', message: 'Start shopping fresh groceries from local sellers near you.', isRead: true, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  ]);
  if (notifData.length > 0) await notifConn.db.collection('notifications').insertMany(notifData);
  console.log('Seeded notifications:', notifData.length);
  await notifConn.close();

  // ── REFERRALS + WALLETS (port 27025) ─────────────────────────────────────────
  const referralConn = await mongoose.createConnection('mongodb://localhost:27025/referral_db').asPromise();
  await referralConn.db.collection('referrals').deleteMany({});
  const refStatuses = ['PENDING', 'COMPLETED', 'REWARDED', 'REWARDED', 'SIGNED_UP', 'COMPLETED', 'EXPIRED', 'REVOKED'];
  const referrals = userList.slice(0, 8).map((u, i) => ({
    referrerId: u._id.toString(),
    referrerEmail: u.email,
    refereeId: 'new-user-' + i,
    refereeEmail: 'newuser' + i + '@test.com',
    code: 'REF' + u._id.toString().slice(-6).toUpperCase(),
    status: refStatuses[i % refStatuses.length],
    rewardAmount: 100,
    createdAt: new Date(Date.now() - (30 - i * 3) * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }));
  if (referrals.length > 0) await referralConn.db.collection('referrals').insertMany(referrals);
  console.log('Seeded referrals:', referrals.length);

  await referralConn.db.collection('wallets').deleteMany({});
  const wallets = userList.map(u => ({
    userId: u._id.toString(),
    balance: Math.floor(Math.random() * 500),
    transactions: [],
    createdAt: new Date(),
  }));
  if (wallets.length > 0) await referralConn.db.collection('wallets').insertMany(wallets);
  console.log('Seeded wallets:', wallets.length);
  await referralConn.close();

  console.log('\nAll databases seeded!');
  process.exit(0);
}

seedAll().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
