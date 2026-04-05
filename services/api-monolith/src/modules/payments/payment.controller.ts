/**
 * Payments module controller.
 *
 * Key change from payment-service:
 *   `emitPaymentResult` now:
 *     1. Saves payment record.
 *     2. Emits internalBus PAYMENT_SUCCESS/FAILED → orders + sellers modules react in-process.
 *     3. Publishes Kafka payment.success/failed → analytics-service + notification-service.
 */
import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { Payment, IPayment } from './models/payment.model';
import { publishEvent } from '../../kafka/producer';
import { internalBus, EVENTS } from '../../shared/events/emitter';
import { env } from '../../config/env';
import {
  khaltiInitiate, khaltiLookup, toKhaltiPaisa,
  isKhaltiSuccess, khaltiErrorMessage,
} from './services/khalti.service';
import {
  buildEsewaFormData, decodeEsewaCallbackData,
  verifyEsewaCallbackSignature, checkEsewaStatus,
  isEsewaSuccess, ESEWA_FORM_URL,
} from './services/esewa.service';

// ── Shared helper ─────────────────────────────────────────────────────────────

async function emitPaymentResult(
  payment:         IPayment,
  status:          'SUCCESS' | 'FAILED',
  transactionId?:  string,
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
    // In-process: orders module + sellers module listen to this
    internalBus.emit(EVENTS.PAYMENT_SUCCESS, { ...basePayload, sellerId: '' });
    // External: analytics-service + notification-service via Kafka
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
      try {
        const khaltiRes = await khaltiInitiate({
          return_url:          returnUrl ?? `${env.WEB_URL}/payment/verify`,
          website_url:         env.WEB_URL,
          amount:              toKhaltiPaisa(amount),
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
      const successUrl = `${env.API_BASE_URL}/api/v1/payments/esewa/callback`;
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
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

// ── Khalti browser callback ───────────────────────────────────────────────────

export const khaltiCallback = async (req: Request, res: Response): Promise<void> => {
  const { pidx, purchase_order_id: orderId } = req.query as Record<string, string>;
  const webUrl = env.WEB_URL;
  if (!pidx || !orderId) { res.redirect(`${webUrl}/payment/failed?reason=missing_params`); return; }
  try {
    const payment = await Payment.findOne({ orderId });
    if (!payment) { res.redirect(`${webUrl}/payment/failed?reason=not_found&orderId=${orderId}`); return; }
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

// ── Frontend verify (after redirect) ─────────────────────────────────────────

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pidx, orderId, gateway } = req.body as { pidx?: string; orderId: string; gateway: string };
    const payment = await Payment.findOne({ orderId });
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found' }); return; }
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
    } else {
      await emitPaymentResult(payment, 'SUCCESS');
    }
    res.json({ success: true, data: payment });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

// ── Read ──────────────────────────────────────────────────────────────────────

export const getPaymentByOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: payment });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
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
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};
