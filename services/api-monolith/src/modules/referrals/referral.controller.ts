/**
 * Referrals module controller.
 *
 * EventEmitter subscriptions (replacing Kafka consumers):
 *   ORDER_CREATED → credit referral wallets on the referred user's first order.
 *
 * user.registered still arrives via Kafka (user-service is kept separate).
 * The Kafka consumer in kafka/consumers/index.ts calls handleUserRegistered().
 */
import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { Referral, Wallet } from './models/referral.model';
import { internalBus, EVENTS, OrderCreatedPayload } from '../../shared/events/emitter';

const REFERRAL_BONUS = 200; // Rs.

// ── EventEmitter subscription ─────────────────────────────────────────────────

export function registerReferralEventHandlers(): void {
  internalBus.on(EVENTS.ORDER_CREATED, async (p: OrderCreatedPayload) => {
    try {
      // Only trigger for first-time orders by the referred user
      const referral = await Referral.findOne({ referredId: p.userId, status: 'PENDING' });
      if (!referral) return;

      referral.status      = 'COMPLETED';
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
                type:        'CREDIT',
                amount:      REFERRAL_BONUS,
                description: userId === referral.referrerId
                  ? 'Referral bonus — friend placed first order!'
                  : 'Welcome bonus — first order reward!',
                referralId:  referral.id,
                createdAt:   new Date(),
              },
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true, new: true },
        );
      }

      referral.status = 'PAID';
      await referral.save();
    } catch (err) {
      console.error('[referrals] ORDER_CREATED handler error:', err);
    }
  });
}

/**
 * Called from kafka/consumers/index.ts when user.registered event arrives.
 * Records a pending referral if the new user signed up with a referral code.
 */
