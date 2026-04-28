'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSiteSettingsStore } from '@/store/site-settings.store';

const SECTIONS_TEMPLATE = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly to us when you register, place an order, or contact support. This includes your name, email address, phone number, delivery address, and payment information (processed securely by our payment partners — we do not store raw card data). We also collect usage data such as pages visited, search queries, and device information.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to: process and fulfil your orders; send order confirmations, delivery updates, and support messages; personalise your shopping experience; improve our platform; comply with legal obligations; and, with your consent, send promotional communications about offers and new products.`,
  },
  {
    title: '3. Sharing Your Information',
    body: `We do not sell your personal data. We share your information only with: delivery partners (name, address, phone) to complete your order; payment gateways (Khalti, eSewa) to process transactions; cloud and analytics providers under strict data-processing agreements; and law-enforcement authorities when required by Nepalese law.`,
  },
  {
    title: '4. Referral Programme',
    body: `If you participate in our referral programme, your referral code may be shared with the person you referred to attribute the reward. No other personal details are disclosed to referees.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your account information for as long as your account is active or as needed to provide services. Order records are kept for seven years for accounting and legal compliance. You may request deletion of your account at any time; some data may be retained to meet legal obligations.`,
  },
  {
    title: '6. Cookies and Tracking',
    body: `{SITE} uses cookies and similar technologies to keep you logged in, remember your cart, and analyse site traffic. You can control cookie preferences through your browser settings; disabling certain cookies may affect platform functionality.`,
  },
  {
    title: '7. Security',
    body: `We employ industry-standard security measures including HTTPS encryption, hashed passwords, and access controls to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: '8. Your Rights',
    body: `You have the right to access, correct, or delete your personal data. You may also object to or restrict certain processing. To exercise these rights, contact us at {EMAIL}. We will respond within 30 days.`,
  },
  {
    title: "9. Children's Privacy",
    body: `{SITE} is not intended for children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by a prominent notice on the platform. Continued use of {SITE} after changes take effect constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Contact Us',
    body: `For privacy-related questions or requests, please email {EMAIL} or write to: {SITE} Privacy Team, {ADDRESS}.`,
  },
];

export default function PrivacyPage() {
  const { settings } = useSiteSettingsStore();
  const siteName = settings.siteName || 'Bazzar';
  const email = settings.email || 'privacy@bazzar.com';
  const address = settings.address || 'Kathmandu, Nepal';

  const sections = SECTIONS_TEMPLATE.map((s) => ({
    ...s,
    body: s.body
      .replace(/\{SITE\}/g, siteName)
      .replace(/\{EMAIL\}/g, email)
      .replace(/\{ADDRESS\}/g, address),
  }));

  return (
    <div className="min-h-screen" style={{ background: '#060810', color: '#e5e7eb' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-10 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Register
        </Link>

        <h1 className="text-4xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: April 2025</p>

        <p className="text-gray-400 leading-relaxed mb-10">
          Your privacy matters to us. This policy explains what personal data {siteName} collects, how we use it, and the choices you have.
        </p>

        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-white mb-2">{s.title}</h2>
              <p className="text-gray-400 leading-relaxed text-sm">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
          >
            Back to Register
          </Link>
        </div>
      </div>
    </div>
  );
}
