import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Schema, model } from 'mongoose';
import jwt from 'jsonwebtoken';
import { startReferralConsumers } from './kafka/consumers';

const app = express();
const PORT = process.env.PORT || 8012;
const MONGO_URI = process.env.MONGO_URI_REFERRAL || 'mongodb://localhost:27025/referral_db';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access_secret_dev';
const REFERRAL_BONUS = 200; // Rs. 200 credit

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

function authenticate(req: any, res: any, next: any) {
  const userId = req.headers['x-user-id'];
  if (userId) { req.user = { id: userId, role: req.headers['x-user-role'] || 'BUYER' }; return next(); }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

// Referral schema
const ReferralSchema = new Schema({
  referrerId: { type: String, required: true }, // user who referred
  referredId: { type: String, required: true, unique: true }, // new user
  referralCode: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'PAID', 'REVOKED'], default: 'PENDING' },
  bonusAmount: { type: Number, default: REFERRAL_BONUS },
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
});
ReferralSchema.index({ referrerId: 1 });

const Referral = model('Referral', ReferralSchema);

// Wallet credit schema
const WalletSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  transactions: [{
    type: { type: String, enum: ['CREDIT', 'DEBIT'] },
    amount: Number,
    description: String,
    referralId: String,
    createdAt: { type: Date, default: Date.now },
  }],
  updatedAt: { type: Date, default: Date.now },
});

const Wallet = model('Wallet', WalletSchema);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'referral-service' }));