export async function handleUserRegistered(payload: {
  userId:      string;
  referredBy?: string;
  referralCode?: string;
}): Promise<void> {
  if (!payload.referredBy || !payload.referralCode) return;
  try {
    const existing = await Referral.findOne({ referredId: payload.userId });
    if (existing) return;
    if (payload.referredBy === payload.userId) return; // self-referral guard
    await Referral.create({
      referrerId:   payload.referredBy,
      referredId:   payload.userId,
      referralCode: payload.referralCode,
      status:       'PENDING',
    });
  } catch (err) {
    console.error('[referrals] handleUserRegistered error:', err);
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/referrals/apply  (authenticated)
 * Apply wallet credits toward the caller's current checkout.
 * The web frontend sends { amount } — validate against actual wallet balance
 * and return { appliedAmount, newTotal } so checkout can deduct it.
 *
 * NOTE: this endpoint reserves the credit; the actual deduction happens when
 * the order is created. A full implementation would store a reservation token.
 * For now it validates and echoes back the allowed amount.
 */
export const applyWalletCredits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body as { amount?: number };
    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'amount must be a positive number' }); return;
    }
    const wallet = await Wallet.findOne({ userId: req.user!.userId });
    const balance = wallet?.balance ?? 0;
    if (balance <= 0) {
      res.status(400).json({ success: false, error: 'No wallet balance available' }); return;
    }
    const appliedAmount = Math.min(amount, balance);
    res.json({ success: true, data: { appliedAmount: String(appliedAmount), newTotal: String(Math.max(0, amount - appliedAmount)) } });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const getWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user!.userId });
    res.json({ success: true, data: wallet ?? { userId: req.user!.userId, balance: 0, transactions: [] } });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const getMyReferrals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const referrals = await Referral.find({ referrerId: req.user!.userId }).sort('-createdAt').limit(20);
    res.json({ success: true, data: referrals });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const getMyDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [wallet, referrals] = await Promise.all([
      Wallet.findOne({ userId: req.user!.userId }),
      Referral.find({ referrerId: req.user!.userId }).sort('-createdAt').limit(20),
    ]);
    const totalEarned = wallet?.transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((s, t) => s + t.amount, 0) ?? 0;

    const statusMap: Record<string, string> = { PAID: 'REWARDED', COMPLETED: 'REWARDED', PENDING: 'PENDING', REVOKED: 'REVOKED' };
    res.json({ success: true, data: {
      balance:      wallet?.balance ?? 0,
      totalEarned,
      referralCode: `REF${req.user!.userId.slice(-6).toUpperCase()}`,
      referrals:    referrals.map(r => ({
        _id:          r.id,
        refereeName:  r.referredId,
        status:       statusMap[r.status] ?? 'PENDING',
        rewardAmount: r.bonusAmount,
        createdAt:    r.createdAt,
      })),
    }});
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const getMyCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const referrals = await Referral.find({ referrerId: req.user!.userId });
    const rewarded  = referrals.filter(r => r.status === 'PAID' || r.status === 'COMPLETED');
    const pending   = referrals.filter(r => r.status === 'PENDING');
    const code      = `REF${req.user!.userId.slice(-6).toUpperCase()}`;
    res.json({ success: true, data: {
      code,
      shareUrl:      `https://bazzar.com/register?ref=${code}`,
      shareMessage:  `Use my referral code ${code} on Bazzar and get Rs. 200 off your first order!`,
      referralCount: referrals.length,
      pendingCount:  pending.length,
      rewardedCount: rewarded.length,
      totalEarned:   String(rewarded.length * REFERRAL_BONUS),
    }});
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const getReferralDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [wallet, referrals] = await Promise.all([
      Wallet.findOne({ userId: req.user!.userId }),
      Referral.find({ referrerId: req.user!.userId }),
    ]);
    const rewarded    = referrals.filter(r => r.status === 'PAID' || r.status === 'COMPLETED');
    const pending     = referrals.filter(r => r.status === 'PENDING');
    const totalEarned = wallet?.transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0) ?? 0;
    res.json({ success: true, data: {
      totalReferrals:    referrals.length,
      pendingReferrals:  pending.length,
      rewardedReferrals: rewarded.length,
      totalEarned:       String(totalEarned),
    }});
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const getReferralHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query as { page?: string; limit?: string };
    const skip = (Number(page) - 1) * Number(limit);
    const [referrals, total] = await Promise.all([
      Referral.find({ referrerId: req.user!.userId }).sort('-createdAt').skip(skip).limit(Number(limit)),
      Referral.countDocuments({ referrerId: req.user!.userId }),
    ]);
    const statusMap: Record<string, string> = { PAID: 'REWARDED', COMPLETED: 'REWARDED', PENDING: 'PENDING' };
    res.json({ success: true, data: referrals.map(r => ({
      id:           r.id,
      refereeEmail: r.referredId,
      status:       statusMap[r.status] ?? 'PENDING',
      rewardedAt:   r.completedAt,
      createdAt:    r.createdAt,
    })), meta: { total, page: Number(page), limit: Number(limit) }});
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const validateCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const valid = /^[A-Z0-9]{4,12}$/.test(code);
    res.json({ success: true, data: { valid, referrerName: valid ? 'Bazzar User' : undefined } });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

const referralConfig = [
  { key: 'REFERRAL_BONUS',    value: String(REFERRAL_BONUS), description: 'Credit awarded to both referrer and referee (Rs.)' },
  { key: 'MIN_ORDER_AMOUNT',  value: '1000',                 description: 'Minimum first order amount to trigger referral reward (Rs.)' },
  { key: 'MAX_WALLET_USAGE',  value: '200',                  description: 'Maximum wallet credit usable per order (Rs.)' },
  { key: 'CREDIT_EXPIRY_DAYS', value: '90',                  description: 'Days before referral credit expires' },
];

export const adminListReferrals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query as { status?: string; page?: string; limit?: string };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [referrals, total] = await Promise.all([
      Referral.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
      Referral.countDocuments(filter),
    ]);
    res.json({ success: true, data: referrals, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const adminRevokeReferral = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const referral = await Referral.findByIdAndUpdate(req.params.id, { status: 'REVOKED' }, { new: true });
    if (!referral) { res.status(404).json({ success: false, error: 'Referral not found' }); return; }
    res.json({ success: true, data: referral });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const adminGetConfig = (_req: Request, res: Response): void => {
  res.json({ success: true, data: referralConfig });
};

export const adminUpdateConfig = (req: Request, res: Response): void => {
  const cfg = referralConfig.find(c => c.key === req.params.key);
  if (!cfg) { res.status(404).json({ success: false, error: 'Config key not found' }); return; }
  cfg.value = (req.body as { value: string }).value;
  res.json({ success: true, data: cfg });
};
