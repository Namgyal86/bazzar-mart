/**
 * create-credentials.js
 *
 * Creates an admin and a seller account by:
 *   1. Calling the running register API (so the monolith writes to wherever
 *      its MongoDB is — no need to guess the URI).
 *   2. Connecting to MongoDB on localhost:27017 and scanning all databases
 *      to find the users collection, then patching the role.
 *
 * Run:  node create-credentials.js
 * Requires API running on http://localhost:8100
 */

const http  = require('http');

// ── Config ────────────────────────────────────────────────────────────────────
const API   = 'http://localhost:8100';
const USERS = [
  { firstName:'Admin',  lastName:'Bazzar', email:'admin2@bazzar.com',  phone:'9811111111', password:'Admin@12345',  role:'ADMIN'  },
  { firstName:'Seller', lastName:'Bazzar', email:'seller@bazzar.com',  phone:'9822222222', password:'Seller@12345', role:'SELLER' },
];

// ── HTTP helper ───────────────────────────────────────────────────────────────
function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = Object.assign(require('url').parse(url), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    });
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let MongoClient, bcrypt;
  try { MongoClient = require('mongodb').MongoClient; }
  catch { require('child_process').execSync('npm install mongodb', { cwd: __dirname, stdio: 'inherit' }); MongoClient = require('mongodb').MongoClient; }
  try { bcrypt = require('bcryptjs'); }
  catch { require('child_process').execSync('npm install bcryptjs', { cwd: __dirname, stdio: 'inherit' }); bcrypt = require('bcryptjs'); }

  console.log('\n🔧 Bazzar — Create Admin & Seller Credentials\n' + '='.repeat(50));

  // Step 1: Register via API
  const created = [];
  for (const u of USERS) {
    process.stdout.write(`\n  Registering ${u.email} ... `);
    try {
      const r = await post(`${API}/api/v1/auth/register`, {
        firstName: u.firstName, lastName: u.lastName,
        email: u.email, phone: u.phone, password: u.password,
      });
      if (r.status === 201) {
        console.log('✅ registered');
        created.push(u);
      } else if (r.status === 409) {
        console.log('⚠️  already exists — will still patch role');
        created.push(u);
      } else {
        console.log(`❌ failed (${r.status}):`, JSON.stringify(r.body));
      }
    } catch (err) {
      console.log(`❌ API error: ${err.message}`);
      console.log('   Is the API running on http://localhost:8100 ?');
      process.exit(1);
    }
  }

  if (!created.length) { console.log('\nNo users to patch. Exiting.'); return; }

  // Step 2: Find the right MongoDB database by scanning for the users collection
  console.log('\n\n🔍 Scanning MongoDB for users collection...');
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();

  const adminDb   = client.db('admin');
  const dbList    = await adminDb.admin().listDatabases();
  let targetDb    = null;

  for (const { name } of dbList.databases) {
    if (['admin','local','config'].includes(name)) continue;
    const colls = await client.db(name).listCollections({ name: 'users' }).toArray();
    if (colls.length) {
      const count = await client.db(name).collection('users').countDocuments();
      console.log(`  Found users collection in "${name}" (${count} docs)`);
      if (!targetDb || count > 0) targetDb = name;
    }
  }

  if (!targetDb) {
    console.log('  ❌ Could not find a users collection in any database.');
    console.log('     Make sure the API has handled at least one registration first.');
    await client.close();
    process.exit(1);
  }

  console.log(`\n  ✅ Using database: "${targetDb}"`);
  const db = client.db(targetDb);

  // Step 3: Patch roles
  console.log('\n🛠️  Patching roles...');
  for (const u of created) {
    const result = await db.collection('users').updateOne(
      { email: u.email },
      { $set: { role: u.role, isActive: true, isEmailVerified: true } }
    );
    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      console.log(`  ✅ ${u.email} → role set to ${u.role}`);
    } else {
      console.log(`  ❌ ${u.email} not found in DB — registration may have failed`);
    }
  }

  await client.close();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Done! New credentials:\n');
  console.log('   👑 Admin:   admin2@bazzar.com  / Admin@12345');
  console.log('   🏪 Seller:  seller@bazzar.com  / Seller@12345\n');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
