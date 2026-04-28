'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { apiClient } from '@/lib/api/client';
import {
  Store,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  FileText,
  Eye,
  EyeOff,
  CheckCircle,
  ChevronRight,
  Briefcase,
  TrendingUp,
  Zap,
  ShieldCheck,
  DollarSign,
  Clock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSiteSettingsStore } from '@/store/site-settings.store';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Step1 {
  storeName: string;
  businessType: string;
  phone: string;
  city: string;
  description: string;
  physicalAddress: string;
  physicalDistrict: string;
  physicalLandmark: string;
}

interface Step2 {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type FieldError = Partial<Record<keyof Step1 | keyof Step2, string>>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  'Retail',
  'Wholesale',
  'Manufacturer',
  'Dropshipper',
  'Handmade / Crafts',
  'Digital Products',
  'Food & Beverage',
  'Other',
];

function validateStep1(data: Step1): FieldError {
  const errors: FieldError = {};
  if (!data.storeName.trim() || data.storeName.trim().length < 2)
    errors.storeName = 'Store name must be at least 2 characters';
  if (!data.businessType) errors.businessType = 'Please select a business type';
  if (!/^9[6-9]\d{8}$/.test(data.phone))
    errors.phone = 'Enter a valid Nepal phone number (e.g. 98XXXXXXXX)';
  if (!data.city.trim()) errors.city = 'City is required';
  return errors;
}

function validateStep2(data: Step2): FieldError {
  const errors: FieldError = {};
  if (!data.firstName.trim() || data.firstName.trim().length < 2)
    errors.firstName = 'At least 2 characters';
  if (!data.lastName.trim() || data.lastName.trim().length < 2)
    errors.lastName = 'At least 2 characters';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = 'Invalid email address';
  if (data.password.length < 8) errors.password = 'At least 8 characters';
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = 'Passwords do not match';
  return errors;
}

// ── Benefits constant ──────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: <Store className="w-5 h-5" style={{ color: 'var(--ap)' }} />,
    title: 'Huge Reach',
    text: 'Sell to 10,000+ active buyers across Nepal every day.',
  },
  {
    icon: <DollarSign className="w-5 h-5" style={{ color: 'var(--ap)' }} />,
    title: 'Low Commission',
    text: 'Keep more of what you earn with our 30% flat commission.',
  },
  {
    icon: <Clock className="w-5 h-5" style={{ color: 'var(--ap)' }} />,
    title: 'Fast Payouts',
    text: 'Get your earnings deposited within 48 hours of a sale.',
  },
];

// ── Shared field wrapper ───────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: '6px',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#f87171',
            marginTop: '4px',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ── Shared input style helper ──────────────────────────────────────────────────

