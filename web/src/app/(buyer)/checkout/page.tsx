'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  MapPin,
  CreditCard,
  CheckCircle,
  Wallet,
  Plus,
  X,
  Tag,
  Lock,
  ShieldCheck,
  Truck,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart.store';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { orderApi } from '@/lib/api/order.api';
import { useAuthStore } from '@/store/auth.store';
import { userApi, Address } from '@/lib/api/user.api';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import { paymentApi } from '@/lib/api/payment.api';

type Step = 'address' | 'payment' | 'confirm';

const KhaltiLogo = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <rect width="48" height="48" rx="10" fill="#5C2D91"/>
    <path d="M14 12h5v10.5l8-10.5h6.5L24 24l10.5 12H28L19 25.5V36h-5V12z" fill="white"/>
  </svg>
);

const EsewaLogo = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <rect width="48" height="48" rx="10" fill="#60BB46"/>
    <path d="M24 10c-7.73 0-14 6.27-14 14s6.27 14 14 14 14-6.27 14-14S31.73 10 24 10zm-2 20.5c-4.14 0-7.5-3.36-7.5-7.5 0-3.9 2.98-7.1 6.8-7.46v3.02A4.51 4.51 0 0019.5 23c0 2.49 2.01 4.5 4.5 4.5.77 0 1.5-.2 2.13-.54l2.12 2.13A7.46 7.46 0 0122 30.5zm7.46-4.13l-2.12-2.12c.43-.72.66-1.55.66-2.25 0-1.24-.5-2.36-1.3-3.18V16c3.56.87 6.3 3.9 6.3 7.5 0 1.06-.22 2.07-.6 2.98l-.94-.11z" fill="white"/>
  </svg>
);

const FonepayLogo = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <rect width="48" height="48" rx="10" fill="#E8232A"/>
    <path d="M16 14h16a2 2 0 012 2v16a2 2 0 01-2 2H16a2 2 0 01-2-2V16a2 2 0 012-2zm0 2v16h16V16H16zm8 2a6 6 0 110 12A6 6 0 0124 18zm0 2a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z" fill="white"/>
  </svg>
);