// Apply referral code when a new user registers
// Caller (user-service) must pass both referralCode and referrerId (userId of the code owner)
app.post('/api/v1/referrals/apply', async (req, res) => {
  try {
    const { referralCode, newUserId, referrerId } = req.body;
    if (!referralCode || !newUserId) return res.status(400).json({ success: false, error: 'referralCode and newUserId required' });
    if (!referrerId) return res.status(400).json({ success: false, error: 'referrerId (userId of code owner) required' });

    // Check if already referred
    const existing = await Referral.findOne({ referredId: newUserId });
    if (existing) return res.status(409).json({ success: false, error: 'User already referred' });

    // Prevent self-referral
    if (referrerId === newUserId) return res.status(400).json({ success: false, error: 'Cannot use your own referral code' });

    const referral = await Referral.create({
      referrerId, // actual userId of who owns the referral code
      referredId: newUserId,
      referralCode,
      status: 'PENDING',
    });

    res.json({ success: true, data: referral });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Complete referral (called when referred user places first order)
app.post('/api/v1/referrals/complete', async (req, res) => {
  try {
    const { referredUserId } = req.body;
    const referral = await Referral.findOne({ referredId: referredUserId, status: 'PENDING' });
    if (!referral) return res.status(404).json({ success: false, error: 'No pending referral found' });

    referral.status = 'COMPLETED';
    referral.completedAt = new Date();
    await referral.save();

    // Credit both users
    for (const userId of [referral.referrerId, referral.referredId]) {
      await Wallet.findOneAndUpdate(
        { userId },
        {
          $inc: { balance: REFERRAL_BONUS },
          $push: {
            transactions: {
              type: 'CREDIT',
              amount: REFERRAL_BONUS,
              description: userId === referral.referrerId ? 'Referral bonus — friend joined!' : 'Welcome bonus — first order!',
              referralId: referral._id,
            },
          },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, new: true }
      );
    }

    referral.status = 'PAID';
    await referral.save();

    res.json({ success: true, data: { bonusPaid: REFERRAL_BONUS * 2 } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get my wallet balance
app.get('/api/v1/referrals/wallet', authenticate, async (req: any, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id });
    res.json({ success: true, data: wallet || { userId: req.user.id, balance: 0, transactions: [] } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get my referrals
app.get('/api/v1/referrals/mine', authenticate, async (req: any, res) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: referrals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Combined endpoint: wallet + referral history (used by frontend /account/referral page)
// Matches both /referrals/my and /referral/my (via next.config.js dual rewrites)
app.get('/api/v1/referrals/my', authenticate, async (req: any, res) => {
  try {
    const [wallet, referrals] = await Promise.all([
      Wallet.findOne({ userId: req.user.id }),
      Referral.find({ referrerId: req.user.id }).sort({ createdAt: -1 }).limit(20),
    ]);
    const data = {
      balance: wallet?.balance ?? 0,
      totalEarned: wallet?.transactions
        ?.filter((t: any) => t.type === 'CREDIT')
        .reduce((sum: number, t: any) => sum + t.amount, 0) ?? 0,
      referralCode: req.user.referralCode ?? '',
      referrals: referrals.map((r: any) => ({
        _id: r._id,
        refereeName: r.referredId,
        status: r.status === 'PAID' ? 'REWARDED' : r.status === 'COMPLETED' ? 'REWARDED' : r.status === 'PENDING' ? 'PENDING' : 'REVOKED',
        rewardAmount: r.bonusAmount,
        createdAt: r.createdAt,
      })),
    };
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── My code (used by referral.api.ts getMyCode) ──────────────────────────────
app.get('/api/v1/referrals/my-code', authenticate, async (req: any, res) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user.id });
    const rewarded  = referrals.filter((r: any) => r.status === 'PAID' || r.status === 'COMPLETED');
    const pending   = referrals.filter((r: any) => r.status === 'PENDING');
    const totalEarned = rewarded.length * REFERRAL_BONUS;
    const code = req.user.referralCode || `REF${req.user.id.slice(-6).toUpperCase()}`;
    res.json({
      success: true,
      data: {
        code,
        shareUrl: `https://bazzar.com/register?ref=${code}`,
        shareMessage: `Use my referral code ${code} on Bazzar and get Rs. 200 off your first order!`,
        referralCount: referrals.length,
        pendingCount:  pending.length,
        rewardedCount: rewarded.length,
        totalEarned:   String(totalEarned),
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Dashboard summary ────────────────────────────────────────────────────────
app.get('/api/v1/referrals/dashboard', authenticate, async (req: any, res) => {
  try {
    const [wallet, referrals] = await Promise.all([
      Wallet.findOne({ userId: req.user.id }),
      Referral.find({ referrerId: req.user.id }),
    ]);
    const rewarded = referrals.filter((r: any) => r.status === 'PAID' || r.status === 'COMPLETED');
    const pending  = referrals.filter((r: any) => r.status === 'PENDING');
    const totalEarned = wallet?.transactions
      ?.filter((t: any) => t.type === 'CREDIT')
      .reduce((s: number, t: any) => s + t.amount, 0) ?? 0;
    res.json({
      success: true,
      data: {
        totalReferrals:   referrals.length,
        pendingReferrals: pending.length,
        rewardedReferrals: rewarded.length,
        totalEarned: String(totalEarned),
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Referral history (paginated) ─────────────────────────────────────────────
app.get('/api/v1/referrals/history', authenticate, async (req: any, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [referrals, total] = await Promise.all([
      Referral.find({ referrerId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Referral.countDocuments({ referrerId: req.user.id }),
    ]);
    const statusMap: Record<string, string> = { PAID: 'REWARDED', COMPLETED: 'REWARDED', PENDING: 'PENDING' };
    res.json({
      success: true,
      data: referrals.map((r: any) => ({
        id:          r._id,
        refereeEmail: r.referredId,
        status:      statusMap[r.status] || 'PENDING',
        rewardedAt:  r.completedAt,
        createdAt:   r.createdAt,
      })),
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Validate referral code (used at registration) ────────────────────────────
app.get('/api/v1/referrals/validate/:code', async (req, res) => {
  try {
    // In a full implementation we'd look up the user by referralCode field in user-service.
    // For now: any non-empty code that looks like a referral code is "valid".
    const code = req.params.code;
    const valid = /^[A-Z0-9]{4,12}$/.test(code);
    res.json({ success: true, data: { valid, referrerName: valid ? 'Bazzar User' : undefined } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Admin: list all referrals ────────────────────────────────────────────────
app.get('/api/v1/admin/referrals', authenticate, async (req: any, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [referrals, total] = await Promise.all([
      Referral.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Referral.countDocuments(filter),
    ]);
    res.json({ success: true, data: referrals, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Admin: revoke a referral ─────────────────────────────────────────────────
app.patch('/api/v1/admin/referrals/:id/revoke', authenticate, async (req: any, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(req.params.id, { status: 'REVOKED' }, { new: true });
    if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
    res.json({ success: true, data: referral });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Admin: referral config (bonus amount, rules, etc.) ───────────────────────
const referralConfig = [
  { key: 'REFERRAL_BONUS', value: String(REFERRAL_BONUS), description: 'Credit awarded to both referrer and referee (Rs.)' },
  { key: 'MIN_ORDER_AMOUNT', value: '1000', description: 'Minimum first order amount to trigger referral reward (Rs.)' },
  { key: 'MAX_WALLET_USAGE', value: '200', description: 'Maximum wallet credit usable per order (Rs.)' },
  { key: 'CREDIT_EXPIRY_DAYS', value: '90', description: 'Days before referral credit expires' },
];

app.get('/api/v1/admin/referral-config', authenticate, (req, res) => {
  res.json({ success: true, data: referralConfig });
});

app.patch('/api/v1/admin/referral-config/:key', authenticate, (req: any, res) => {
  const cfg = referralConfig.find(c => c.key === req.params.key);
  if (!cfg) return res.status(404).json({ success: false, error: 'Config key not found' });
  cfg.value = req.body.value;
  res.json({ success: true, data: cfg });
});

mongoose.connect(MONGO_URI)
  .then(async () => {
    await startReferralConsumers().catch(e => console.warn('⚠️ Kafka:', e.message));
    app.listen(PORT, () => console.log(`🚀 Referral Service running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ DB connection failed:', err.message); process.exit(1); });
