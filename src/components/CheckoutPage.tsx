import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, CheckCircle2, Lock, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { getEffectivePrice, useStore } from '../context/StoreContext';
import { StudioImage } from './StudioImage';

export function CheckoutPage() {
  const {
    cart,
    cartSubtotal,
    deliveryZones,
    settings,
    user,
    authToken,
    clearCart,
    refreshCatalog,
    setLastConfirmedOrder,
    navigate,
    notify,
  } = useStore();

  const activeZones = useMemo(() => deliveryZones.filter((z) => z.is_active), [deliveryZones]);

  const countries = useMemo(() => {
    const set = new Set(activeZones.map((z) => z.country).filter(Boolean));
    return Array.from(set);
  }, [activeZones]);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [country, setCountry] = useState(user?.country || countries[0] || '');
  const [city, setCity] = useState(user?.city ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stable idempotency key per cart checkout attempt to prevent duplicate orders
  const [idempotencyKey] = useState(
    () => `cod_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.full_name);
      setPhone((prev) => prev || user.phone);
      setEmail((prev) => prev || user.email);
      if (user.country && countries.includes(user.country)) {
        setCountry((prev) => prev || user.country);
      }
      setCity((prev) => prev || user.city);
      setAddress((prev) => prev || user.address);
    }
  }, [user, countries]);

  useEffect(() => {
    if (!country && countries.length > 0) {
      setCountry(countries[0]);
    }
  }, [countries, country]);

  const zonesForCountry = useMemo(
    () => activeZones.filter((z) => z.country.toLowerCase() === country.toLowerCase()),
    [activeZones, country]
  );

  // Auto-select first city when country changes if current city isn't in that country's zones
  useEffect(() => {
    if (zonesForCountry.length > 0) {
      const cityMatches = zonesForCountry.some(
        (z) => !z.city || z.city.toLowerCase() === city.trim().toLowerCase()
      );
      if (!cityMatches && zonesForCountry[0].city) {
        setCity(zonesForCountry[0].city);
      }
    }
  }, [country, zonesForCountry, city]);

  const matchedZone = useMemo(() => {
    if (!country) return null;
    const normCity = city.trim().toLowerCase();
    return (
      zonesForCountry.find((z) => (z.city ?? '').toLowerCase() === normCity) ??
      zonesForCountry.find((z) => !z.city || z.city.trim() === '') ??
      null
    );
  }, [country, city, zonesForCountry]);

  const deliveryFee = useMemo(() => {
    if (!matchedZone) return null;
    const threshold = matchedZone.free_shipping_threshold ?? settings.free_shipping_threshold;
    if (threshold !== null && cartSubtotal >= threshold) return 0;
    return matchedZone.delivery_fee;
  }, [matchedZone, cartSubtotal, settings.free_shipping_threshold]);

  const grandTotal = useMemo(() => {
    const fee = deliveryFee ?? 0;
    return Number((cartSubtotal + fee).toFixed(2));
  }, [cartSubtotal, deliveryFee]);

  if (cart.length === 0) {
    return (
      <div className="bg-[#F5F7FB] min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="font-display text-2xl font-bold text-[#101828]">Your cart is empty</h1>
          <p className="mt-2 text-sm text-[#667085]">
            Add products to your cart before proceeding to Cash on Delivery checkout.
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="mt-6 h-11 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
          >
            Explore Catalog
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!matchedZone) {
      setErrorMsg('Delivery is not available in the selected country or city.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          customer_name: fullName.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim(),
          country: matchedZone.country,
          city: city.trim() || matchedZone.city || matchedZone.name,
          delivery_address: address.trim(),
          delivery_instructions: instructions.trim(),
          delivery_zone_id: matchedZone.id,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not place your order.');
      }

      setLastConfirmedOrder(data.order);
      clearCart();
      await refreshCatalog();
      notify('Order placed successfully!', 'success');
      navigate('/order-confirmation');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F5F7FB] min-h-[80vh] py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[#101828] tracking-tight">
            Cash on Delivery Checkout
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            Enter your delivery details. You pay in cash only when your order arrives.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Customer & Delivery Form + Payment Method */}
          <div className="lg:col-span-7 space-y-6">
            {errorMsg && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] flex items-start gap-3 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Customer Information */}
            <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#EAECF0]">
                <MapPin className="w-5 h-5 text-[#155EEF]" />
                <h2 className="font-display text-lg font-bold text-[#101828]">
                  Customer & Delivery Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="cod-name" className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    id="cod-name"
                    type="text"
                    required
                    minLength={2}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jordan Rivera"
                    className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
                  />
                </div>

                <div>
                  <label htmlFor="cod-phone" className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    id="cod-phone"
                    type="tel"
                    required
                    minLength={7}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 415 555 0192"
                    className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
                  />
                  <p className="mt-1 text-[11px] text-[#667085]">
                    Used by our courier to confirm delivery and for order tracking.
                  </p>
                </div>

                <div>
                  <label htmlFor="cod-email" className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    id="cod-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
                  />
                </div>

                <div>
                  <label htmlFor="cod-country" className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Country (Active Delivery Zones) *
                  </label>
                  <select
                    id="cod-country"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] bg-white text-sm text-[#101828] focus:outline-none focus:border-[#155EEF]"
                  >
                    {countries.length === 0 ? (
                      <option value="">No active delivery zones</option>
                    ) : (
                      countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="cod-city" className="block text-xs font-semibold text-[#344054] mb-1.5">
                    City *
                  </label>
                  {zonesForCountry.some((z) => z.city) ? (
                    <select
                      id="cod-city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] bg-white text-sm text-[#101828] focus:outline-none focus:border-[#155EEF]"
                    >
                      {zonesForCountry.map((z) => (
                        <option key={z.id} value={z.city ?? z.name}>
                          {z.city ?? z.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="cod-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter city"
                      className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF]"
                    />
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="cod-address" className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Delivery Street Address *
                  </label>
                  <input
                    id="cod-address"
                    type="text"
                    required
                    minLength={5}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, building, apartment or suite number"
                    className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="cod-notes" className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Additional Delivery Instructions (Optional)
                  </label>
                  <textarea
                    id="cod-notes"
                    rows={2}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Gate code, preferred delivery time window, or drop-off note"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
                  />
                </div>
              </div>

              {/* Zone Delivery Notice */}
              {matchedZone ? (
                <div className="rounded-xl bg-[#F5F7FB] border border-[#EAECF0] p-4 flex items-start justify-between gap-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-2.5">
                    <Truck className="w-4 h-4 text-[#155EEF] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#101828]">
                        {matchedZone.name} · Estimated {matchedZone.estimated_delivery_days}
                      </p>
                      <p className="text-xs text-[#667085] mt-0.5">
                        {matchedZone.free_shipping_threshold ?? settings.free_shipping_threshold
                          ? `Standard fee $${matchedZone.delivery_fee.toFixed(2)} (Free over $${(
                              matchedZone.free_shipping_threshold ?? settings.free_shipping_threshold
                            )?.toFixed(0)})`
                          : `Standard zone delivery fee: $${matchedZone.delivery_fee.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-[#101828] tabular-nums shrink-0">
                    {deliveryFee === 0 ? 'Free' : `$${deliveryFee?.toFixed(2)}`}
                  </span>
                </div>
              ) : (
                <div className="rounded-xl bg-[#FEF3F2] border border-[#FECDCA] p-4 text-xs sm:text-sm text-[#B42318]">
                  Delivery is not supported for this location. Please select an active delivery zone.
                </div>
              )}
            </div>

            {/* Payment Method: Cash on Delivery ONLY */}
            <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#EAECF0]">
                <Banknote className="w-5 h-5 text-[#155EEF]" />
                <h2 className="font-display text-lg font-bold text-[#101828]">Payment Method</h2>
              </div>

              <div className="rounded-xl border-2 border-[#155EEF] bg-[#EFF4FF]/60 p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#155EEF] text-white flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-base font-bold text-[#101828]">
                      CASH ON DELIVERY
                    </p>
                    <CheckCircle2 className="w-5 h-5 text-[#155EEF] shrink-0" />
                  </div>
                  <p className="mt-1 text-sm text-[#344054]">
                    Pay in cash when your order is delivered to your address.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-bold text-[#101828] pb-4 border-b border-[#EAECF0]">
                Order Summary
              </h2>

              <div className="divide-y divide-[#EAECF0] max-h-80 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const unit = getEffectivePrice(item.product);
                  return (
                    <div key={item.product.id} className="py-3 first:pt-0 flex items-center gap-3.5">
                      <div className="w-14 h-11 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] overflow-hidden shrink-0">
                        <StudioImage
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#101828] truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-[#667085] tabular-nums">
                          Qty {item.quantity} × ${unit.toFixed(2)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#101828] tabular-nums shrink-0">
                        ${(unit * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#EAECF0] space-y-2.5 text-sm">
                <div className="flex justify-between text-[#475467]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#101828] tabular-nums">
                    ${cartSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[#475467]">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-[#101828] tabular-nums">
                    {deliveryFee === null
                      ? 'Unavailable'
                      : deliveryFee === 0
                      ? '$0.00 (Free)'
                      : `$${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#EAECF0] text-lg font-bold text-[#101828]">
                  <span>Grand Total (USD)</span>
                  <span className="tabular-nums">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !matchedZone}
                className="w-full h-12 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:bg-[#EAECF0] disabled:text-[#98A2B3] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{submitting ? 'Confirming Order...' : 'Place My Order'}</span>
              </button>

              <p className="text-xs text-[#667085] flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#155EEF] shrink-0 mt-0.5" />
                <span>
                  Prices, delivery fees, and stock availability are verified securely on our server when your order is placed.
                </span>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