const PAYMENT_METHODS: Array<{
  id: string; name: string; desc: string;
  logo: ReactNode; badge: string | null;
}> = [
  { id: 'khalti',  name: 'Khalti',             desc: 'Pay via Khalti wallet',   logo: <KhaltiLogo />,  badge: 'Popular' },
  { id: 'esewa',   name: 'eSewa',              desc: 'Pay via eSewa wallet',    logo: <EsewaLogo />,   badge: 'Popular' },
  { id: 'fonepay', name: 'Fonepay QR',       desc: 'Bank QR payment',    logo: <FonepayLogo />, badge: null },
  { id: 'cod',     name: 'Cash on Delivery', desc: 'Pay when delivered', logo: <span className="text-2xl">💵</span>, badge: null },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalAmount, clearCart, fetchCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const [step, setStep]                       = useState<Step>('address');
  const [addresses, setAddresses]             = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('khalti');
  const [couponCode, setCouponCode]           = useState('');
  const [couponApplied, setCouponApplied]     = useState(false);
  const [couponDiscount, setCouponDiscount]   = useState(0);
  const [isPlacing, setIsPlacing]             = useState(false);
  const [showAddAddress, setShowAddAddress]   = useState(false);
  const [newAddress, setNewAddress]           = useState({
    fullName: '', phone: '', addressLine1: '', city: '', district: '', province: 'Bagmati',
  });
  const [addingAddress, setAddingAddress] = useState(false);
  const submittingRef = useRef(false);

  const subtotal              = totalAmount();
  const shipping              = subtotal > 1000 ? 0 : 100;
  const total                 = subtotal + shipping - couponDiscount;
  const freeShippingThreshold = 1000;
  const freeShippingProgress  = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  // Sync cart from server on mount. Use fetchCart (not cartApi.get directly) so
  // backend field names (_id, price, name) are normalized to CartItem shape before
  // being stored — otherwise unitPrice is undefined and totalAmount() returns NaN.
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCart();
  }, [isAuthenticated, fetchCart]);

  useEffect(() => {
    if (user) {
      userApi.getAddresses()
        .then(res => {
          const data = res.data?.data ?? [];
          if (Array.isArray(data)) {
            const mapped = data.map((a: any) => ({
              id:        a._id,
              label:     a.label || 'Address',
              name:      a.fullName,
              address:   `${a.addressLine1}, ${a.city}`,
              phone:     a.phone,
              isDefault: a.isDefault,
            }));
            setAddresses(mapped);
            const def = mapped.find((a: any) => a.isDefault) || mapped[0];
            if (def) setSelectedAddress(def.id);
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAddress(true);
    try {
      const res = await userApi.addAddress({
        ...newAddress,
        label:     'Home',
        isDefault: addresses.length === 0,
      });
      const a      = (res.data as any)?.data;
      const mapped = {
        id:        a._id,
        label:     a.label || 'Home',
        name:      a.fullName,
        address:   `${a.addressLine1}, ${a.city}`,
        phone:     a.phone,
        isDefault: a.isDefault,
      };
      setAddresses(prev => [...prev, mapped]);
      setSelectedAddress(mapped.id);
      setShowAddAddress(false);
      setNewAddress({ fullName: '', phone: '', addressLine1: '', city: '', district: '', province: 'Bagmati' });
      toast({ title: 'Address added!' });
    } catch (err) {
      toast({ title: 'Failed to add address', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setAddingAddress(false);
    }
  };

  const placeOrder = async () => {
    if (items.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' });
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsPlacing(true);
    try {
      const addr      = addresses.find(a => a.id === selectedAddress);
      const addrParts = addr?.address.split(', ') ?? ['Kathmandu', 'Kathmandu'];

      // Reuse a pending order if the user returned from a payment gateway without completing payment.
      // This avoids creating a duplicate order and double-decrementing stock.
      const pendingOrderId = typeof window !== 'undefined'
        ? sessionStorage.getItem('pendingOrderId')
        : null;

      let orderId = pendingOrderId;

      if (!orderId) {
        const orderRes = await orderApi.create({
          items: items.map(i => ({
            productId:    i.productId,
            productName:  i.productName,
            productImage: i.productImage || '',
            sellerId:     i.sellerId ?? '',
            sellerName:   i.sellerName,
            unitPrice:    i.unitPrice,
            quantity:     i.quantity,
          })),
          shippingAddress: {
            fullName:     addr?.name ?? 'Guest',
            phone:        addr?.phone ?? '',
            addressLine1: addrParts[0] ?? addr?.address ?? '',
            city:         addrParts[1] ?? 'Kathmandu',
            district:     'Kathmandu',
            province:     'Bagmati',
          },
          paymentMethod: selectedPayment.toUpperCase(),
          couponCode:    couponApplied ? couponCode : undefined,
        }) as any;
        orderId = orderRes?.data?.data?._id || orderRes?.data?.data?.id;
      }

      // For COD — no gateway redirect needed
      if (selectedPayment === 'cod') {
        sessionStorage.removeItem('pendingOrderId');
        await clearCart();
        toast({ title: 'Order placed successfully!', description: 'Your order is confirmed.' });
        router.push(orderId ? `/order/success/${orderId}` : '/account/orders');
        return;
      }

      // For Khalti / eSewa / Fonepay — initiate payment and redirect
      if (['khalti', 'esewa', 'fonepay'].includes(selectedPayment) && orderId) {
        const payRes = await paymentApi.initiate(orderId, selectedPayment.toUpperCase(), total) as any;
        const payData = payRes?.data?.data;

        if (payData?.redirect) {
          // Save orderId so we can reuse it if the user abandons payment and returns.
          // Do NOT clear the cart here — clear it only after successful payment (on the success page).
          sessionStorage.setItem('pendingOrderId', orderId);
          window.location.href = payData.redirect;
          return;
        }

        if (payData?.method === 'KHALTI_DEV_MOCK') {
          sessionStorage.removeItem('pendingOrderId');
          await clearCart();
          toast({ title: 'Order placed (dev mock)', description: 'Khalti key not configured — payment auto-approved.' });
          router.push(orderId ? `/order/success/${orderId}` : '/account/orders');
          return;
        }

        if (payData?.method === 'ESEWA' && payData?.esewaData) {
          sessionStorage.setItem('pendingOrderId', orderId);
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = payData.formUrl || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
          Object.entries(payData.esewaData as Record<string, unknown>).forEach(([k, v]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = String(v);
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
          return;
        }

        if (payData?.method === 'FONEPAY' && payData?.qrData) {
          sessionStorage.setItem('pendingOrderId', orderId);
          const { prn, amount: qrAmount } = payData.qrData as { prn: string; amount: number };
          router.push(`/payment/fonepay?prn=${encodeURIComponent(prn)}&amount=${qrAmount}&orderId=${orderId}`);
          return;
        }

        // Dev fallback (no real keys) — treat as success
        sessionStorage.removeItem('pendingOrderId');
        await clearCart();
        toast({ title: 'Order placed successfully!', description: 'Your order is confirmed.' });
        router.push(orderId ? `/order/success/${orderId}` : '/account/orders');
        return;
      }

      sessionStorage.removeItem('pendingOrderId');
      await clearCart();
      toast({ title: 'Order placed successfully!', description: 'Your order is confirmed.' });
      router.push(orderId ? `/order/success/${orderId}` : '/account/orders');
    } catch (err) {
      toast({ title: 'Order failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      submittingRef.current = false;
      setIsPlacing(false);
    }
  };

  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'address', label: 'Address', num: 1 },
    { key: 'payment', label: 'Payment', num: 2 },
    { key: 'confirm', label: 'Confirm', num: 3 },
  ];
  const stepIndex = steps.findIndex(s => s.key === step);

  /* ─────────────────────────────────── INPUT CLASSNAME ──────────────────────────────── */
  const inputCls =
    'w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 rounded-xl text-sm text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 dark:focus:border-orange-500 transition-all duration-200';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="container mx-auto px-4 py-10 max-w-6xl">

        {/* ── PAGE HEADER ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Checkout
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Complete your purchase in just a few steps
          </p>
        </div>

        {/* ── STEP INDICATOR ── */}
        <div className="flex items-center justify-center mb-10 select-none">
          {steps.map((s, idx) => {
            const isCompleted = stepIndex > idx;
            const isActive    = stepIndex === idx;
            return (
              <div key={s.key} className="flex items-center">
                {/* Bubble + label */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ring-4',
                      isCompleted
                        ? 'bg-green-500 text-white ring-green-100 dark:ring-green-900/40 shadow-md'
                        : isActive
                        ? 'text-white ring-orange-100 dark:ring-orange-900/40 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 ring-transparent',
                    )}
                    style={isActive ? { background: 'linear-gradient(135deg, var(--ap), var(--as))' } : undefined}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : s.num}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold tracking-wide transition-colors duration-300',
                      isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : isActive
                        ? 'text-orange-500 dark:text-orange-400'
                        : 'text-gray-400 dark:text-gray-600',
                    )}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Connecting line */}
                {idx < steps.length - 1 && (
                  <div
                    className="w-28 h-0.5 mx-3 mb-6 rounded-full transition-all duration-500"
                    style={{
                      background: stepIndex > idx
                        ? '#22c55e'
                        : stepIndex === idx
                        ? 'linear-gradient(90deg, var(--ap) 40%, #e5e7eb 100%)'
                        : '#e5e7eb',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ────────────── LEFT COLUMN ────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── STEP 1: ADDRESS ── */}
            {step === 'address' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6">
                {/* Section header */}
                <h2 className="font-semibold text-lg mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                  >
                    <MapPin className="w-4 h-4 text-white" />
                  </span>
                  Delivery Address
                </h2>

                {/* Address cards */}
                <div className="space-y-3 mb-5">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddress === addr.id;
                    return (
                      <label
                        key={addr.id}
                        className={cn(
                          'flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 group',
                          isSelected
                            ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                            : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900',
                        )}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={isSelected}
                          onChange={() => setSelectedAddress(addr.id)}
                          className="mt-1 accent-orange-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {addr.name}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                              {addr.label}
                            </span>
                            {addr.isDefault && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{addr.address}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{addr.phone}</p>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </label>
                    );
                  })}

                  {addresses.length === 0 && (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                      <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No saved addresses yet. Add one below.</p>
                    </div>
                  )}
                </div>

                {/* Toggle add-address form */}
                <button
                  type="button"
                  onClick={() => setShowAddAddress(v => !v)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 border-dashed transition-all duration-200',
                    showAddAddress
                      ? 'border-red-300 text-red-500 dark:border-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                      : 'border-orange-300 text-orange-500 dark:border-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20',
                  )}
                >
                  {showAddAddress
                    ? <><X className="w-4 h-4" /> Cancel</>
                    : <><Plus className="w-4 h-4" /> Add New Address</>
                  }
                </button>

                {/* Add address form */}
                {showAddAddress && (
                  <form
                    onSubmit={handleAddAddress}
                    className="mt-4 border border-gray-100 dark:border-gray-800 rounded-xl p-5 space-y-4 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-orange-500" />
                      New Address
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                          Full Name
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Full Name"
                          value={newAddress.fullName}
                          onChange={e => setNewAddress(p => ({ ...p, fullName: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                          Phone
                        </label>
                        <input
                          className={inputCls}
                          placeholder="98XXXXXXXX"
                          value={newAddress.phone}
                          onChange={e => setNewAddress(p => ({ ...p, phone: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                          Address Line 1
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Street, Area"
                          value={newAddress.addressLine1}
                          onChange={e => setNewAddress(p => ({ ...p, addressLine1: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                          City
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Kathmandu"
                          value={newAddress.city}
                          onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                          District
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Kathmandu"
                          value={newAddress.district}
                          onChange={e => setNewAddress(p => ({ ...p, district: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingAddress}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                    >
                      {addingAddress ? 'Saving...' : 'Save Address'}
                    </button>
                  </form>
                )}

                {/* Continue CTA */}
                <button
                  type="button"
                  disabled={!selectedAddress}
                  onClick={() => setStep('payment')}
                  className="mt-6 w-full py-3.5 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                >
                  Continue to Payment
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* ── STEP 2: PAYMENT ── */}
            {step === 'payment' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6">
                {/* Section header */}
                <h2 className="font-semibold text-lg mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                  >
                    <CreditCard className="w-4 h-4 text-white" />
                  </span>
                  Payment Method
                </h2>

                {/* Payment method cards */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = selectedPayment === method.id;
                    return (
                      <label
                        key={method.id}
                        className={cn(
                          'flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200',
                          isSelected
                            ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                            : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900',
                        )}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={method.id}
                          checked={isSelected}
                          onChange={() => setSelectedPayment(method.id)}
                          className="sr-only"
                        />
                        {/* Logo bubble */}
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 overflow-hidden',
                            isSelected
                              ? 'bg-white dark:bg-gray-800 shadow-md'
                              : 'bg-gray-50 dark:bg-gray-800',
                          )}
                        >
                          {method.logo}
                        </div>
                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {method.name}
                            </span>
                            {method.badge && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400">
                                {method.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{method.desc}</p>
                        </div>
                        {/* Radio dot */}
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
                            isSelected
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-gray-300 dark:border-gray-600',
                          )}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Coupon section */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-orange-500" />
                    Have a coupon?
                  </p>
                  <div className="flex gap-2">
                    <input
                      className={cn(
                        inputCls,
                        'flex-1 font-mono tracking-widest uppercase',
                        couponApplied && 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/20',
                      )}
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!couponCode) return;
                        try {
                          const res = await apiClient.post('/api/v1/coupons/validate', { code: couponCode, orderTotal: subtotal }) as any;
                          const discount = res.data?.data?.discount ?? res.data?.data?.discountAmount ?? 0;
                          setCouponDiscount(discount);
                          setCouponApplied(true);
                          toast({ title: 'Coupon applied!', description: `Discount of Rs. ${discount} applied.` });
                        } catch {
                          setCouponApplied(false);
                          setCouponDiscount(0);
                          toast({ title: 'Invalid coupon', variant: 'destructive' });
                        }
                      }}
                      className="px-5 py-2 rounded-xl text-sm font-semibold border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-200 active:scale-95 whitespace-nowrap"
                    >
                      Apply
                    </button>
                  </div>
                  {couponApplied && (
                    <div className="flex items-center gap-2 mt-2.5 text-green-600 dark:text-green-400 text-sm font-medium bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      Coupon applied — Rs. {couponDiscount} off your order!
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep('address')}
                    className="px-5 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 active:scale-95 flex items-center gap-1.5"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('confirm')}
                    className="flex-1 py-3 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                  >
                    Review Order
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: CONFIRM ── */}
            {step === 'confirm' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6">
                {/* Section header */}
                <h2 className="font-semibold text-lg mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                  </span>
                  Review Your Order
                </h2>

                {/* Order items */}
                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800"
                    >
                      {/* Product image */}
                      <div
                        className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #fef3c7, #fed7aa)' }}
                      >
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <Package className="w-7 h-7 text-orange-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {item.productName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {item.sellerName && <span>{item.sellerName} · </span>}
                          Qty: {item.quantity}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-sm text-gray-900 dark:text-white self-center flex-shrink-0">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Delivery & payment summary */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden mb-6">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Order Details
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="flex justify-between items-center px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <MapPin className="w-4 h-4 text-orange-400" />
                        Delivery to
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-right max-w-[200px] truncate">
                        {addresses.find(a => a.id === selectedAddress)?.address ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <CreditCard className="w-4 h-4 text-orange-400" />
                        Payment via
                      </div>
                      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                        <span className="w-5 h-5 inline-flex items-center">{PAYMENT_METHODS.find(m => m.id === selectedPayment)?.logo}</span>
                        {PAYMENT_METHODS.find(m => m.id === selectedPayment)?.name}
                      </div>
                    </div>
                    {couponApplied && (
                      <div className="flex justify-between items-center px-4 py-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Tag className="w-4 h-4 text-green-500" />
                          Coupon ({couponCode})
                        </div>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          -{formatCurrency(couponDiscount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('payment')}
                    className="px-5 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 active:scale-95 flex items-center gap-1.5"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={isPlacing}
                    onClick={placeOrder}
                    className="flex-1 py-3 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                  >
                    {isPlacing ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8v4" fill="currentColor" className="opacity-75" />
                        </svg>
                        Placing Order...
                      </>
                    ) : (
                      <>
                        Place Order · {formatCurrency(total)}
                        <CheckCircle className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ────────────── RIGHT COLUMN: ORDER SUMMARY SIDEBAR ────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden sticky top-24">

              {/* Sidebar header */}
              <div
                className="px-5 py-4"
                style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)' }}
              >
                {/* Light-mode header */}
                <div className="dark:hidden">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                    <ShieldCheck className="w-5 h-5 text-orange-500" />
                    Order Summary
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {items.length} item{items.length !== 1 ? 's' : ''} in your cart
                  </p>
                </div>
                {/* Dark-mode header */}
                <div
                  className="hidden dark:block px-5 py-4 -mx-5 -my-4 rounded-t-2xl"
                  style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}
                >
                  <h3 className="font-bold text-white flex items-center gap-2 text-base">
                    <ShieldCheck className="w-5 h-5 text-orange-400" />
                    Order Summary
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {items.length} item{items.length !== 1 ? 's' : ''} in your cart
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">

                {/* Items preview */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #fef3c7, #fed7aa)' }}
                        >
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-orange-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 flex-1 line-clamp-1">
                          {item.productName}
                        </p>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white flex-shrink-0">
                          ×{item.quantity}
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 pl-11">
                        +{items.length - 3} more item{items.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* Free shipping progress bar */}
                {subtotal < freeShippingThreshold && (
                  <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Truck className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
                        Add{' '}
                        <span className="font-bold">{formatCurrency(freeShippingThreshold - subtotal)}</span>{' '}
                        more for free delivery!
                      </p>
                    </div>
                    <div className="w-full bg-orange-100 dark:bg-orange-900/40 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width:      `${freeShippingProgress}%`,
                          background: 'linear-gradient(90deg, var(--ap), var(--as))',
                        }}
                      />
                    </div>
                    <p className="text-right text-[10px] text-orange-500 dark:text-orange-400 mt-1 font-medium">
                      {Math.round(freeShippingProgress)}% to free shipping
                    </p>
                  </div>
                )}

                {subtotal >= freeShippingThreshold && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">
                      You qualify for free delivery!
                    </p>
                  </div>
                )}

                {/* Pricing breakdown */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Subtotal ({items.length} items)</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Shipping</span>
                    <span
                      className={
                        shipping === 0
                          ? 'text-green-600 dark:text-green-400 font-semibold'
                          : 'text-gray-900 dark:text-white'
                      }
                    >
                      {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
                    </span>
                  </div>
                  {couponApplied && couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Coupon ({couponCode})
                      </span>
                      <span>-{formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-2.5 flex justify-between font-bold text-base">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span
                      style={{
                        background:              'linear-gradient(135deg, var(--ap), var(--as))',
                        WebkitBackgroundClip:    'text',
                        WebkitTextFillColor:     'transparent',
                      }}
                    >
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Security badges */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <div className="w-6 h-6 rounded-lg bg-green-50 dark:bg-green-950/40 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    SSL encrypted &amp; secure checkout
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    100% secure payment guarantee
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <div className="w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                    </div>
                    Fast &amp; reliable delivery
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
