import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, MapPin, PartyPopper, ShoppingBag, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Address, ApiEnvelope, Cart, CreateOrderInput, Order, Payment, PaymentProvider } from '@/api/types';
import { asArray } from '@/api/normalize';
import { AuthGate, ErrorState } from '@/components/storefront-ui';
import { ChunkyButton, FunHeading, Mascot, Starburst, StickerCard } from '@/components/sticker-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatMoney } from '@/lib/format';

const PROVIDERS: { value: PaymentProvider; label: string }[] = [
  { value: 'cash', label: 'Cash on delivery' },
  { value: 'mock', label: 'Test gateway' },
];

const inputCls =
  'rounded-2xl border-2 border-ink bg-white px-4 py-2.5 text-sm font-medium shadow-sticker-sm placeholder:text-ink-muted/60 focus:outline-none focus:bg-sunny-100/50';

type CheckoutStep = 'review' | 'placing' | 'created';

/** Checkout: address → order → payment. Backend-authoritative pricing. */
export function CheckoutPage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <AuthGate isAuthenticated={isAuthenticated} isLoading={isLoading} title="Sign in to check out">
      <CheckoutContent />
    </AuthGate>
  );
}

function Stepper({ active }: { active: number }) {
  const steps = [
    { icon: ShoppingBag, label: 'Cart', to: '/cart' },
    { icon: MapPin, label: 'Details', to: null },
    { icon: PartyPopper, label: 'Done', to: null },
  ];
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        const pill = done
          ? 'border-ink bg-mint-100 text-ink'
          : current
            ? 'border-ink bg-sunny-400 text-ink shadow-sticker-sm'
            : 'border-ink/20 bg-white text-ink-muted';
        const content = (
          <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-display text-xs font-bold ${pill}`}>
            <step.icon className="h-3.5 w-3.5" strokeWidth={2.75} />
            {index + 1}. {step.label}
          </span>
        );
        return (
          <li key={step.label} className="flex items-center gap-2">
            {step.to && !current ? <Link to={step.to}>{content}</Link> : content}
            {index < steps.length - 1 && <span className="h-0.5 w-4 rounded-full bg-ink/20" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function CheckoutContent() {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<CheckoutStep>('review');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [provider, setProvider] = useState<PaymentProvider>('cash');
  const [error, setMessage] = useState<string | null>(null);
  const setError = setMessage;
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [paymentResult, setPaymentResult] = useState<Payment | null>(null);

  const [address, setAddress] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'IN',
  });

  const cart = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Cart>>('/cart');
      return data.data;
    },
  });

  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Address[]>>('/addresses');
      return asArray<Address>(data.data);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const saveAddress = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiEnvelope<Address>>('/addresses', address);
      return data.data;
    },
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      let addressId: string | undefined;
      let inlineAddress: CreateOrderInput['address'] | undefined;

      if (useSavedAddress && selectedAddressId !== 'new') {
        addressId = selectedAddressId;
      } else {
        inlineAddress = {
          label: address.label,
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          ...(address.line2 ? { line2: address.line2 } : {}),
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country || 'IN',
        };
        if (saveAddress.isIdle) {
          await saveAddress.mutateAsync();
        }
      }

      const payload: CreateOrderInput = {
        ...(addressId ? { addressId } : { address: inlineAddress }),
        ...(couponCode.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
      };

      const { data } = await api.post<ApiEnvelope<Order>>('/orders', payload);
      return data.data;
    },
    onSuccess: async (order) => {
      setStep('placing');
      setCreatedOrder(order);
      setError(null);
      try {
        const { data } = await api.post<ApiEnvelope<Payment>>('/payments', {
          orderId: order.id,
          provider,
        } as { orderId: string; provider: PaymentProvider });
        setPaymentResult(data.data);
        setStep('created');
      } catch (err) {
        setPaymentResult(null);
        setStep('created');
        setMessage(
          err instanceof Error
            ? `Order ${order.orderNumber} was created but payment couldn't be started: ${err.message}`
            : 'Order created, but payment setup failed.',
        );
      }
      void invalidate();
    },
    onError: (err) => {
      setStep('review');
      setMessage(err instanceof Error ? err.message : 'Could not place the order');
    },
  });

  if (cart.isLoading || addresses.isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-10 w-64 animate-pulse rounded-full border-2 border-ink bg-ember-100" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="h-96 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
          <div className="h-64 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
        </div>
      </section>
    );
  }
  if (cart.isError) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState error={cart.error} />
      </section>
    );
  }

  const cartData = cart.data;
  if (!cartData || cartData.items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <FunHeading title="Checkout" overline="Last step before boom" />
        <StickerCard className="flex flex-col items-center gap-4 p-10 text-center">
          <Mascot className="h-24 w-auto" />
          <p className="font-display text-xl font-extrabold text-ink">Your cart is empty!</p>
          <ChunkyButton to="/products">Browse the fun</ChunkyButton>
        </StickerCard>
      </section>
    );
  }

  if (step === 'created' && createdOrder) {
    return <OrderCreated order={createdOrder} payment={paymentResult} notice={error} />;
  }

  const busy = placeOrder.isPending || step === 'placing';

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <FunHeading title="Checkout" subtitle="Where's the party at?" overline="Last step before boom" />
      <div className="mt-4">
        <Stepper active={1} />
      </div>
      {error && step === 'review' && (
        <StickerCard className="mt-4 border-ink bg-candy-100 p-3 text-sm font-bold text-ink">{error}</StickerCard>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Delivery address */}
          <StickerCard className="p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <MapPin className="h-5 w-5" strokeWidth={2.75} /> Delivery address
            </h2>
            {(addresses.data?.length ?? 0) > 0 && (
              <div className="mb-4 mt-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-ink bg-sunny-100 px-3 py-1 text-sm font-bold shadow-sticker-sm">
                  <input
                    type="checkbox"
                    checked={useSavedAddress}
                    onChange={(e) => setUseSavedAddress(e.target.checked)}
                    className="h-4 w-4 accent-[#e8513f]"
                  />
                  Use a saved address
                </label>
                {useSavedAddress && (
                  <div className="mt-3 space-y-2">
                    {(addresses.data ?? []).map((saved) => (
                      <label
                        key={saved.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 text-sm transition ${
                          selectedAddressId === saved.id
                            ? 'border-ink bg-sunny-100 shadow-sticker-sm'
                            : 'border-ink/20 bg-white hover:border-ink'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === saved.id}
                          onChange={() => setSelectedAddressId(saved.id)}
                          className="mt-0.5 h-4 w-4 accent-[#e8513f]"
                        />
                        <span className="font-medium">
                          <span className="font-bold text-ink">{saved.fullName}</span>
                          <span className="text-ink-muted"> · {saved.label}</span>
                          <br />
                          <span className="text-ink-muted">
                            {saved.line1}
                            {saved.line2 ? `, ${saved.line2}` : ''}, {saved.city}, {saved.state} {saved.pincode}
                            <br />
                            {saved.phone}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            <form
              className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${useSavedAddress && selectedAddressId !== 'new' ? 'opacity-40' : ''}`}
              onSubmit={(e) => e.preventDefault()}
            >
              <input required placeholder="Full name" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} className={inputCls} />
              <input required placeholder="Phone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} className={inputCls} />
              <input required placeholder="Address line 1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} className={`${inputCls} sm:col-span-2`} />
              <input placeholder="Address line 2 (optional)" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} className={`${inputCls} sm:col-span-2`} />
              <input required placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className={inputCls} />
              <input required placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className={inputCls} />
              <input required placeholder="Pincode" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} className={inputCls} />
              <input placeholder="Country" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} className={inputCls} />
            </form>
          </StickerCard>

          {/* Payment */}
          <StickerCard className="p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <Banknote className="h-5 w-5" strokeWidth={2.75} /> Payment
            </h2>
            <fieldset className="mt-3 space-y-2">
              {PROVIDERS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm font-bold transition ${
                    provider === option.value
                      ? 'border-ink bg-mint-100 shadow-sticker-sm'
                      : 'border-ink/20 bg-white hover:border-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={option.value}
                    checked={provider === option.value}
                    onChange={() => setProvider(option.value)}
                    className="h-4 w-4 accent-[#e8513f]"
                  />
                  {option.value === 'cash' ? (
                    <Banknote className="h-4 w-4" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  <span className="text-ink">{option.label}</span>
                </label>
              ))}
            </fieldset>
          </StickerCard>

          {/* Coupon */}
          <StickerCard className="bg-grape-100 p-5">
            <h2 className="font-display text-lg font-extrabold text-ink">Got a coupon?</h2>
            <div className="mt-3 flex gap-2">
              <input
                placeholder="Coupon code (optional)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className={`${inputCls} flex-1 uppercase`}
              />
            </div>
          </StickerCard>
        </div>

        {/* Summary */}
        <aside>
          <StickerCard className="h-fit bg-sunny-100 p-5">
            <h2 className="font-display text-lg font-extrabold text-ink">Order summary</h2>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto text-sm font-medium">
              {cartData.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="flex-1 text-ink">
                    {item.product.name}{' '}
                    <span className="inline-block rounded-full border border-ink bg-white px-1.5 text-[11px] font-bold">
                      ×{item.quantity}
                    </span>
                  </span>
                  <span className="font-bold text-ink">{formatMoney(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {cartData.outOfStockCount > 0 && (
              <p className="mt-3 rounded-2xl border-2 border-ink bg-candy-100 px-3 py-2 text-xs font-bold">
                Remove out-of-stock items before ordering.
              </p>
            )}
            <dl className="mt-4 space-y-2 border-t-2 border-ink/15 pt-4 text-sm font-medium">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-bold text-ink">{formatMoney(cartData.subtotal)}</dd>
              </div>
              {couponCode.trim() && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Coupon {couponCode}</dt>
                  <dd className="text-ink-muted">Applied at order</dd>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-ink/15 pt-3 text-base">
                <dt className="font-display font-extrabold text-ink">Total</dt>
                <dd className="font-display font-extrabold text-coral-600">{formatMoney(cartData.subtotal)}</dd>
              </div>
              <p className="text-xs text-ink-muted">Delivery, tax, and discounts are applied by the server when the order is placed.</p>
            </dl>
            <ChunkyButton
              onClick={() => placeOrder.mutate()}
              tone="coral"
              disabled={busy || cartData.outOfStockCount > 0}
              className="mt-5 w-full"
            >
              {busy ? 'Placing order…' : 'Place order'}
            </ChunkyButton>
          </StickerCard>
        </aside>
      </div>
    </section>
  );
}

function OrderCreated({ order, payment, notice }: { order: Order; payment: Payment | null; notice: string | null }) {
  const detailsUrl = `/orders/${order.id}`;
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="relative mx-auto w-fit">
        <Mascot className="mx-auto h-36 w-auto" />
        <Starburst label="Yay!" className="absolute -right-8 -top-4 h-20 w-20 animate-wiggle" />
      </div>
      <h1 className="mt-6 font-display text-4xl font-extrabold text-ink">Boom! Order placed.</h1>
      <p className="mt-2 font-medium text-ink-muted">
        Order <span className="rounded-lg border-2 border-ink bg-sunny-100 px-2 py-0.5 font-mono font-bold text-ink">{order.orderNumber}</span>{' '}
        totalling <span className="font-display font-extrabold text-coral-600">{formatMoney(order.grandTotal)}</span>.
      </p>
      {notice && (
        <StickerCard className="mx-auto mt-4 max-w-lg border-ink bg-candy-100 p-3 text-sm font-bold text-ink">
          {notice}
        </StickerCard>
      )}
      {payment?.clientPayload && (
        <StickerCard className="mx-auto mt-6 max-w-lg p-5 text-left text-sm">
          <p className="font-display font-extrabold text-ink">Payment details</p>
          <pre className="mt-2 whitespace-pre-wrap rounded-2xl border-2 border-ink bg-paper p-3 font-mono text-xs text-ink-muted">
            {JSON.stringify(payment.clientPayload, null, 2)}
          </pre>
          <p className="mt-2 text-xs font-medium text-ink-muted">
            Payment is settled by the provider webhook; its status updates appear on your order.
          </p>
        </StickerCard>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ChunkyButton to={detailsUrl} tone="coral">
          View order
        </ChunkyButton>
        <ChunkyButton to="/products" tone="white">
          Continue shopping
        </ChunkyButton>
      </div>
    </section>
  );
}
