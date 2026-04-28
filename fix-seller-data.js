/**
 * Fix sellerId mismatch in products and orders.
 *
 * The seed stored sellerId = seller._id (Seller document ObjectId).
 * The controllers query by req.user.userId = user._id (User document ObjectId).
 * This script remaps all sellerId values from seller._id → user._id.
 *
 * Run: node fix-seller-data.js
 */
async function main() {
  let MongoClient;
  try { MongoClient = require('mongodb').MongoClient; } catch {
    require('child_process').execSync('npm install mongodb', { cwd: __dirname, stdio: 'inherit' });
    MongoClient = require('mongodb').MongoClient;
  }

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bazzar_db';
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log('✅ Connected to', MONGO_URI);

  // Build map: seller._id (string) → seller.userId (string)
  const sellers = await db.collection('sellers').find({}).toArray();
  if (sellers.length === 0) {
    console.error('❌ No sellers found. Run seed-grocery.js first.');
    process.exit(1);
  }

  const sellerDocIdToUserId = new Map();
  for (const s of sellers) {
    sellerDocIdToUserId.set(s._id.toString(), s.userId);
    console.log(`  Seller doc _id=${s._id} storeName=${s.storeName} → userId=${s.userId}`);
  }

  // ── Fix Products ──────────────────────────────────────────────────────────
  console.log('\n🛍️  Fixing products...');
  const products = await db.collection('products').find({}).toArray();
  let prodFixed = 0;

  for (const p of products) {
    const currentSellerId = p.sellerId?.toString();
    if (!currentSellerId) continue;

    const correctUserId = sellerDocIdToUserId.get(currentSellerId);
    if (!correctUserId) {
      // Already a userId or unknown — skip
      const isAlreadyUserId = sellers.some(s => s.userId === currentSellerId);
      if (!isAlreadyUserId) {
        console.log(`  ⚠️  Product "${p.name}" sellerId=${currentSellerId} — no matching seller found, skipping`);
      }
      continue;
    }

    // Find the seller to get sellerName for consistency
    const seller = sellers.find(s => s._id.toString() === currentSellerId);
    await db.collection('products').updateOne(
      { _id: p._id },
      { $set: { sellerId: correctUserId, sellerName: seller?.storeName ?? p.sellerName } }
    );
    prodFixed++;
  }
  console.log(`  ✅ Fixed ${prodFixed} products`);

  // ── Fix Order Items ───────────────────────────────────────────────────────
  console.log('\n📦 Fixing orders...');
  const orders = await db.collection('orders').find({}).toArray();
  let orderFixed = 0;

  for (const order of orders) {
    let changed = false;
    const updatedItems = (order.items || []).map(item => {
      const currentSellerId = item.sellerId?.toString();
      if (!currentSellerId) return item;

      const correctUserId = sellerDocIdToUserId.get(currentSellerId);
      if (!correctUserId) return item;

      changed = true;
      const seller = sellers.find(s => s._id.toString() === currentSellerId);
      return { ...item, sellerId: correctUserId, sellerName: seller?.storeName ?? item.sellerName };
    });

    if (changed) {
      await db.collection('orders').updateOne({ _id: order._id }, { $set: { items: updatedItems } });
      orderFixed++;
    }
  }
  console.log(`  ✅ Fixed ${orderFixed} orders`);

  // ── Verify ────────────────────────────────────────────────────────────────
  console.log('\n🔍 Verification:');
  for (const s of sellers) {
    const prodCount = await db.collection('products').countDocuments({ sellerId: s.userId });
    const orderCount = await db.collection('orders').countDocuments({ 'items.sellerId': s.userId });
    console.log(`  ${s.storeName}: ${prodCount} products, ${orderCount} orders linked to userId=${s.userId}`);
  }

  await client.close();
  console.log('\n✅ Done. Restart monolith if needed, then check seller dashboard.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
