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
import {
  buildEsewaFormData,
  decodeEsewaCallbackData,
  verifyEsewaCallbackSignature,
  checkEsewaStatus,
  isEsewaSuccess,
  ESEWA_FORM_URL,
} from '../services/esewa.service';

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
      // success_url points to our backend callback which verifies + fires Kafka
      const apiBase = process.env.API_BASE_URL || 'http://localhost:8005';
      const successUrl = `${apiBase}/api/v1/payments/esewa/callback`;
      const failureUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/payment/failed`;

      const esewaData = buildEsewaFormData(payment.id, amount, successUrl, failureUrl);
      payment.status = 'INITIATED';
      await payment.save();

      return res.json({
        success: true,
        data: {
          payment,
          esewaData,
          formUrl: ESEWA_FORM_URL,
          method: 'ESEWA',
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

// ─── eSewa Callback (GET redirect from eSewa browser redirect) ───────────────
// eSewa redirects success_url?data=<base64-json>
// The base64 JSON contains transaction_code, status, total_amount,
// transaction_uuid, product_code, signed_field_names, signature

export const esewaCallback = async (req: Request, res: Response) => {
  const { data: encodedData } = req.query as Record<string, string>;
  const webUrl = process.env.WEB_URL || 'http://localhost:3000';

  if (!encodedData) {
    return res.redirect(`${webUrl}/payment/failed?reason=missing_data`);
  }

  let callbackData;
  try {
    callbackData = decodeEsewaCallbackData(encodedData);
  } catch {
    return res.redirect(`${webUrl}/payment/failed?reason=invalid_response`);
  }

  const { transaction_uuid: transactionUuid, total_amount: totalAmount } = callbackData;

  // Verify eSewa's response signature before trusting it
  if (!verifyEsewaCallbackSignature(callbackData)) {
    return res.redirect(`${webUrl}/payment/failed?reason=invalid_signature`);
  }

  try {
    // transaction_uuid is the payment._id we stored at initiation
    const payment = await Payment.findById(transactionUuid);
    if (!payment) {
      return res.redirect(`${webUrl}/payment/failed?reason=not_found`);
    }

    // Always confirm with status check API — never trust callback status alone
    const statusRes = await checkEsewaStatus(transactionUuid, totalAmount);

    if (isEsewaSuccess(statusRes.status)) {
      await emitPaymentResult(payment, 'SUCCESS', statusRes.ref_id, { ...callbackData, statusCheck: statusRes });
      return res.redirect(`${webUrl}/payment/success?orderId=${payment.orderId}&txn=${statusRes.ref_id ?? ''}`);
    } else {
      await emitPaymentResult(payment, 'FAILED', undefined, { esewaStatus: statusRes.status });
      return res.redirect(`${webUrl}/payment/failed?orderId=${payment.orderId}&reason=${encodeURIComponent(statusRes.status)}`);
    }
  } catch {
    return res.redirect(`${webUrl}/payment/failed?reason=verification_error`);
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
    } else if (gateway === 'ESEWA') {
      // eSewa: use status check API with the payment._id as transaction_uuid
      try {
        const statusRes = await checkEsewaStatus(payment.id, payment.amount);
        if (isEsewaSuccess(statusRes.status)) {
          await emitPaymentResult(payment, 'SUCCESS', statusRes.ref_id, statusRes);
        } else {
          await emitPaymentResult(payment, 'FAILED', undefined, { esewaStatus: statusRes.status });
        }
      } catch (err: any) {
        return res.status(502).json({ success: false, error: `eSewa status check failed: ${err.message}` });
      }
    } else {
      // Fonepay, COD: mark success and emit
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
