import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { Payment, IPayment } from './models/payment.model';
import { publishEvent } from '../../kafka/producer';
import { internalBus, EVENTS } from '../../shared/events/emitter';
import { env } from '../../config/env';
import { handleError } from '../../shared/middleware/error';
import {
  khaltiInitiate, khaltiLookup, toKhaltiPaisa,
  isKhaltiSuccess, khaltiErrorMessage, khaltiRefund,
} from './services/khalti.service';
import {
  buildEsewaFormData, decodeEsewaCallbackData,
  verifyEsewaCallbackSignature, checkEsewaStatus,
  isEsewaSuccess, ESEWA_FORM_URL,
} from './services/esewa.service';
import { fonepayVerify, isFonepaySuccess } from './services/fonepay.service';

// ── Shared helper ─────────────────────────────────────────────────────────────

async function emitPaymentResult(
  payment:          IPayment,
  status:           'SUCCESS' | 'FAILED',
  transactionId?:   string,
  gatewayResponse?: unknown,
): Promise<void> {
  payment.status = status;
  if (transactionId)   payment.transactionId   = transactionId;
  if (gatewayResponse) payment.gatewayResponse  = gatewayResponse;
  await payment.save();

  const basePayload = {
    paymentId:     (payment as { id: string }).id,
    orderId:       payment.orderId,
    userId:        payment.userId,
    amount:        payment.amount,
    gateway:       payment.gateway,
    transactionId: payment.transactionId,
  };

  if (status === 'SUCCESS') {
    internalBus.emit(EVENTS.PAYMENT_SUCCESS, { ...basePayload, sellerId: '' });
    publishEvent('payment.success', basePayload).catch(() => {});
  } else {
    internalBus.emit(EVENTS.PAYMENT_FAILED, basePayload);
    publishEvent('payment.failed', basePayload).catch(() => {});
  }
}

// ── Initiate ──────────────────────────────────────────────────────────────────

export const initiatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, amount, gateway, returnUrl, customerInfo } = req.body as {
      orderId: string; amount: number; gateway: string;
      returnUrl?: string; customerInfo?: { name?: string; email?: string; phone?: string };
    };

    const payment = await Payment.create({ orderId, userId: req.user!.userId, amount, gateway, status: 'INITIATED' });

    // COD
    if (gateway === 'COD') {
      await emitPaymentResult(payment, 'SUCCESS', 'COD-' + Date.now());
      res.json({ success: true, data: { payment, redirect: null, method: 'COD' } }); return;
    }

    // Khalti
    if (gateway === 'KHALTI') {
      // Validate minimum amount before touching external API
      let khaltiPaisa: number;
      try {
        khaltiPaisa = toKhaltiPaisa(amount);
      } catch (e) {
        await payment.deleteOne();
        res.status(400).json({ success: false, error: (e as Error).message }); return;
      }

      // Dev mock — no real key configured, simulate success immediately
      if (!env.KHALTI_SECRET_KEY && env.NODE_ENV !== 'production') {
        await emitPaymentResult(payment, 'SUCCESS', 'DEV-KHALTI-' + Date.now());
        res.json({ success: true, data: { payment, redirect: null, method: 'KHALTI_DEV_MOCK' } }); return;
      }
      try {
        const callbackBase = env.PUBLIC_API_URL ?? env.API_BASE_URL;
        const khaltiRes = await khaltiInitiate({
          return_url:          `${callbackBase}/api/v1/payments/khalti/callback`,
          website_url:         env.WEB_URL,
          amount:              khaltiPaisa,
          purchase_order_id:   orderId,
          purchase_order_name: `Bazzar Order ${orderId}`,
          customer_info:       customerInfo,
        });
        payment.pidx   = khaltiRes.pidx;
        payment.status = 'INITIATED';
        await payment.save();
        res.json({ success: true, data: { payment, redirect: khaltiRes.payment_url, pidx: khaltiRes.pidx, expires_at: khaltiRes.expires_at, method: 'KHALTI' } }); return;
      } catch (err) {
        res.status(502).json({ success: false, error: `Khalti initiation failed: ${khaltiErrorMessage(err)}` }); return;
      }
    }

    // eSewa
    if (gateway === 'ESEWA') {
      const callbackBase = env.PUBLIC_API_URL ?? env.API_BASE_URL;
      const successUrl = `${callbackBase}/api/v1/payments/esewa/callback`;
      const failureUrl = `${env.WEB_URL}/payment/failed`;
      const esewaData  = buildEsewaFormData((payment as { id: string }).id, amount, successUrl, failureUrl);
      payment.status   = 'INITIATED';
      await payment.save();
      res.json({ success: true, data: { payment, esewaData, formUrl: ESEWA_FORM_URL, method: 'ESEWA' } }); return;
    }

    // Fonepay
    if (gateway === 'FONEPAY') {
      const crypto    = await import('crypto');
      const prn       = (payment as { id: string }).id;
      const secretKey = env.FONEPAY_SECRET_KEY ?? '';
      const dataToSign = `${env.FONEPAY_MERCHANT_CODE ?? ''},${prn},${amount},NPR,${Date.now()}`;
      const signature  = secretKey
        ? crypto.createHmac('md5', secretKey).update(dataToSign).digest('hex').toUpperCase()
        : 'DEV_SIGNATURE';
      const qrData = { merchantCode: env.FONEPAY_MERCHANT_CODE, prn, amount, currency: 'NPR', signature, returnUrl: returnUrl ?? `${env.WEB_URL}/payment/verify?gateway=fonepay` };
      payment.status          = 'INITIATED';
      payment.gatewayResponse = qrData;
      await payment.save();
      res.json({ success: true, data: { payment, qrData, method: 'FONEPAY' } }); return;
    }

    res.status(400).json({ success: false, error: `Unsupported gateway: ${gateway}` });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Khalti browser callback ───────────────────────────────────────────────────

