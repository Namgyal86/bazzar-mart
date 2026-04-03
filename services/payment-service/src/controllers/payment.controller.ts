import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Payment } from '../models/payment.model';
import { publishPaymentEvent } from '../kafka/producer';
import {
  khaltiInitiate,
  khaltiLookup,
  toKhaltiPaisa,
  isKhaltiSuccess,
  khaltiErrorMessage,
} from '../services/khalti.service';
import axios from 'axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function emitPaymentResult(
  payment: InstanceType<typeof Payment>,
  status: 'SUCCESS' | 'FAILED',
  transactionId?: string,
  gatewayResponse?: unknown,
) {
  payment.status = status;
  if (transactionId) payment.transactionId = transactionId;
  if (gatewayResponse) payment.gatewayResponse = gatewayResponse;
  await payment.save();

  const topic = status === 'SUCCESS' ? 'payment.success' : 'payment.failed';
  publishPaymentEvent(topic, {
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    amount: payment.amount,
    gateway: payment.gateway,
    transactionId: payment.transactionId,
  }).catch(() => {});
}

// ─── Initiate Payment ─────────────────────────────────────────────────────────

export const initiatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, amount, gateway, returnUrl, customerInfo } = req.body;

    const payment = await Payment.create({
      orderId,
      userId: req.user!.userId,
      amount,
      gateway,
      status: 'INITIATED',
    });

    // ── COD ────────────────────────────────────────────────────────────────────
    if (gateway === 'COD') {
      await emitPaymentResult(payment, 'SUCCESS', 'COD-' + Date.now());
      return res.json({ success: true, data: { payment, redirect: null, method: 'COD' } });
    }

    // ── KHALTI ─────────────────────────────────────────────────────────────────
    if (gateway === 'KHALTI') {
      try {
        const khaltiRes = await khaltiInitiate({
          return_url: returnUrl || `${process.env.WEB_URL}/payment/verify`,
          website_url: process.env.WEB_URL || 'http://localhost:3000',
          amount: toKhaltiPaisa(amount),
          purchase_order_id: orderId,
          purchase_order_name: `Bazzar Order ${orderId}`,
          customer_info: customerInfo,
        });

        payment.pidx = khaltiRes.pidx;
        payment.status = 'INITIATED';
        await payment.save();

        return res.json({
          success: true,
          data: {
            payment,
            redirect: khaltiRes.payment_url,
            pidx: khaltiRes.pidx,
            expires_at: khaltiRes.expires_at,
            method: 'KHALTI',
          },
        });
      } catch (err) {
        return res.status(502).json({
          success: false,
          error: `Khalti initiation failed: ${khaltiErrorMessage(err)}`,
        });
      }
    }

    // ── ESEWA ──────────────────────────────────────────────────────────────────
    if (gateway === 'ESEWA') {
      const esewaData = {
        amount,
        tax_amount: 0,
        total_amount: amount,
        transaction_uuid: payment.id,
        product_code: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: returnUrl || `${process.env.WEB_URL}/payment/verify?gateway=esewa`,
        failure_url: `${process.env.WEB_URL}/payment/failed`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
      };
      payment.status = 'INITIATED';
      await payment.save();
      return res.json({
        success: true,
        data: {
          payment,
          esewaData,
          method: 'ESEWA',
          formUrl: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
        },
      });
    }

    // ── FONEPAY ────────────────────────────────────────────────────────────────
    if (gateway === 'FONEPAY') {
      try {
        const merchantCode = process.env.FONEPAY_MERCHANT_CODE || 'FONEPAY_MERCHANT';
        const secretKey = process.env.FONEPAY_SECRET_KEY || '';
        const prn = payment.id;

        const crypto = await import('crypto');
        const dataToSign = `${merchantCode},${prn},${amount},NPR,${Date.now()}`;
        const signature = secretKey
          ? crypto.createHmac('md5', secretKey).update(dataToSign).digest('hex').toUpperCase()
          : 'DEV_SIGNATURE';

        const qrData = {
          merchantCode,
          prn,
          amount,
          currency: 'NPR',
          signature,
          returnUrl: returnUrl || `${process.env.WEB_URL}/payment/verify?gateway=fonepay`,
        };

        payment.status = 'INITIATED';
        payment.gatewayResponse = qrData;
        await payment.save();
        return res.json({ success: true, data: { payment, qrData, method: 'FONEPAY' } });
      } catch (err: any) {
        return res.status(502).json({ success: false, error: `Fonepay initiation failed: ${err.message}` });
      }
    }

    // ── STRIPE ─────────────────────────────────────────────────────────────────
    if (gateway === 'STRIPE') {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
          metadata: { orderId, paymentId: payment.id },
        });
        payment.status = 'INITIATED';
        payment.gatewayResponse = { clientSecret: paymentIntent.client_secret, intentId: paymentIntent.id };
        await payment.save();
        return res.json({
          success: true,
          data: { payment, clientSecret: paymentIntent.client_secret, method: 'STRIPE' },
        });
      } catch (err: any) {
        return res.status(502).json({ success: false, error: `Stripe initiation failed: ${err.message}` });
      }
    }

    // ── RAZORPAY ───────────────────────────────────────────────────────────────
    if (gateway === 'RAZORPAY') {
      try {
        const Razorpay = (await import('razorpay')).default;
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID || '',
          key_secret: process.env.RAZORPAY_KEY_SECRET || '',
        });
        const order = await razorpay.orders.create({
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: payment.id,
          notes: { orderId },
        });
        payment.status = 'INITIATED';
        payment.gatewayResponse = { razorpayOrderId: order.id };
        await payment.save();
        return res.json({
          success: true,
          data: {
            payment,
            razorpayOrderId: order.id,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            method: 'RAZORPAY',
          },
        });
      } catch (err: any) {
        return res.status(502).json({ success: false, error: `Razorpay initiation failed: ${err.message}` });
      }
    }

    return res.status(400).json({ success: false, error: `Unsupported gateway: ${gateway}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Khalti Callback (GET redirect from Khalti browser redirect) ──────────────
// Khalti redirects the user's browser to return_url with query params:
// pidx, status, transaction_id, tidx, amount, mobile, purchase_order_id,
// purchase_order_name, total_amount

export const khaltiCallback = async (req: Request, res: Response) => {
  const {
    pidx,
    purchase_order_id: orderId,
    status: rawStatus,
  } = req.query as Record<string, string>;

  const webUrl = process.env.WEB_URL || 'http://localhost:3000';

  if (!pidx || !orderId) {
    return res.redirect(`${webUrl}/payment/failed?reason=missing_params`);
  }

  try {
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.redirect(`${webUrl}/payment/failed?reason=not_found&orderId=${orderId}`);
    }

    // Always do a server-side lookup — never trust query param status alone
    const lookup = await khaltiLookup(pidx);

    if (isKhaltiSuccess(lookup.status)) {
      await emitPaymentResult(payment, 'SUCCESS', lookup.transaction_id, lookup);
      return res.redirect(`${webUrl}/payment/success?orderId=${orderId}&txn=${lookup.transaction_id}`);
    } else {
      await emitPaymentResult(payment, 'FAILED', undefined, { khaltiStatus: lookup.status });
      return res.redirect(`${webUrl}/payment/failed?orderId=${orderId}&reason=${encodeURIComponent(lookup.status)}`);
    }
  } catch (err) {
    return res.redirect(`${webUrl}/payment/failed?orderId=${orderId}&reason=verification_error`);
  }
};

// ─── Verify Payment (API call from frontend after callback) ───────────────────

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { pidx, orderId, gateway } = req.body;
    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    if (gateway === 'KHALTI' && pidx) {
      try {
        const lookup = await khaltiLookup(pidx);
        if (isKhaltiSuccess(lookup.status)) {
          await emitPaymentResult(payment, 'SUCCESS', lookup.transaction_id, lookup);
        } else {
          await emitPaymentResult(payment, 'FAILED', undefined, { khaltiStatus: lookup.status });
        }
      } catch (err) {
        return res.status(502).json({ success: false, error: `Khalti lookup failed: ${khaltiErrorMessage(err)}` });
      }
    } else {
      // Other gateways: mark success and emit (webhooks are primary path for Stripe/Razorpay)
      await emitPaymentResult(payment, 'SUCCESS');
    }

    res.json({ success: true, data: payment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Get Payment by Order ─────────────────────────────────────────────────────

export const getPaymentByOrder = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: payment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Stripe Webhook ───────────────────────────────────────────────────────────

export const stripeWebhook = async (req: any, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: any;

  try {
    if (webhookSecret && sig) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    return res.status(400).json({ success: false, error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const orderId = intent.metadata?.orderId;
    if (orderId) {
      const payment = await Payment.findOne({ orderId });
      if (payment) await emitPaymentResult(payment, 'SUCCESS', intent.id, intent);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const orderId = intent.metadata?.orderId;
    if (orderId) {
      const payment = await Payment.findOne({ orderId });
      if (payment) await emitPaymentResult(payment, 'FAILED');
    }
  }

  res.json({ received: true });
};

// ─── Razorpay Webhook ─────────────────────────────────────────────────────────

export const razorpayWebhook = async (req: any, res: Response) => {
  try {
    const crypto = await import('crypto');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (expected !== signature) {
        return res.status(400).json({ success: false, error: 'Invalid signature' });
      }
    }

    const { event, payload } = req.body;
    if (event === 'payment.captured') {
      const razorpayOrderId = payload?.payment?.entity?.order_id;
      if (razorpayOrderId) {
        const payment = await Payment.findOne({ 'gatewayResponse.razorpayOrderId': razorpayOrderId });
        if (payment) {
          await emitPaymentResult(payment, 'SUCCESS', payload?.payment?.entity?.id);
        }
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Admin: list payments ─────────────────────────────────────────────────────

export const getAdminPayments = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const payments = await Payment.find()
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Payment.countDocuments();
    res.json({ success: true, data: payments, meta: { page, limit, total } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
