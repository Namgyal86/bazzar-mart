/**
 * Grocery Store Seed Script
 * --------------------------
 * 1. Clears all existing data from product_db, order_db, review_db, seller_db
 * 2. Seeds grocery categories into product_db
 * 3. Seeds grocery products with a demo seller
 *
 * Run: node seed-grocery.js
 * Requires: npm install mongoose
 */

const mongoose = require('mongoose');

// ─── Connection URIs ──────────────────────────────────────────────────────────
const PRODUCT_DB  = 'mongodb://localhost:27018/product_db';
const ORDER_DB    = 'mongodb://localhost:27019/order_db';
const REVIEW_DB   = 'mongodb://localhost:27021/review_db';
const SELLER_DB   = 'mongodb://localhost:27022/seller_db';

// ─── Schemas (minimal, matching the service models) ──────────────────────────
const CategorySchema = new mongoose.Schema({
  name: String, slug: String, description: String,
  image: String, parentCategory: String,
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name: String, slug: String, description: String, shortDescription: String,
  price: Number, salePrice: Number,
  images: [String],
  category: String, subCategory: String,
  sellerId: String, sellerName: String,
  brand: String, sku: String,
  stock: { type: Number, default: 0 },
  variants: { type: mongoose.Schema.Types.Mixed, default: [] },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  tags: [String],
  specifications: { type: Map, of: String, default: {} },
  weight: Number,
}, { timestamps: true });

