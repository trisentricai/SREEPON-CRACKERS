import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Address, ApiEnvelope, Cart, CreateOrderInput, Order, Payment, PaymentProvider } from '@/api/types';
import { asArray } from '@/api/normalize';
import { AuthGate, Badge, EmptyState, ErrorState, Spinner } from '@/components/storefront-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatMoney } from '@/lib/format';

const PROVIDERS: { value: PaymentProvider; label: string }[] = [
  { value: 'cash', label: 'Cash on delivery' },
  { value: 'mock', label: 'Test gateway' },
];

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
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Spinner label="Preparing checkout…" />
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
        <h1 className="text-2xl font-bold text-ember-800">Checkout</h1>
        <div className="mt-4">
          <EmptyState title="Your cart is empty">
            <p>
              <Link to="/products" className="font-medium text-ember-700 underline">Browse the catalogue</Link> first.
            </p>
          </EmptyState>
        </div>
      </section>
    );
  }

  if (step === 'created' && createdOrder) {
    return <OrderCreated order={createdOrder} payment={paymentResult} notice={error} />;
  }

  const busy = placeOrder.isPending || step === 'placing';

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ember-800">Checkout</h1>
      {error && step === 'review' && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {/* Delivery address */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-ember-900">Delivery address</h2>
            {(addresses.data?.length ?? 0) > 0 && (
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useSavedAddress}
                    onChange={(e) => setUseSavedAddress(e.target.checked)}
                    className="h-4 w-4 accent-ember-600"
                  />
                  Use a saved address
                </label>
                {useSavedAddress && (
                  <div className="mt-3 space-y-2">
                    {(addresses.data ?? []).map((saved) => (
                      <label key={saved.id} className="flex items-start gap-3 rounded-lg border border-ember-100 p-3 text-sm">
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === saved.id}
                          onChange={() => setSelectedAddressId(saved.id)}
                          className="mt-0.5 h-4 w-4 accent-ember-600"
                        />
                        <span>
                          <span className="font-medium text-ember-900">{saved.fullName}</span>
                          <span className="text-ember-900/60"> · {saved.label}</span>
                          <br />
                          {saved.line1}
                          {saved.line2 ? `, ${saved.line2}` : ''}, {saved.city}, {saved.state} {saved.pincode}
                          <br />
                          {saved.phone}
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
              <input
                required
                placeholder="Full name"
                value={address.fullName}
                onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Phone"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Address line 1"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                placeholder="Address line 2 (optional)"
                value={address.line2}
                onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                required
                placeholder="City"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="State"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Pincode"
                value={address.pincode}
                onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="Country"
                value={address.country}
                onChange={(e) => setAddress({ ...address, country: e.target.value })}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
            </form>
          </div>

          {/* Payment */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-ember-900">Payment</h2>
            <fieldset className="space-y-2">
              {PROVIDERS.map((option) => (
                <label key={option.value} className="flex items-center gap-3 rounded-lg border border-ember-100 p-3 text-sm">
                  <input
                    type="radio"
                    name="provider"
                    value={option.value}
                    checked={provider === option.value}
                    onChange={() => setProvider(option.value)}
                    className="h-4 w-4 accent-ember-600"
                  />
                  <span className="text-ember-900">{option.label}</span>
                </label>
              ))}
            </fieldset>
          </div>

          {/* Coupon */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-ember-900">Coupon</h2>
            <div className="flex gap-2">
              <input
                placeholder="Coupon code (optional)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-xl border border-ember-100 bg-ember-50/50 p-5">
          <h2 className="text-lg font-semibold text-ember-900">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cartData.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="flex-1 text-ember-900/80">
                  {item.product.name} <Badge tone={item.isOutOfStock ? 'red' : 'neutral'}>×{item.quantity}</Badge>
                </span>
                <span className="font-medium text-ember-900">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {cartData.outOfStockCount > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Remove out-of-stock items before ordering.
            </p>
          )}
          <dl className="mt-4 space-y-2 border-t border-ember-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ember-900/60">Subtotal</dt>
              <dd className="font-medium text-ember-900">{formatMoney(cartData.subtotal)}</dd>
            </div>
            {couponCode.trim() && (
              <div className="flex justify-between">
                <dt className="text-ember-900/60">Coupon {couponCode}</dt>
                <dd className="text-ember-900/60">Applied at order</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ember-100 pt-3 text-base">
              <dt className="font-semibold text-ember-900">Total</dt>
              <dd className="font-bold text-ember-800">{formatMoney(cartData.subtotal)}</dd>
            </div>
            <p className="text-xs text-ember-900/50">Delivery, tax, and discounts are applied by the server when the order is placed.</p>
          </dl>
          <button
            onClick={() => placeOrder.mutate()}
            disabled={busy || cartData.outOfStockCount > 0}
            className="mt-5 w-full rounded-lg bg-ember-600 px-4 py-2.5 font-semibold text-white hover:bg-ember-700 disabled:opacity-50"
          >
            {busy ? 'Placing order…' : 'Place order'}
          </button>
        </aside>
      </div>
    </section>
  );
}

function OrderCreated({ order, payment, notice }: { order: Order; payment: Payment | null; notice: string | null }) {
  const detailsUrl = `/orders/${order.id}`;
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl" aria-hidden>
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-bold text-ember-800">Order placed</h1>
      <p className="mt-2 text-ember-900/70">
        Order <span className="font-mono font-semibold">{order.orderNumber}</span> totalling{' '}
        <span className="font-bold">{formatMoney(order.grandTotal)}</span>.
      </p>
      {notice && <p className="mt-3 text-sm text-amber-700">{notice}</p>}
      {payment?.clientPayload && (
        <div className="mt-6 rounded-xl border border-ember-100 bg-ember-50/60 p-5 text-left text-sm">
          <p className="font-semibold text-ember-800">Payment details</p>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-ember-900/70">
            {JSON.stringify(payment.clientPayload, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-ember-900/50">
            Payment is settled by the provider webhook; its status updates appear on your order.
          </p>
        </div>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Link to={detailsUrl} className="rounded-lg bg-ember-600 px-5 py-2.5 font-semibold text-white hover:bg-ember-700">
          View order
        </Link>
        <Link to="/products" className="rounded-lg border border-ember-300 px-5 py-2.5 font-semibold text-ember-700 hover:bg-ember-50">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}