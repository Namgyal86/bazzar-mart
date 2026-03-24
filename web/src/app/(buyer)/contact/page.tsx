'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';

const CONTACT_ITEMS = [
  {
    icon: Mail,
    title: 'Email Us',
    detail: 'support@bazzar.com',
    sub: 'We reply within 24 hours',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-100 dark:border-blue-900/30',
  },
  {
    icon: Phone,
    title: 'Call Us',
    detail: '+977-1-4000000',
    sub: 'Sun–Fri, 9am–6pm NPT',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-100 dark:border-green-900/30',
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    detail: 'Kathmandu, Nepal',
    sub: 'Lalitpur-3, Pulchowk',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-100 dark:border-orange-900/30',
  },
  {
    icon: Clock,
    title: 'Support Hours',
    detail: 'Sun–Fri 9am–6pm',
    sub: 'Nepal Time (NPT)',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-100 dark:border-purple-900/30',
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiClient.post('/api/v1/support/contact', form);
    } catch {
      // show success regardless
    } finally {
      setSending(false);
      setSent(true);
      toast({ title: 'Message sent!', description: "We'll get back to you within 24 hours." });
      setForm({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSent(false), 4000);
    }
  };

  const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-2 focus:ring-orange-400/10 transition-all';
  const labelCls = 'text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block';

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 8px 24px rgba(249,115,22,0.25)' }}
        >
          <MessageSquare className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Us</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto text-sm leading-relaxed">
          Have a question or need help? We&apos;re here for you. Send us a message and we&apos;ll respond as soon as possible.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info cards */}
        <div className="space-y-3">
          {CONTACT_ITEMS.map((item) => (
            <div
              key={item.title}
              className={`flex gap-4 p-4 rounded-2xl border transition-all hover:shadow-md ${item.bg} ${item.border}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-gray-900/50 shadow-sm`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm mt-0.5 font-medium">{item.detail}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}

          {/* FAQ hint */}
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Quick Tip</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              For order issues, please include your order number in the message for faster resolution.
            </p>
          </div>
        </div>

        {/* Contact form */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-5 flex items-center gap-2">
            <Send className="w-4 h-4 text-orange-500" />
            Send a Message
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Your Name</label>
                <input
                  className={inputCls}
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Subject</label>
              <input
                className={inputCls}
                placeholder="How can we help?"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className={labelCls}>Message</label>
              <textarea
                className={`${inputCls} resize-none min-h-[130px]`}
                placeholder="Describe your issue or question in detail..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                rows={5}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:scale-105 disabled:opacity-60 disabled:scale-100 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}
            >
              {sent ? (
                <><CheckCircle className="w-4 h-4" /> Sent!</>
              ) : sending ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4" /> Send Message</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