export const khaltiCallback = async (req: Request, res: Response): Promise<void> => {
  const { pidx, purchase_order_id: orderId } = req.query as Record<string, string>;
  const webUrl = env.WEB_URL;
  if (!pidx || !orderId) { res.redirect(`${webUrl}/payment/failed?reason=missing_params`); return; }
  try {
    const payment = await Payment.findOne({ orderId });
    if (!payment) { res.redirect(`${webUrl}/payment/failed?reason=not_found&orderId=${orderId}`); return; }
    // Idempotency: already processed
    if (payment.status === 'SUCCESS') { res.redirect(`${webUrl}/payment/success?orderId=${orderId}&txn=${payment.transactionId ?? ''}`); return; }
    const lookup = await khaltiLookup(pidx);
    if (isKhaltiSuccess(lookup.status)) {
      await emitPaymentResult(payment, 'SUCCESS', lookup.transaction_id, lookup);
      res.redirect(`${webUrl}/payment/success?orderId=${orderId}&txn=${lookup.transaction_id}`);
    } else {
      await emitPaymentResult(payment, 'FAILED', undefined, { khaltiStatus: lookup.status });
      res.redirect(`${webUrl}/payment/failed?orderId=${orderId}&reason=${encodeURIComponent(lookup.status)}`);
    }
  } catch { res.redirect(`${webUrl}/payment/failed?orderId=${orderId}&reason=verification_error`); }
};

// ── Khalti server-to-server webhook ──────────────────────────────────────────

export const khaltiWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const sig  = req.headers['x-khalti-signature'] as string | undefined;
    const body = req.body as { event?: string; payload?: { pidx?: string; purchase_order_id?: string; transaction_id?: string; status?: string } };

    // Verify signature when a webhook secret is configured
    if (sig && env.KHALTI_SECRET_KEY) {
      const crypto = await import('crypto');
      const rawBody = JSON.stringify(req.body);
      const expected = crypto.createHmac('sha256', env.KHALTI_SECRET_KEY).update(rawBody).digest('hex');
      if (sig !== expected) { res.status(401).json({ success: false, error: 'Invalid signature' }); return; }
    }

    const pidx    = body.payload?.pidx;
    const orderId = body.payload?.purchase_order_id;
    if (!pidx || !orderId) { res.status(400).json({ success: false, error: 'Missing pidx or orderId' }); return; }

    const payment = await Payment.findOne({ orderId });
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found' }); return; }
    if (payment.status === 'SUCCESS') { res.json({ success: true, message: 'Already processed' }); return; }

    const lookup = await khaltiLookup(pidx);
    if (isKhaltiSuccess(lookup.status)) {
      await emitPaymentResult(payment, 'SUCCESS', lookup.transaction_id, lookup);
    } else {
      await emitPaymentResult(payment, 'FAILED', undefined, { khaltiStatus: lookup.status });
    }

    res.json({ success: true });
  } catch (err: unknown) { handleError(err, res); }
};

