import sgMail from '@sendgrid/mail';
import { env } from '../../config/env';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) {
    console.warn('[email] SendGrid not configured — skipping email to:', to);
    return;
  }
  await sgMail.send({ to, from: env.SENDGRID_FROM_EMAIL, subject, text });
}
