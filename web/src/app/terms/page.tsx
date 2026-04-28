'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSiteSettingsStore } from '@/store/site-settings.store';

const SECTIONS_TEMPLATE = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account or using the {SITE} platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.`,
  },
  {
    title: '2. Use of the Platform',
    body: `{SITE} provides an online marketplace connecting buyers and sellers in Nepal. You agree to use the platform only for lawful purposes and in a manner that does not infringe the rights of others or restrict or inhibit anyone else's use of the platform.`,
  },
  {
    title: '3. Account Registration',
    body: `You must provide accurate, complete, and current information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorised use of your account.`,
  },
  {
    title: '4. Orders and Payments',
    body: `All orders placed through {SITE} are subject to availability and confirmation. Prices are listed in Nepalese Rupees (NPR). We accept payments via Khalti, eSewa, and other supported gateways. {SITE} reserves the right to cancel or refuse any order at our discretion.`,
  },
  {
    title: '5. Delivery',
    body: `Estimated delivery times are provided at checkout and may vary based on location and product availability. {SITE} is not liable for delays caused by circumstances beyond our reasonable control, including weather events or public disruptions.`,
  },
  {
    title: '6. Returns and Refunds',
    body: `If you receive a damaged, defective, or incorrect item, please contact our support team within 48 hours of delivery. Refunds and replacements are processed in accordance with our Return Policy, which is incorporated into these Terms by reference.`,
  },
  {
    title: '7. Intellectual Property',
    body: `All content on the {SITE} platform — including text, graphics, logos, and software — is the property of {SITE} or its content suppliers and is protected by applicable intellectual property laws. You may not reproduce or distribute any content without prior written permission.`,
  },
  {
    title: '8. Limitation of Liability',
    body: `To the maximum extent permitted by law, {SITE} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform or inability to use the platform. Our total liability shall not exceed the amount you paid for the relevant order.`,
  },
  {
    title: '9. Changes to Terms',
    body: `{SITE} reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting to the platform. Your continued use of {SITE} after any changes constitutes acceptance of the new Terms.`,
  },
  {
    title: '10. Governing Law',
    body: `These Terms are governed by and construed in accordance with the laws of Nepal. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Nepal.`,
  },
  {
    title: '11. Contact Us',
    body: `If you have any questions about these Terms, please contact us at {EMAIL} or through the Help Centre on our platform.`,
  },
];

export default function TermsPage() {
  const { settings } = useSiteSettingsStore();
  const siteName = settings.siteName || 'Bazzar';
  const email = settings.email || 'support@bazzar.com';

  const sections = SECTIONS_TEMPLATE.map((s) => ({
    ...s,
    body: s.body.replace(/\{SITE\}/g, siteName).replace(/\{EMAIL\}/g, email),
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

        <h1 className="text-4xl font-black text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: April 2025</p>

        <p className="text-gray-400 leading-relaxed mb-10">
          Welcome to {siteName} — Nepal&apos;s online grocery &amp; mart marketplace. Please read these Terms of Service carefully before using our platform.
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
            I Agree — Back to Register
          </Link>
        </div>
      </div>
    </div>
  );
}