// ── eSewa browser callback ────────────────────────────────────────────────────

export const esewaCallback = async (req: Request, res: Response): Promise<void> => {
  const { data: encodedData } = req.query as Record<string, string>;
  const webUrl = env.WEB_URL;
  if (!encodedData) { res.redirect(`${webUrl}/payment/failed?reason=missing_data`); return; }
  let callbackData;
  try { callbackData = decodeEsewaCallbackData(encodedData); }
  catch { res.redirect(`${webUrl}/payment/failed?reason=invalid_response`); return; }
  if (!verifyEsewaCallbackSignature(callbackData)) {
    res.redirect(`${webUrl}/payment/failed?reason=invalid_signature`); return;
  }
  const { transaction_uuid: txUuid, total_amount: totalAmount } = callbackData;
  try {
    const payment = await Payment.findById(txUuid);
    if (!payment) { res.redirect(`${webUrl}/payment/failed?reason=not_found`); return; }
    if (payment.status === 'SUCCESS') { res.redirect(`${webUrl}/payment/success?orderId=${payment.orderId}&txn=${payment.transactionId ?? ''}`); return; }
    const statusRes = await checkEsewaStatus(txUuid, totalAmount);
    if (isEsewaSuccess(statusRes.status)) {
      await emitPaymentResult(payment, 'SUCCESS', statusRes.ref_id, { ...callbackData, statusCheck: statusRes });
      res.redirect(`${webUrl}/payment/success?orderId=${payment.orderId}&txn=${statusRes.ref_id ?? ''}`);
    } else {
      await emitPaymentResult(payment, 'FAILED', undefined, { esewaStatus: statusRes.status });
      res.redirect(`${webUrl}/payment/failed?orderId=${payment.orderId}&reason=${encodeURIComponent(statusRes.status)}`);
    }
  } catch { res.redirect(`${webUrl}/payment/failed?reason=verification_error`); }
};

// ── eSewa server-to-server webhook ────────────────────────────────────────────