function inputStyle(hasError?: string): React.CSSProperties {
  return {
    width: '100%',
    height: '44px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${hasError ? '#f87171' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '10px',
    padding: '0 12px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0',
        marginBottom: '28px',
      }}
    >
      {[1, 2].map((step) => {
        const isCompleted = step < current;
        const isActive = step === current;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Circle */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                flexShrink: 0,
                background: isCompleted
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : isActive
                  ? 'linear-gradient(135deg, var(--ap), var(--as))'
                  : 'rgba(255,255,255,0.07)',
                border: isActive
                  ? '2px solid hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.4)'
                  : isCompleted
                  ? '2px solid rgba(34,197,94,0.4)'
                  : '2px solid rgba(255,255,255,0.12)',
                color: isCompleted || isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                boxShadow: isActive
                  ? '0 0 16px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.35)'
                  : isCompleted
                  ? '0 0 12px rgba(34,197,94,0.25)'
                  : 'none',
                transition: 'all 0.3s',
              }}
            >
              {isCompleted ? <CheckCircle style={{ width: '16px', height: '16px' }} /> : step}
            </div>

            {/* Connector line between steps */}
            {step < 2 && (
              <div
                style={{
                  width: '64px',
                  height: '2px',
                  background:
                    step < current
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : 'rgba(255,255,255,0.08)',
                  margin: '0 4px',
                  transition: 'background 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SellerRegisterPage() {
  const router = useRouter();
  const { settings } = useSiteSettingsStore();
  const siteName = settings.siteName || 'Bazzar';
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [step1, setStep1] = useState<Step1>({
    storeName: '',
    businessType: '',
    phone: '',
    city: '',
    description: '',
    physicalAddress: '',
    physicalDistrict: 'Kathmandu',
    physicalLandmark: '',
  });

  const [step2, setStep2] = useState<Step2>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStep1Change = (field: keyof Step1, value: string) => {
    setStep1((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStep2Change = (field: keyof Step2, value: string) => {
    setStep2((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNext = () => {
    const errs = validateStep1(step1);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep2(step2);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.register({
        firstName: step2.firstName,
        lastName: step2.lastName,
        email: step2.email,
        password: step2.password,
        phone: step1.phone,
        role: 'SELLER',
      });

      // Cookie set by /api/auth/register — apiClient sends it automatically
      await apiClient.post('/api/v1/seller/apply', {
        storeName: step1.storeName,
        description: step1.description,
        phone: step1.phone,
        city: step1.city,
        businessType: step1.businessType,
        email: step2.email,
        physicalLocation: {
          address:  step1.physicalAddress,
          district: step1.physicalDistrict,
          landmark: step1.physicalLandmark,
        },
      });

      setSubmitError(null);
      toast({
        title: 'Seller account created!',
        description: `Welcome to ${siteName} Seller Hub.`,
      });
      router.push('/seller/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        'Something went wrong. Please try again.';
      setSubmitError(message);
      toast({ title: 'Registration failed', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060810',
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Aurora background orbs */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '700px',
            height: '700px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '30%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* ── Left panel (desktop only) ── */}
      <div
        style={{
          width: '40%',
          background: 'linear-gradient(135deg, #0d1117, #131929)',
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 48px',
          position: 'relative',
          zIndex: 1,
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
        className="left-panel-desktop"
      >
        {/* Subtle grid lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Brand */}
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              marginBottom: '48px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--ap), var(--as))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.4)',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem' }}>{siteName[0]}</span>
            </div>
            <span
              style={{
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.6rem',
                letterSpacing: '-0.02em',
              }}
            >
              {siteName}
            </span>
          </Link>

          {/* Headline */}
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '16px',
              letterSpacing: '-0.03em',
            }}
          >
            <span style={{ color: '#fff' }}>Start Selling</span>
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, var(--ap), var(--as))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              on {siteName}
            </span>
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '40px',
            }}
          >
            Join thousands of sellers growing their business on Nepal&apos;s fastest-growing
            marketplace.
          </p>

          {/* Benefit cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '48px' }}>
            {BENEFITS.map((b, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {b.icon}
                </div>
                <div>
                  <p
                    style={{
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      marginBottom: '2px',
                    }}
                  >
                    {b.title}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {b.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '28px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              paddingTop: '28px',
            }}
          >
            {[
              { value: '10K+', label: 'Sellers' },
              { value: '30%', label: 'Commission' },
              { value: '48h', label: 'Payouts' },
            ].map((s) => (
              <div key={s.label}>
                <p
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, var(--ap), var(--as))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '4px' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '480px' }}>
          {/* Mobile brand (hidden on desktop via CSS) */}
          <div
            className="mobile-brand"
            style={{ textAlign: 'center', marginBottom: '28px' }}
          >
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, var(--ap), var(--as))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.35)',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>{siteName[0]}</span>
              </div>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
                {siteName}
              </span>
            </Link>
          </div>

          {/* Form card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '36px 32px',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Card header */}
            <div style={{ marginBottom: '6px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.1)',
                  border: '1px solid hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.2)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  marginBottom: '14px',
                }}
              >
                <Briefcase style={{ width: '13px', height: '13px', color: 'var(--ap)' }} />
                <span style={{ color: 'var(--ap)', fontSize: '0.75rem', fontWeight: 600 }}>
                  Seller Hub
                </span>
              </div>
              <h2
                style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.4rem',
                  letterSpacing: '-0.02em',
                  marginBottom: '4px',
                }}
              >
                {step === 1 ? 'Business Details' : 'Account Credentials'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                {step === 1
                  ? 'Tell us about your store'
                  : 'Secure your seller account'}
              </p>
            </div>

            {/* Step indicator */}
            <div style={{ marginTop: '24px' }}>
              <StepIndicator current={step} />
            </div>

            {/* ── Step 1: Business Info ── */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Field label="Store Name" error={errors.storeName}>
                  <div style={{ position: 'relative' }}>
                    <Store
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: 'rgba(255,255,255,0.3)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      placeholder="My Awesome Store"
                      value={step1.storeName}
                      onChange={(e) => handleStep1Change('storeName', e.target.value)}
                      style={{ ...inputStyle(errors.storeName), paddingLeft: '38px' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ap)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.storeName
                          ? '#f87171'
                          : 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </Field>

                <Field label="Business Type" error={errors.businessType}>
                  <select
                    value={step1.businessType}
                    onChange={(e) => handleStep1Change('businessType', e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${errors.businessType ? '#f87171' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '10px',
                      padding: '0 12px',
                      color: step1.businessType ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--ap)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.businessType
                        ? '#f87171'
                        : 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="" style={{ background: '#1a1f2e', color: 'rgba(255,255,255,0.4)' }}>
                      Select a business type…
                    </option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t} style={{ background: '#1a1f2e', color: '#fff' }}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Phone Number" error={errors.phone}>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: 'rgba(255,255,255,0.3)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="tel"
                      placeholder="98XXXXXXXX"
                      value={step1.phone}
                      onChange={(e) => handleStep1Change('phone', e.target.value)}
                      style={{ ...inputStyle(errors.phone), paddingLeft: '38px' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ap)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.phone
                          ? '#f87171'
                          : 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </Field>

                <Field label="City" error={errors.city}>
                  <div style={{ position: 'relative' }}>
                    <MapPin
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: 'rgba(255,255,255,0.3)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      placeholder="Kathmandu"
                      value={step1.city}
                      onChange={(e) => handleStep1Change('city', e.target.value)}
                      style={{ ...inputStyle(errors.city), paddingLeft: '38px' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ap)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.city
                          ? '#f87171'
                          : 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </Field>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin style={{ width: '14px', height: '14px', color: 'var(--ap)' }} />
                    Physical Store Location
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Field label="Store Address">
                      <div style={{ position: 'relative' }}>
                        <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                        <input
                          placeholder="e.g. New Road, Kathmandu"
                          value={step1.physicalAddress}
                          onChange={e => handleStep1Change('physicalAddress', e.target.value)}
                          style={{ ...inputStyle(), paddingLeft: '38px' }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--ap)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                      </div>
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <Field label="District">
                        <select
                          value={step1.physicalDistrict}
                          onChange={e => handleStep1Change('physicalDistrict', e.target.value)}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0 12px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const, cursor: 'pointer' }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--ap)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                          {['Kathmandu', 'Lalitpur', 'Bhaktapur'].map(d => (
                            <option key={d} value={d} style={{ background: '#1a1f2e' }}>{d}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Landmark (optional)">
                        <input
                          placeholder="e.g. Near Ratna Park"
                          value={step1.physicalLandmark}
                          onChange={e => handleStep1Change('physicalLandmark', e.target.value)}
                          style={inputStyle()}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--ap)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <Field label="Store Description (optional)">
                  <div style={{ position: 'relative' }}>
                    <FileText
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '12px',
                        width: '16px',
                        height: '16px',
                        color: 'rgba(255,255,255,0.3)',
                        pointerEvents: 'none',
                      }}
                    />
                    <textarea
                      rows={3}
                      placeholder="Tell buyers what you sell…"
                      value={step1.description}
                      onChange={(e) => handleStep1Change('description', e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 38px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        lineHeight: 1.5,
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ap)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </Field>

                {/* Next button */}
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    width: '100%',
                    height: '48px',
                    background: 'linear-gradient(135deg, var(--ap), var(--as))',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 20px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.35)',
                    transition: 'opacity 0.2s, transform 0.1s',
                    marginTop: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Continue to Credentials
                  <ChevronRight style={{ width: '17px', height: '17px' }} />
                </button>
              </div>
            )}

            {/* ── Step 2: Account Info ── */}
            {step === 2 && (
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                suppressHydrationWarning
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="First Name" error={errors.firstName}>
                    <div style={{ position: 'relative' }}>
                      <User
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '15px',
                          height: '15px',
                          color: 'rgba(255,255,255,0.3)',
                          pointerEvents: 'none',
                        }}
                      />
                      <input
                        placeholder="John"
                        value={step2.firstName}
                        onChange={(e) => handleStep2Change('firstName', e.target.value)}
                        style={{ ...inputStyle(errors.firstName), paddingLeft: '36px' }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--ap)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = errors.firstName
                            ? '#f87171'
                            : 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </Field>
                  <Field label="Last Name" error={errors.lastName}>
                    <input
                      placeholder="Doe"
                      value={step2.lastName}
                      onChange={(e) => handleStep2Change('lastName', e.target.value)}
                      style={inputStyle(errors.lastName)}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ap)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.lastName
                          ? '#f87171'
                          : 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </Field>
                </div>

                <Field label="Email Address" error={errors.email}>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: 'rgba(255,255,255,0.3)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={step2.email}
                      onChange={(e) => handleStep2Change('email', e.target.value)}
                      style={{ ...inputStyle(errors.email), paddingLeft: '38px' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ap)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.email
                          ? '#f87171'
                          : 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </Field>

                <Field label="Password" error={errors.password}>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: 'rgba(255,255,255,0.3)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={step2.password}
                      onChange={(e) => handleStep2Change('password', e.target.value)}
                      style={{ ...inputStyle(errors.password), paddingLeft: '38px', paddingRight: '42px' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ap)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.password
                          ? '#f87171'
                          : 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'rgba(255,255,255,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showPassword ? (
                        <EyeOff style={{ width: '16px', height: '16px' }} />
                      ) : (
                        <Eye style={{ width: '16px', height: '16px' }} />
                      )}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm Password" error={errors.confirmPassword}>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: 'rgba(255,255,255,0.3)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={step2.confirmPassword}
                      onChange={(e) => handleStep2Change('confirmPassword', e.target.value)}
                      style={{
                        ...inputStyle(errors.confirmPassword),
                        paddingLeft: '38px',
                        paddingRight: '42px',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ap)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.confirmPassword
                          ? '#f87171'
                          : 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'rgba(255,255,255,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showConfirm ? (
                        <EyeOff style={{ width: '16px', height: '16px' }} />
                      ) : (
                        <Eye style={{ width: '16px', height: '16px' }} />
                      )}
                    </button>
                  </div>
                </Field>

                {submitError && (
                  <p style={{ fontSize: '12px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠</span> {submitError}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setStep(1);
                    }}
                    style={{
                      flex: 1,
                      height: '48px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: 'rgba(255,255,255,0.7)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }}
                  >
                    Back
                  </button>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      flex: 2,
                      height: '48px',
                      background: isSubmitting
                        ? 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.5)'
                        : 'linear-gradient(135deg, var(--ap), var(--as))',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: isSubmitting ? 'none' : '0 4px 20px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.35)',
                      transition: 'opacity 0.2s, transform 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="3"
                          />
                          <path
                            d="M12 2a10 10 0 0 1 10 10"
                            stroke="#fff"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </svg>
                        Creating Account…
                      </>
                    ) : (
                      <>
                        <ShieldCheck style={{ width: '16px', height: '16px' }} />
                        Create Seller Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Footer links */}
            <p
              style={{
                textAlign: 'center',
                fontSize: '0.83rem',
                color: 'rgba(255,255,255,0.35)',
                marginTop: '24px',
              }}
            >
              Already have an account?{' '}
              <Link
                href="/auth/login"
                style={{
                  color: 'var(--ap)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            </p>
          </div>

          <p
            style={{
              textAlign: 'center',
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.25)',
              marginTop: '16px',
            }}
          >
            Shopping instead?{' '}
            <Link
              href="/auth/register"
              style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500, textDecoration: 'none' }}
            >
              Create a buyer account →
            </Link>
          </p>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (min-width: 900px) {
          .left-panel-desktop {
            display: flex !important;
          }
          .mobile-brand {
            display: none !important;
          }
        }
        input::placeholder,
        textarea::placeholder {
          color: rgba(255,255,255,0.25);
        }
        select option {
          background: #1a1f2e;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
