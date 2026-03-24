/**
 * Bazzar Seed Script — Clears & Repopulates All DBs
 * Run: node seed.js
 * Requires: npm install mongodb bcryptjs
 */

async function main() {
  let MongoClient, bcrypt;
  try { MongoClient = require('mongodb').MongoClient; } catch(e) {
    require('child_process').execSync('npm install mongodb', { cwd: __dirname, stdio: 'inherit' });
    MongoClient = require('mongodb').MongoClient;
  }
  try { bcrypt = require('bcryptjs'); } catch(e) {
    require('child_process').execSync('npm install bcryptjs', { cwd: __dirname, stdio: 'inherit' });
    bcrypt = require('bcryptjs');
  }

  console.log('\n🌱 Bazzar Seed Script — Clearing & Repopulating\n' + '='.repeat(60));

  const adminHash  = await bcrypt.hash('Admin@1234', 10);
  const buyerHash  = await bcrypt.hash('Buyer@1234', 10);
  const sellerHash = await bcrypt.hash('Seller@1234', 10);

  // ── USERS ────────────────────────────────────────────────────────────────
  console.log('\n📦 Users (port 27017)...');
  {
    const c = new MongoClient('mongodb://localhost:27017');
    await c.connect();
    const db = c.db('user_db');
    await db.collection('users').deleteMany({});
    const res = await db.collection('users').insertMany([
      { firstName:'Admin',    lastName:'User',    email:'admin@bazzar.com',   password:adminHash,  role:'ADMIN',  phone:'9800000001', isVerified:true, isActive:true, referralCode:'ADMIN001',  createdAt:new Date(), updatedAt:new Date() },
      { firstName:'Ram',      lastName:'Sharma',  email:'ram@example.com',    password:buyerHash,  role:'BUYER',  phone:'9800000002', isVerified:true, isActive:true, referralCode:'RAM001',    createdAt:new Date(), updatedAt:new Date() },
      { firstName:'TechNepal',lastName:'Store',   email:'seller1@bazzar.com', password:sellerHash, role:'SELLER', phone:'9800000003', isVerified:true, isActive:true, referralCode:'TECH001',   createdAt:new Date(), updatedAt:new Date() },
      { firstName:'SoundHub', lastName:'Nepal',   email:'seller2@bazzar.com', password:sellerHash, role:'SELLER', phone:'9800000004', isVerified:true, isActive:true, referralCode:'SOUND001',  createdAt:new Date(), updatedAt:new Date() },
      { firstName:'SportsKing',lastName:'Nepal',  email:'seller3@bazzar.com', password:sellerHash, role:'SELLER', phone:'9800000005', isVerified:true, isActive:true, referralCode:'SPORT001',  createdAt:new Date(), updatedAt:new Date() },
    ]);
    const ids = Object.values(res.insertedIds);
    console.log(`  ✅ ${res.insertedCount} users`);
    await c.close();

    // ── SELLERS ──────────────────────────────────────────────────────────
    console.log('\n🏪 Sellers (port 27022)...');
    const sc = new MongoClient('mongodb://localhost:27022');
    await sc.connect();
    const sdb = sc.db('seller_db');
    await sdb.collection('sellers').deleteMany({});
    const sres = await sdb.collection('sellers').insertMany([
      { userId:ids[2].toString(), storeName:'TechNepal',   description:'Premium electronics & gadgets.', email:'seller1@bazzar.com', phone:'9800000003', logo:'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&q=80', banner:'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=85', category:'Electronics', address:{city:'Kathmandu',district:'Kathmandu',province:'Bagmati'}, status:'APPROVED', isVerified:true, rating:4.8, totalSales:1250000, productCount:45, commissionRate:10, panNumber:'123456789', bankAccount:{bankName:'NIC Asia Bank',accountNumber:'1234567890',accountName:'TechNepal Pvt Ltd'}, createdAt:new Date(), updatedAt:new Date() },
      { userId:ids[3].toString(), storeName:'SoundHub',    description:'Premium audio equipment.', email:'seller2@bazzar.com', phone:'9800000004', logo:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80', banner:'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&q=85', category:'Electronics', address:{city:'Lalitpur',district:'Lalitpur',province:'Bagmati'}, status:'APPROVED', isVerified:true, rating:4.7, totalSales:890000, productCount:28, commissionRate:10, panNumber:'987654321', bankAccount:{bankName:'Nabil Bank',accountNumber:'9876543210',accountName:'SoundHub Pvt Ltd'}, createdAt:new Date(), updatedAt:new Date() },
      { userId:ids[4].toString(), storeName:'SportsKing',  description:'Nepal\'s premier sports store.', email:'seller3@bazzar.com', phone:'9800000005', logo:'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&q=80', banner:'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900&q=85', category:'Sports', address:{city:'Bhaktapur',district:'Bhaktapur',province:'Bagmati'}, status:'APPROVED', isVerified:true, rating:4.6, totalSales:650000, productCount:32, commissionRate:10, panNumber:'456789123', bankAccount:{bankName:'Himalayan Bank',accountNumber:'4567891230',accountName:'SportsKing Pvt Ltd'}, createdAt:new Date(), updatedAt:new Date() },
    ]);
    console.log(`  ✅ ${sres.insertedCount} sellers`);
    const sellerIds = Object.values(sres.insertedIds).map(i => i.toString());
    await sc.close();

    // ── PRODUCTS / CATEGORIES / BANNERS ──────────────────────────────────
    console.log('\n📱 Products, Categories, Banners (port 27018)...');
    const pc = new MongoClient('mongodb://localhost:27018');
    await pc.connect();
    const pdb = pc.db('product_db');
    await pdb.collection('products').deleteMany({});
    await pdb.collection('categories').deleteMany({});
    await pdb.collection('banners').deleteMany({});

    const cats = await pdb.collection('categories').insertMany([
      { name:'Electronics',  slug:'electronics',  image:'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&q=80', description:'Gadgets & tech',            isActive:true, order:1, createdAt:new Date() },
      { name:'Fashion',      slug:'fashion',      image:'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&q=80', description:'Clothing & accessories',    isActive:true, order:2, createdAt:new Date() },
      { name:'Sports',       slug:'sports',       image:'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&q=80', description:'Sports & fitness',          isActive:true, order:3, createdAt:new Date() },
      { name:'Home & Living',slug:'home-living',  image:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80', description:'Home decor & appliances',   isActive:true, order:4, createdAt:new Date() },
      { name:'Beauty',       slug:'beauty',       image:'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80', description:'Beauty & personal care',   isActive:true, order:5, createdAt:new Date() },
    ]);
    const catIds = Object.values(cats.insertedIds);
    console.log(`  ✅ ${cats.insertedCount} categories`);

    await pdb.collection('banners').insertMany([
      { title:'Mega Electronics', subtitle:'Sale Is Live', description:'Latest gadgets at unbeatable prices. Free delivery anywhere in Nepal.', cta:'Shop Electronics', ctaLink:'/products?category=electronics', image:'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=85', accentColor:'#f97316', eyebrow:"Nepal's #1 Marketplace", badge:'⚡ Up to 40% OFF Today', order:0, isActive:true, createdAt:new Date() },
      { title:'Fashion That',     subtitle:'Defines You',  description:'Discover premium brands and latest trends.', cta:'Shop Fashion', ctaLink:'/products?category=fashion', image:'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=85', accentColor:'#a855f7', eyebrow:'New Collection 2026', badge:'✨ New Arrivals', order:1, isActive:true, createdAt:new Date() },
      { title:'Transform Your',   subtitle:'Living Space', description:'Curated home decor for every Nepali home.', cta:'Shop Home', ctaLink:'/products?category=home-living', image:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=85', accentColor:'#14b8a6', eyebrow:'Home Makeover', badge:'🏠 Best Sellers', order:2, isActive:true, createdAt:new Date() },
    ]);
    console.log(`  ✅ 3 banners`);

    const [s1, s2, s3] = sellerIds;
    const [eId, fId, spId, hId, bId] = catIds;
    const prods = [
      { name:'Samsung Galaxy S24 Ultra', slug:'samsung-galaxy-s24-ultra', description:'The ultimate Android flagship with S Pen and 200MP camera.', price:185000, salePrice:159999, images:['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80'], category:eId, sellerId:s1, sellerName:'TechNepal', stock:15, sku:'SGS24U-001', rating:4.8, reviewCount:156, isFeatured:true, isActive:true, tags:['samsung','smartphone'] },
      { name:'Apple MacBook Air M3',     slug:'apple-macbook-air-m3',     description:'Supercharged by the M3 chip. Incredibly thin and light.',   price:175000, salePrice:159000, images:['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80'], category:eId, sellerId:s1, sellerName:'TechNepal', stock:8,  sku:'MBA-M3-001', rating:4.9, reviewCount:89,  isFeatured:true, isActive:true, tags:['apple','laptop'] },
      { name:'iPad Air M2',             slug:'ipad-air-m2',               description:'Serious performance in a thin, light design.',             price:110000, salePrice:94999,  images:['https://images.unsplash.com/photo-1544244015-0df4512bfb63?w=500&q=80'], category:eId, sellerId:s1, sellerName:'TechNepal', stock:12, sku:'IPAM2-001', rating:4.8, reviewCount:67,  isFeatured:true, isActive:true, tags:['apple','tablet'] },
      { name:'iPhone 15 Pro Max',        slug:'iphone-15-pro-max',         description:'Titanium design. A17 Pro chip. Pro camera system.',        price:229999, salePrice:199999, images:['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80'], category:eId, sellerId:s1, sellerName:'TechNepal', stock:6,  sku:'IP15PM-001', rating:4.9, reviewCount:234, isFeatured:true, isActive:true, tags:['apple','iphone'] },
      { name:'Apple Watch Series 9',     slug:'apple-watch-series-9',      description:'A magical new way to interact with Apple Watch.',          price:72000,  salePrice:64999,  images:['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80'], category:eId, sellerId:s1, sellerName:'TechNepal', stock:10, sku:'AWS9-001',   rating:4.7, reviewCount:45,  isFeatured:false,isActive:true, tags:['apple','watch'] },
      { name:'Canon EOS R50 Camera',     slug:'canon-eos-r50',             description:'Compact mirrorless camera for content creators.',          price:98000,  salePrice:84999,  images:['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80'], category:eId, sellerId:s1, sellerName:'TechNepal', stock:5,  sku:'CEOSR50-001',rating:4.7, reviewCount:32,  isFeatured:false,isActive:true, tags:['canon','camera'] },
      { name:'Sony WH-1000XM5',          slug:'sony-wh-1000xm5',           description:'Industry-leading noise cancelling headphones.',           price:49999,  salePrice:42999,  images:['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'], category:eId, sellerId:s2, sellerName:'SoundHub', stock:18, sku:'SWXM5-001',  rating:4.9, reviewCount:312, isFeatured:true, isActive:true, tags:['sony','headphones'] },
      { name:'JBL Charge 5 Speaker',     slug:'jbl-charge-5',              description:'Powerful portable Bluetooth speaker.',                    price:15000,  salePrice:12499,  images:['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80'], category:eId, sellerId:s2, sellerName:'SoundHub', stock:25, sku:'JBLC5-001',   rating:4.5, reviewCount:189, isFeatured:true, isActive:true, tags:['jbl','speaker'] },
      { name:'AirPods Pro 2nd Gen',      slug:'airpods-pro-2',             description:'Active Noise Cancellation. Spatial Audio.',               price:42000,  salePrice:34999,  images:['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&q=80'], category:eId, sellerId:s2, sellerName:'SoundHub', stock:20, sku:'APP2-001',    rating:4.7, reviewCount:145, isFeatured:true, isActive:true, tags:['apple','airpods'] },
      { name:'Bose QuietComfort 45',     slug:'bose-qc45',                 description:'Premium noise-cancelling headphones.',                    price:38000,  salePrice:33000,  images:['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&q=80'], category:eId, sellerId:s2, sellerName:'SoundHub', stock:14, sku:'BQC45-001',   rating:4.5, reviewCount:98,  isFeatured:false,isActive:true, tags:['bose','headphones'] },
      { name:'Dell XPS 15 Laptop',       slug:'dell-xps-15',               description:'InfinityEdge display. 13th Gen Intel Core.',             price:195000, salePrice:179000, images:['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80'], category:eId, sellerId:s2, sellerName:'SoundHub', stock:7,  sku:'DXPS15-001',  rating:4.6, reviewCount:56,  isFeatured:false,isActive:true, tags:['dell','laptop'] },
      { name:'Nike Air Max 270',         slug:'nike-air-max-270',          description:'Iconic Air Max design with maximum cushioning.',         price:18000,  salePrice:14999,  images:['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80'], category:spId, sellerId:s3, sellerName:'SportsKing', stock:30, sku:'NAM270-001',  rating:4.6, reviewCount:234, isFeatured:true, isActive:true, tags:['nike','shoes'] },
      { name:'Adidas Ultraboost 23',     slug:'adidas-ultraboost-23',      description:'Revolutionary running shoe with BOOST cushioning.',       price:22000,  salePrice:18999,  images:['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=500&q=80'], category:spId, sellerId:s3, sellerName:'SportsKing', stock:20, sku:'AUB23-001',   rating:4.5, reviewCount:156, isFeatured:false,isActive:true, tags:['adidas','shoes'] },
      { name:'GoPro Hero 12 Black',      slug:'gopro-hero-12',             description:'5.3K60 video. Highest-ever dynamic range.',             price:62000,  salePrice:55000,  images:['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&q=80'], category:spId, sellerId:s3, sellerName:'SportsKing', stock:10, sku:'GPH12-001',   rating:4.6, reviewCount:67,  isFeatured:false,isActive:true, tags:['gopro','camera'] },
      { name:'PlayStation 5 Console',    slug:'playstation-5',             description:'Experience lightning-fast loading with ultra-high speed SSD.', price:82000, salePrice:75000, images:['https://images.unsplash.com/photo-1607016284318-d1384bf4f8b0?w=500&q=80'], category:spId, sellerId:s3, sellerName:'SportsKing', stock:5, sku:'PS5-001', rating:4.9, reviewCount:423, isFeatured:true, isActive:true, tags:['playstation','gaming'] },
      { name:'Philips Air Fryer XXL',    slug:'philips-air-fryer-xxl',     description:'Cook with 90% less fat. 7.3L capacity.',                price:18500,  salePrice:15999,  images:['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80'], category:hId,  sellerId:s1, sellerName:'TechNepal', stock:18, sku:'PAF-XXL-001', rating:4.4, reviewCount:123, isFeatured:false,isActive:true, tags:['philips','kitchen'] },
      { name:'Xiaomi Smart TV 55"',      slug:'xiaomi-smart-tv-55',        description:'4K QLED. Dolby Vision. Google TV.',                      price:72000,  salePrice:64000,  images:['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80'], category:hId,  sellerId:s2, sellerName:'SoundHub', stock:8, sku:'XSTV55-001',  rating:4.3, reviewCount:89,  isFeatured:false,isActive:true, tags:['xiaomi','tv'] },
      { name:'Korean Skincare Set',      slug:'korean-skincare-set',       description:'Complete 10-step Korean skincare routine.',              price:8500,   salePrice:6999,   images:['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80'], category:bId,  sellerId:s1, sellerName:'TechNepal', stock:35, sku:'KSS-001',     rating:4.6, reviewCount:267, isFeatured:false,isActive:true, tags:['skincare','beauty'] },
      { name:'DJI Mini 4 Pro Drone',     slug:'dji-mini-4-pro',            description:'4K/60fps drone under 249g. Omnidirectional obstacle sensing.', price:95000, salePrice:88000, images:['https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=500&q=80'], category:eId, sellerId:s1, sellerName:'TechNepal', stock:4, sku:'DJI-M4P-001', rating:4.7, reviewCount:28, isFeatured:false, isActive:true, tags:['dji','drone'] },
      { name:'Logitech MX Keys Keyboard',slug:'logitech-mx-keys',          description:'Advanced wireless keyboard for precise typing.',          price:15000,  salePrice:12500,  images:['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80'], category:eId, sellerId:s2, sellerName:'SoundHub', stock:22, sku:'LMXK-001', rating:4.4, reviewCount:78, isFeatured:false, isActive:true, tags:['logitech','keyboard'] },
    ].map(p => ({ ...p, createdAt:new Date(), updatedAt:new Date() }));

    const pr = await pdb.collection('products').insertMany(prods);
    console.log(`  ✅ ${pr.insertedCount} products`);
    await pc.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All done! Login credentials:\n');
  console.log('   👑 Admin:   admin@bazzar.com    / Admin@1234');
  console.log('   🛒 Buyer:   ram@example.com     / Buyer@1234');
  console.log('   🏪 Seller1: seller1@bazzar.com  / Seller@1234');
  console.log('   🏪 Seller2: seller2@bazzar.com  / Seller@1234');
  console.log('   🏪 Seller3: seller3@bazzar.com  / Seller@1234\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