export const esewaWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as { transaction_uuid?: string; total_amount?: number; status?: string; ref_id?: string };
    if (!body.transaction_uuid) { res.status(400).json({ success: false, error: 'Missing transaction_uuid' }); return; }

    const payment = await Payment.findById(body.transaction_uuid);
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found' }); return; }
    if (payment.status === 'SUCCESS') { res.json({ success: true, message: 'Already processed' }); return; }

    // Re-verify status directly with eSewa to avoid trusting unverified webhook body
    const statusRes = await checkEsewaStatus(body.transaction_uuid, payment.amount);
    if (isEsewaSuccess(statusRes.status)) {
      await emitPaymentResult(payment, 'SUCCESS', statusRes.ref_id, statusRes);
    } else {
      await emitPaymentResult(payment, 'FAILED', undefined, { esewaStatus: statusRes.status });
    }

    res.json({ success: true });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Frontend verify (after redirect / Fonepay manual confirm) ─────────────────

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pidx, orderId, gateway } = req.body as { pidx?: string; orderId: string; gateway: string };
    const payment = await Payment.findOne({ orderId });
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found' }); return; }

    // Idempotency: already processed
    if (payment.status === 'SUCCESS') { res.json({ success: true, data: payment }); return; }

    if (gateway === 'KHALTI' && pidx) {
      try {
        const lookup = await khaltiLookup(pidx);
        await emitPaymentResult(payment, isKhaltiSuccess(lookup.status) ? 'SUCCESS' : 'FAILED', lookup.transaction_id, lookup);
      } catch (err) { res.status(502).json({ success: false, error: `Khalti lookup failed: ${khaltiErrorMessage(err)}` }); return; }
    } else if (gateway === 'ESEWA') {
      try {
        const statusRes = await checkEsewaStatus((payment as { id: string }).id, payment.amount);
        await emitPaymentResult(payment, isEsewaSuccess(statusRes.status) ? 'SUCCESS' : 'FAILED', statusRes.ref_id, statusRes);
      } catch (err: unknown) { res.status(502).json({ success: false, error: `eSewa check failed: ${(err as Error).message}` }); return; }
    } else if (gateway === 'FONEPAY') {
      // Real verification against Fonepay status API
      try {
        const qrData  = payment.gatewayResponse as { prn?: string; amount?: number } | undefined;
        const prn     = qrData?.prn ?? (payment as { id: string }).id;
        const amount  = qrData?.amount ?? payment.amount;
        const result  = await fonepayVerify(prn, amount);
        if (isFonepaySuccess(result)) {
          await emitPaymentResult(payment, 'SUCCESS', `FP-${prn}`, result);
        } else {
          res.status(400).json({ success: false, error: result.MESSAGE ?? 'Fonepay payment not confirmed yet' }); return;
        }
      } catch (err: unknown) { res.status(502).json({ success: false, error: `Fonepay verification failed: ${(err as Error).message}` }); return; }
    } else {
      // COD or unknown — trust frontend
      await emitPaymentResult(payment, 'SUCCESS');
    }
    res.json({ success: true, data: payment });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Refund ────────────────────────────────────────────────────────────────────

export const refundPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, reason } = req.body as { orderId: string; reason?: string };
    const payment = await Payment.findOne({ orderId, status: 'SUCCESS' });
    if (!payment) { res.status(404).json({ success: false, error: 'No successful payment found for this order' }); return; }
    if (payment.status === 'REFUNDED') { res.status(400).json({ success: false, error: 'Payment already refunded' }); return; }

    // Process refund via gateway
    if (payment.gateway === 'KHALTI' && payment.pidx) {
      try {
        await khaltiRefund(payment.pidx);
      } catch (err) {
        res.status(502).json({ success: false, error: `Khalti refund failed: ${khaltiErrorMessage(err)}` }); return;
      }
    }
    // eSewa and Fonepay refunds require manual processing via their merchant dashboards
    // (their public APIs do not expose a programmatic refund endpoint)

    payment.status       = 'REFUNDED';
    payment.refundReason = reason;
    await payment.save();

    internalBus.emit(EVENTS.PAYMENT_FAILED, {
      paymentId: (payment as { id: string }).id,
      orderId:   payment.orderId,
      userId:    payment.userId,
      amount:    payment.amount,
      gateway:   payment.gateway,
    });

    publishEvent('payment.refunded', {
      paymentId: (payment as { id: string }).id,
      orderId:   payment.orderId,
      userId:    payment.userId,
      amount:    payment.amount,
      gateway:   payment.gateway,
      reason,
    }).catch(() => {});

    res.json({ success: true, data: payment });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Read ──────────────────────────────────────────────────────────────────────

export const getPaymentByOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: payment });
  } catch (err: unknown) { handleError(err, res); }
};

export const getAdminPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const page  = Number((req.query as { page?: string }).page)  || 1;
    const limit = Number((req.query as { limit?: string }).limit) || 20;
    const [payments, total] = await Promise.all([
      Payment.find().sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Payment.countDocuments(),
    ]);
    res.json({ success: true, data: payments, meta: { page, limit, total } });
  } catch (err: unknown) { handleError(err, res); }
};

export const getPaymentStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [total, successCount, failedCount] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'SUCCESS' }),
      Payment.countDocuments({ status: 'FAILED' }),
    ]);
    const successRate = total > 0 ? (successCount / total) * 100 : 0;
    res.json({ success: true, data: { total, successCount, failedCount, successRate: Number(successRate.toFixed(2)) } });
  } catch (err: unknown) { handleError(err, res); }
};