// ─── Category Data ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', description: 'Fresh fruits and vegetables sourced daily from local farms', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80', sortOrder: 1 },
  { name: 'Dairy & Eggs',        slug: 'dairy-eggs',        description: 'Fresh milk, curd, cheese, butter, ghee and eggs', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80', sortOrder: 2 },
  { name: 'Grains & Pulses',     slug: 'grains-pulses',     description: 'Rice, wheat, flour, lentils, chickpeas and more', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80', sortOrder: 3 },
  { name: 'Meat & Seafood',      slug: 'meat-seafood',      description: 'Fresh chicken, mutton, fish, pork and processed meat', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500&q=80', sortOrder: 4 },
  { name: 'Snacks & Beverages',  slug: 'snacks-beverages',  description: 'Chips, biscuits, juices, soft drinks, tea and coffee', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&q=80', sortOrder: 5 },
  { name: 'Spices & Condiments', slug: 'spices-condiments', description: 'Whole spices, ground masala, oils, ghee, sauces and pickles', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80', sortOrder: 6 },
  { name: 'Personal Care',       slug: 'personal-care',     description: 'Soap, shampoo, toothpaste, skincare and hygiene products', image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&q=80', sortOrder: 7 },
  { name: 'Household Items',     slug: 'household-items',   description: 'Cleaning products, detergent, kitchen supplies and more', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&q=80', sortOrder: 8 },
  { name: 'Frozen Foods',        slug: 'frozen-foods',      description: 'Frozen vegetables, ready meals, ice cream and more', image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=500&q=80', sortOrder: 9 },
  { name: 'Bakery & Bread',      slug: 'bakery-bread',      description: 'Fresh bread, biscuits, cakes, pav and bakery products', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80', sortOrder: 10 },
];

// ─── Product Data ─────────────────────────────────────────────────────────────
const DEMO_SELLER_ID   = 'demo-seller-001';
const DEMO_SELLER_NAME = 'FreshMart Nepal';

function sku() { return 'SKU-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase(); }
function slug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).slice(2,5); }

const PRODUCTS = [
  // ── Fruits & Vegetables ──
  { name: 'Fresh Tomatoes (1 kg)', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', price: 80, salePrice: 70, stock: 200, brand: 'Local Farm', weight: 1000, tags: ['tomato','vegetables','fresh'], images: ['https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500&q=80'], shortDescription: 'Farm-fresh red tomatoes, hand-picked daily', description: 'Juicy and ripe tomatoes sourced directly from local farms in Chitwan. Rich in vitamins, perfect for salads, curries and cooking. Delivered fresh every morning.', specifications: { 'Weight': '1 kg', 'Type': 'Fresh', 'Origin': 'Chitwan, Nepal' }, isFeatured: true },
  { name: 'Banana - Harichhal (12 pcs)', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', price: 120, stock: 150, brand: 'Local Farm', weight: 1200, tags: ['banana','fruits','fresh'], images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&q=80'], shortDescription: 'Sweet Harichhal bananas from Tarai', description: 'Naturally ripened Harichhal bananas from the Tarai region of Nepal. Rich in potassium and natural sugars. A dozen bananas in one bunch, perfect for daily use.', specifications: { 'Count': '12 pieces', 'Type': 'Harichhal', 'Origin': 'Tarai, Nepal' } },
  { name: 'Potato (5 kg)', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', price: 250, salePrice: 220, stock: 500, brand: 'Local Farm', weight: 5000, tags: ['potato','vegetables','staple'], images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80'], shortDescription: 'Fresh Jhapa potatoes in 5 kg pack', description: 'Premium quality potatoes from Jhapa farms. Washed and cleaned. Ideal for every Nepali kitchen — curries, fries, or dal-bhat. 5 kg pack for family use.', specifications: { 'Weight': '5 kg', 'Variety': 'Red Potato', 'Origin': 'Jhapa, Nepal' }, isFeatured: true },
  { name: 'Green Spinach (500g)', category: 'Fruits & Vegetables', subCategory: 'Herbs & Greens', price: 60, stock: 100, brand: 'Local Farm', weight: 500, tags: ['spinach','greens','leafy'], images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80'], shortDescription: 'Fresh tender spinach leaves', description: 'Crisp and tender spinach leaves harvested fresh every morning. Packed with iron, calcium and vitamins. Perfect for saag, palak paneer and salads.', specifications: { 'Weight': '500 g', 'Type': 'Tender Leaf' } },
  { name: 'Apple - Jumla (1 kg)', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', price: 350, salePrice: 300, stock: 80, brand: 'Jumla Apple', weight: 1000, tags: ['apple','fruits','jumla'], images: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=500&q=80'], shortDescription: 'Premium Jumla apples, naturally sweet', description: 'The famous Jumla apples from Karnali province, grown at high altitude without pesticides. Naturally sweet and crispy. A true Nepali superfood.', specifications: { 'Weight': '1 kg', 'Origin': 'Jumla, Nepal', 'Type': 'Red Delicious' }, isFeatured: true },
  { name: 'Onion (3 kg)', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', price: 180, stock: 400, brand: 'Local Farm', weight: 3000, tags: ['onion','vegetables','staple'], images: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80'], shortDescription: 'Fresh Nepali onions in 3 kg pack', description: 'Fresh red onions from the fertile plains of Nepal. Essential for every Nepali curry and dal. 3 kg pack at a great price.', specifications: { 'Weight': '3 kg', 'Type': 'Red Onion' } },

  // ── Dairy & Eggs ──
  { name: 'Full Cream Milk (1L)', category: 'Dairy & Eggs', subCategory: 'Milk', price: 90, stock: 300, brand: 'Dairy Development', weight: 1000, tags: ['milk','dairy','full-cream'], images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80'], shortDescription: 'Fresh pasteurized full cream milk', description: 'Fresh pasteurized full cream milk from Dairy Development Corporation. Rich, creamy and nutritious. Ideal for drinking, tea, coffee and cooking.', specifications: { 'Volume': '1 Litre', 'Fat': '6%', 'Type': 'Full Cream', 'Pasteurized': 'Yes' }, isFeatured: true },
  { name: 'Farm Fresh Eggs (12 pcs)', category: 'Dairy & Eggs', subCategory: 'Eggs', price: 240, salePrice: 220, stock: 500, brand: 'Farm Fresh', weight: 720, tags: ['eggs','protein','farm-fresh'], images: ['https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=500&q=80'], shortDescription: 'Farm-fresh country eggs, 12 pieces', description: 'Fresh eggs from free-range country hens. Rich in protein and omega-3. These eggs are collected daily and delivered straight from our partner farms.', specifications: { 'Count': '12 pieces', 'Type': 'Country / Desi', 'Weight': 'Medium (60g each)' } },
  { name: 'Butter (500g)', category: 'Dairy & Eggs', subCategory: 'Butter & Ghee', price: 420, stock: 150, brand: 'Amul', weight: 500, tags: ['butter','dairy','amul'], images: ['https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&q=80'], shortDescription: 'Creamy salted butter, 500g pack', description: 'Smooth and creamy salted butter made from fresh cream. Perfect for spreading on bread, making rotis, baking and cooking. International quality at affordable price.', specifications: { 'Weight': '500 g', 'Type': 'Salted', 'Brand': 'Amul' } },
  { name: 'Fresh Curd / Dahi (500g)', category: 'Dairy & Eggs', subCategory: 'Curd & Yogurt', price: 110, stock: 200, brand: 'Local Dairy', weight: 500, tags: ['curd','dahi','yogurt','dairy'], images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80'], shortDescription: 'Thick and creamy fresh dahi', description: 'Freshly set thick dahi (curd) made from pure buffalo milk. Great for eating with beaten rice, making lassi, or as a side dish with dal-bhat.', specifications: { 'Weight': '500 g', 'Fat': 'Full Fat', 'Type': 'Buffalo Milk' } },
  { name: 'Pure Cow Ghee (500ml)', category: 'Dairy & Eggs', subCategory: 'Butter & Ghee', price: 850, salePrice: 780, stock: 120, brand: 'Himalayan Ghee', weight: 500, tags: ['ghee','pure-cow','desi'], images: ['https://images.unsplash.com/photo-1626200924041-68a46bd04c09?w=500&q=80'], shortDescription: 'Pure A2 cow ghee, traditionally churned', description: 'Pure A2 cow ghee made by traditional bilona method from Gir cow milk. Loaded with healthy fats, vitamins A, D, E and K. The gold standard for Nepali cooking.', specifications: { 'Volume': '500 ml', 'Type': 'A2 Cow Ghee', 'Method': 'Traditional Bilona' }, isFeatured: true },

  // ── Grains & Pulses ──
  { name: 'Basmati Rice (5 kg)', category: 'Grains & Pulses', subCategory: 'Rice', price: 750, salePrice: 680, stock: 300, brand: 'India Gate', weight: 5000, tags: ['rice','basmati','grain'], images: ['https://images.unsplash.com/photo-1536304993881-ff86e0c9cd08?w=500&q=80'], shortDescription: 'Premium aged Basmati rice, 5 kg pack', description: 'Premium extra long grain basmati rice with a delicate fragrance. Aged for 2 years for enhanced flavour. Perfect for biryani, pulao and everyday cooking.', specifications: { 'Weight': '5 kg', 'Type': 'Extra Long Grain', 'Aged': '2 Years' }, isFeatured: true },
  { name: 'Aashirvaad Atta (10 kg)', category: 'Grains & Pulses', subCategory: 'Wheat & Flour', price: 680, stock: 200, brand: 'Aashirvaad', weight: 10000, tags: ['atta','wheat-flour','chapati'], images: ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&q=80'], shortDescription: 'Whole wheat atta for soft rotis, 10 kg', description: 'Aashirvaad Select Whole Wheat Atta made from 100% whole wheat. Superior sharbati wheat from Madhya Pradesh gives soft, tasty and nutritious rotis and chapatis.', specifications: { 'Weight': '10 kg', 'Type': 'Whole Wheat', 'Source': 'Sharbati Wheat' } },
  { name: 'Masoor Dal (2 kg)', category: 'Grains & Pulses', subCategory: 'Lentils (Dal)', price: 320, stock: 250, brand: 'Local Farm', weight: 2000, tags: ['masoor','dal','lentil'], images: ['https://images.unsplash.com/photo-1621475007307-e5e2a07f0c18?w=500&q=80'], shortDescription: 'Red masoor dal, 2 kg pack', description: 'Premium quality red masoor dal sourced from Nepali and Indian farms. Cooks quickly, rich in protein and fibre. The most versatile and popular dal for everyday cooking.', specifications: { 'Weight': '2 kg', 'Type': 'Red Masoor', 'Protein': '25g per 100g' } },
  { name: 'Tuar Dal (2 kg)', category: 'Grains & Pulses', subCategory: 'Lentils (Dal)', price: 380, salePrice: 340, stock: 200, brand: 'Local Farm', weight: 2000, tags: ['tuar','dal','arhar'], images: ['https://images.unsplash.com/photo-1621475007307-e5e2a07f0c18?w=500&q=80'], shortDescription: 'Arhar/Tuar dal, 2 kg pack', description: 'Premium tuar (arhar) dal, a staple in every Nepali and Indian home. High in protein and fibre, easy to cook and digest. Ideal for daily dal-bhat-tarkari.', specifications: { 'Weight': '2 kg', 'Type': 'Tuar / Arhar', 'Protein': '22g per 100g' } },

  // ── Snacks & Beverages ──
  { name: 'Tata Tea Gold (500g)', category: 'Snacks & Beverages', subCategory: 'Tea & Coffee', price: 350, salePrice: 320, stock: 400, brand: 'Tata Tea', weight: 500, tags: ['tea','tata-tea','chai'], images: ['https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=500&q=80'], shortDescription: 'Tata Tea Gold 500g — strong, aromatic', description: 'Tata Tea Gold is made with the finest whole leaf from the best gardens of Assam and Darjeeling. Brew a perfect cup of strong, aromatic chai every time.', specifications: { 'Weight': '500 g', 'Type': 'CTC Leaf Tea', 'Origin': 'Assam & Darjeeling' }, isFeatured: true },
  { name: 'Nescafe Classic Coffee (200g)', category: 'Snacks & Beverages', subCategory: 'Tea & Coffee', price: 490, stock: 200, brand: 'Nescafe', weight: 200, tags: ['coffee','nescafe','instant'], images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80'], shortDescription: 'Nescafe instant coffee, rich and smooth', description: 'NESCAFÉ Classic is made with the finest blend of coffee beans for a rich, smooth taste. Simply add hot water or milk for a perfect cup of instant coffee anytime.', specifications: { 'Weight': '200 g', 'Type': 'Instant Coffee', 'Caffeine': 'Regular' } },
  { name: 'Lay\'s Potato Chips - Classic Salted (52g)', category: 'Snacks & Beverages', subCategory: 'Chips & Namkeen', price: 40, stock: 1000, brand: "Lay's", weight: 52, tags: ['chips','lays','snacks'], images: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80'], shortDescription: "Lay's classic salted potato chips", description: "Lay's Classic Salted chips made from the finest potatoes. Thin, crispy and lightly salted for that perfect snacking experience. Great for parties, picnics and movie nights.", specifications: { 'Weight': '52 g', 'Flavour': 'Classic Salted' } },
  { name: 'Real Juice - Mixed Fruit (1L)', category: 'Snacks & Beverages', subCategory: 'Juices', price: 130, salePrice: 115, stock: 300, brand: 'Real', weight: 1000, tags: ['juice','real','mixed-fruit','beverage'], images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&q=80'], shortDescription: 'Real Mixed Fruit juice, 1 litre', description: 'Real Mixed Fruit juice made from the finest fruits with no added preservatives. Refreshing blend of orange, pineapple, mango and guava. 100% real fruit juice.', specifications: { 'Volume': '1 Litre', 'Flavour': 'Mixed Fruit', 'Preservatives': 'None' } },
  { name: 'Good Day Biscuits (600g)', category: 'Snacks & Beverages', subCategory: 'Biscuits & Cookies', price: 120, stock: 500, brand: 'Britannia', weight: 600, tags: ['biscuits','britannia','good-day'], images: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80'], shortDescription: 'Britannia Good Day butter biscuits', description: 'Britannia Good Day butter cookies — rich, buttery and absolutely delicious. With real cashews and almonds. A perfect tea-time companion for the whole family.', specifications: { 'Weight': '600 g', 'Type': 'Butter Cookies' } },

  // ── Spices & Condiments ──
  { name: 'Mustard Oil (1L)', category: 'Spices & Condiments', subCategory: 'Oils & Ghee', price: 280, stock: 400, brand: 'Patanjali', weight: 1000, tags: ['mustard-oil','cooking-oil','sarso'], images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80'], shortDescription: 'Pure kachi ghani mustard oil, 1 litre', description: 'Patanjali Kachi Ghani Mustard Oil extracted from the finest quality mustard seeds using cold press method. Rich in omega-3 and omega-6 fatty acids. Authentic pungent aroma for authentic Nepali cooking.', specifications: { 'Volume': '1 Litre', 'Type': 'Kachi Ghani', 'Extraction': 'Cold Press' }, isFeatured: true },
  { name: 'MDH Garam Masala (100g)', category: 'Spices & Condiments', subCategory: 'Masala Blends', price: 120, stock: 300, brand: 'MDH', weight: 100, tags: ['masala','garam-masala','mdh','spice'], images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80'], shortDescription: 'MDH Garam Masala — premium blend', description: 'MDH Garam Masala is a premium blend of 18 rare spices carefully selected and ground to perfection. Adds authentic flavour and aroma to curries, dals and vegetable dishes.', specifications: { 'Weight': '100 g', 'Spices': '18 premium spices', 'Form': 'Powder' } },
  { name: 'Rock Salt / Sendha Namak (1 kg)', category: 'Spices & Condiments', subCategory: 'Salt & Sugar', price: 95, stock: 500, brand: 'Himalayan Pink', weight: 1000, tags: ['salt','rock-salt','himalayan'], images: ['https://images.unsplash.com/photo-1519047100-45dc34434706?w=500&q=80'], shortDescription: 'Himalayan pink rock salt, 1 kg', description: 'Pure Himalayan pink rock salt — the most natural form of salt on earth. Contains 84+ trace minerals. Lower in sodium than table salt, better for health and cooking.', specifications: { 'Weight': '1 kg', 'Type': 'Pink Rock Salt', 'Origin': 'Himalayan' } },

  // ── Personal Care ──
  { name: 'Lifebuoy Soap (5 pack)', category: 'Personal Care', subCategory: 'Soap & Body Wash', price: 180, salePrice: 160, stock: 600, brand: 'Lifebuoy', weight: 500, tags: ['soap','lifebuoy','antibacterial'], images: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=500&q=80'], shortDescription: 'Lifebuoy antibacterial soap, pack of 5', description: 'Lifebuoy Total 10 Germ Protection Soap fights 10 types of germs. 100g bar × 5 pack. Dermatologically tested, pH balanced formula. Keeps skin fresh and healthy.', specifications: { 'Count': '5 bars × 100g', 'Type': 'Antibacterial', 'Total Weight': '500 g' } },
  { name: 'Head & Shoulders Shampoo (400ml)', category: 'Personal Care', subCategory: 'Shampoo', price: 390, salePrice: 350, stock: 300, brand: 'Head & Shoulders', weight: 400, tags: ['shampoo','dandruff','head-shoulders'], images: ['https://images.unsplash.com/photo-1614268188666-a8de2e9e1f74?w=500&q=80'], shortDescription: 'Anti-dandruff shampoo, 400ml', description: 'Head & Shoulders Cool Menthol Anti-Dandruff Shampoo. Clinically proven to fight dandruff from the first wash. Leaves hair clean, refreshed and 100% dandruff-free visibly.', specifications: { 'Volume': '400 ml', 'Type': 'Anti-Dandruff', 'Scent': 'Cool Menthol' } },
  { name: 'Colgate Max Fresh Toothpaste (150g × 2)', category: 'Personal Care', subCategory: 'Toothpaste', price: 220, stock: 400, brand: 'Colgate', weight: 300, tags: ['toothpaste','colgate','dental'], images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&q=80'], shortDescription: 'Colgate Max Fresh toothpaste, 2 pack', description: 'Colgate Max Fresh toothpaste with mini breath strips. Gives up to 12 hours of fresh breath, prevents cavities and whitens teeth. Pack of 2 × 150g tubes.', specifications: { 'Weight': '150 g × 2 = 300 g', 'Type': 'Fluoride', 'Flavour': 'Peppermint' } },

  // ── Household Items ──
  { name: 'Ariel Detergent Powder (3 kg)', category: 'Household Items', subCategory: 'Detergent', price: 680, salePrice: 620, stock: 250, brand: 'Ariel', weight: 3000, tags: ['detergent','ariel','laundry'], images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&q=80'], shortDescription: 'Ariel washing powder with stain removal', description: 'Ariel Complete Detergent Powder removes 100 types of stains even in cold water. With OxiClean stain fighting power. 3 kg value pack for big families.', specifications: { 'Weight': '3 kg', 'Type': 'Washing Powder', 'Technology': 'OxiClean' } },
  { name: 'Vim Dishwash Bar (5 pack)', category: 'Household Items', subCategory: 'Cleaning Products', price: 110, stock: 500, brand: 'Vim', weight: 750, tags: ['vim','dishwash','cleaning'], images: ['https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&q=80'], shortDescription: 'Vim lemon dishwash bar, pack of 5', description: 'Vim Lemon Dishwash Bar with active lemon salt. Cuts through grease instantly, leaves vessels sparkling clean. 5 × 150g bars — great value for family use.', specifications: { 'Count': '5 × 150g bars', 'Scent': 'Lemon', 'Total Weight': '750 g' }, isFeatured: true },

  // ── Bakery & Bread ──
  { name: 'Whole Wheat Bread (400g)', category: 'Bakery & Bread', subCategory: 'Bread', price: 80, stock: 200, brand: 'Sunrise Bakery', weight: 400, tags: ['bread','wheat','bakery'], images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80'], shortDescription: 'Soft whole wheat bread, freshly baked', description: 'Freshly baked whole wheat sandwich bread made with 100% whole grain wheat flour. No maida (refined flour), no artificial preservatives. Soft texture, great for sandwiches and toast.', specifications: { 'Weight': '400 g', 'Type': 'Whole Wheat', 'Slices': '18-20 slices' } },
  { name: 'Marie Gold Biscuits (600g)', category: 'Bakery & Bread', subCategory: 'Biscuits & Cookies', price: 115, stock: 400, brand: 'Britannia', weight: 600, tags: ['biscuits','marie','britannia'], images: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80'], shortDescription: 'Britannia Marie Gold light biscuits', description: 'Britannia Marie Gold — the classic light, crispy tea biscuit. Made with enriched wheat flour, milk and real butter. A healthy and delicious tea-time snack for all ages.', specifications: { 'Weight': '600 g', 'Type': 'Tea Biscuit', 'Calories': '420 kcal/100g' } },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function clearDatabase(uri, dbName, collections) {
  console.log(`\n🗑️  Clearing ${dbName}...`);
  const conn = await mongoose.createConnection(uri).asPromise();
  for (const col of collections) {
    try {
      await conn.db.collection(col).deleteMany({});
      console.log(`   ✓ Cleared collection: ${col}`);
    } catch (e) {
      console.log(`   ⚠ Collection ${col} skipped (may not exist)`);
    }
  }
  await conn.close();
}

async function seedProductDB() {
  console.log('\n🌱 Seeding product database...');
  const conn = await mongoose.createConnection(PRODUCT_DB).asPromise();
  const CategoryModel = conn.model('Category', CategorySchema);
  const ProductModel  = conn.model('Product',  ProductSchema);

  // Insert categories
  const savedCats = await CategoryModel.insertMany(CATEGORIES);
  console.log(`   ✓ Inserted ${savedCats.length} categories`);

  // Insert products
  const products = PRODUCTS.map(p => ({
    ...p,
    slug: slug(p.name),
    sku: sku(),
    sellerId:   DEMO_SELLER_ID,
    sellerName: DEMO_SELLER_NAME,
    rating: 4 + Math.random(),
    reviewCount: Math.floor(Math.random() * 120) + 10,
    soldCount: Math.floor(Math.random() * 500) + 20,
    isActive: true,
  }));
  const savedProds = await ProductModel.insertMany(products);
  console.log(`   ✓ Inserted ${savedProds.length} products`);

  await conn.close();
}

async function main() {
  console.log('🚀 Starting Grocery Store Database Seeding...\n');
  console.log('⚠️  This will DELETE all existing data from product_db, order_db, review_db, seller_db\n');

  try {
    // Clear databases
    await clearDatabase(PRODUCT_DB,  'product_db',  ['products','categories','banners']);
    await clearDatabase(ORDER_DB,    'order_db',    ['orders']);
    await clearDatabase(REVIEW_DB,   'review_db',   ['reviews']);
    await clearDatabase(SELLER_DB,   'seller_db',   ['sellers']);

    // Seed grocery data
    await seedProductDB();

    console.log('\n✅ Seeding complete!');
    console.log('   📦 10 grocery categories created');
    console.log('   🛒 ' + PRODUCTS.length + ' grocery products created');
    console.log('   👤 Demo seller: ' + DEMO_SELLER_NAME + ' (ID: ' + DEMO_SELLER_ID + ')');
    console.log('\n💡 To add your own products, log in as admin and use the seller panel.\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('   Make sure MongoDB is running on the correct ports (27017-27025)');
    process.exit(1);
  }

  process.exit(0);
}

main();
