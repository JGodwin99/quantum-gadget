import React, { useState } from 'react';
import { Banknote, CheckCircle2, PackageCheck, Search, ShieldCheck, Truck, XCircle } from 'lucide-react';
import type { Order, OrderStatus } from '../types/store';

const TIMELINE_STEPS: Array<{ key: OrderStatus; label: string; description: string }> = [
  { key: 'pending', label: 'Pending', description: 'Order received and awaiting phone confirmation.' },
  { key: 'confirmed', label: 'Confirmed', description: 'Delivery details verified with customer.' },
  { key: 'processing', label: 'Processing', description: 'Items packed and prepared for dispatch.' },
  { key: 'shipped', label: 'Shipped', description: 'Courier en route to your delivery zone.' },
  { key: 'delivered', label: 'Delivered', description: 'Delivered and Cash on Delivery settled.' },
];

export function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        throw new Error(data.error ?? 'Order verification failed.');
      }
      setOrder(data.order);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to locate order.');
    } finally {
      setLoading(false);
    }
  };

  const activeStepIndex = order
    ? TIMELINE_STEPS.findIndex((s) => s.key === order.order_status)
    : -1;

  return (
    <div className="bg-[#F5F7FB] min-h-[75vh] py-12 lg:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#101828] tracking-tight">
            Track Your Order
          </h1>
          <p className="text-sm sm:text-base text-[#667085] max-w-xl mx-auto">
            Enter both your order number and the phone number used at checkout to verify and view live delivery progress.
          </p>
        </div>

        <form
          onSubmit={handleTrack}
          className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="track-order-num" className="block text-xs font-semibold text-[#344054] mb-1.5">
                Order Number *
              </label>
              <input
                id="track-order-num"
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. GH-2026-1042"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] font-mono text-sm text-[#101828] focus:outline-none focus:border-[#155EEF]"
              />
            </div>

            <div>
              <label htmlFor="track-phone" className="block text-xs font-semibold text-[#344054] mb-1.5">
                Checkout Phone Number *
              </label>
              <input
                id="track-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +971505550188"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#667085] inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#155EEF] shrink-0" />
              <span>Phone verification protects your personal address and order details.</span>
            </p>
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:opacity-60 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Verifying...' : 'Track Order'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-sm text-[#B42318]">
              {errorMsg}
            </div>
          )}
        </form>

        {/* Verified Order Timeline */}
        {order && (
          <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#EAECF0]">
              <div>
                <p className="text-xs text-[#667085]">Verified Order</p>
                <h2 className="font-mono text-xl font-bold text-[#101828] mt-0.5">
                  {order.order_number}
                </h2>
                <p className="text-xs text-[#667085] mt-1">
                  Placed {new Date(order.created_at).toLocaleDateString()} · {order.city}, {order.country}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#667085]">Total (Cash on Delivery)</p>
                <p className="text-xl font-bold text-[#101828] tabular-nums mt-0.5">
                  ${order.total_amount.toFixed(2)}
                </p>
                <p className="text-xs font-medium text-[#344054] capitalize mt-0.5">
                  Payment: {order.payment_status}
                </p>
              </div>
            </div>

            {order.order_status === 'cancelled' ? (
              <div className="p-5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] flex items-center gap-3 text-[#B42318]">
                <XCircle className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Order Cancelled</p>
                  <p className="text-xs mt-0.5">
                    This order has been cancelled and reserved inventory was released.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#101828]">Delivery Progress</h3>
                <ol className="space-y-4">
                  {TIMELINE_STEPS.map((step, idx) => {
                    const completed = idx <= activeStepIndex;
                    const current = idx === activeStepIndex;
                    return (
                      <li key={step.key} className="flex items-start gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                            completed
                              ? 'bg-[#155EEF] border-[#155EEF] text-white'
                              : 'bg-white border-[#D0D5DD] text-[#98A2B3]'
                          }`}
                        >
                          {idx === 3 ? (
                            <Truck className="w-4 h-4" />
                          ) : idx === 4 ? (
                            <PackageCheck className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </div>
                        <div className="pt-0.5">
                          <p
                            className={`text-sm font-semibold ${
                              current
                                ? 'text-[#155EEF]'
                                : completed
                                ? 'text-[#101828]'
                                : 'text-[#667085]'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs text-[#667085] mt-0.5">{step.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* Items */}
            <div className="pt-4 border-t border-[#EAECF0] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#667085]">
                <span>Items in this order</span>
                <span className="inline-flex items-center gap-1 font-medium text-[#101828]">
                  <Banknote className="w-3.5 h-3.5 text-[#155EEF]" />
                  Cash on Delivery
                </span>
              </div>
              <div className="divide-y divide-[#EAECF0] border border-[#EAECF0] rounded-xl overflow-hidden">
                {order.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex justify-between text-sm">
                    <span className="text-[#101828] font-medium">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="font-semibold text-[#101828] tabular-nums">
                      ${item.total_price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
