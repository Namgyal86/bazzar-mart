import axios from 'axios';
import crypto from 'crypto';
import { env } from '../../../config/env';

const BASE_URL = env.NODE_ENV === 'production'
  ? 'https://clientapi.fonepay.com/api/merchantRequest'
  : 'https://dev-clientapi.fonepay.com/api/merchantRequest';

export interface FonepayVerifyResponse {
  SUCCESS:     string; // "true" | "false"
  ERROR_CODE?: string;
  MESSAGE?:    string;
}

function buildSignature(prn: string, merchantCode: string, amount: number, secretKey: string): string {
  const data = `${prn},${merchantCode},${amount}`;
  return crypto.createHmac('md5', secretKey).update(data).digest('hex').toUpperCase();
}

export async function fonepayVerify(
  prn: string,
  amount: number,
): Promise<FonepayVerifyResponse> {
  const merchantCode = env.FONEPAY_MERCHANT_CODE ?? 'DEVTEST';
  const secretKey    = env.FONEPAY_SECRET_KEY ?? '';

  // Dev mock: no keys configured
  if (!env.FONEPAY_SECRET_KEY && env.NODE_ENV !== 'production') {
    return { SUCCESS: 'true' };
  }

  const signature = buildSignature(prn, merchantCode, amount, secretKey);

  const { data } = await axios.get<FonepayVerifyResponse>(BASE_URL, {
    params: {
      PRN:                  prn,
      MERCHANTCODE:         merchantCode,
      MERCHANTDIGITALSIGN:  signature,
      P_AMT:                amount,
      R_AMT:                amount,
    },
  });

  return data;
}

export function isFonepaySuccess(response: FonepayVerifyResponse): boolean {
  return response.SUCCESS === 'true';
}
