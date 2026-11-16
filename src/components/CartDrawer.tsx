import React, { useMemo, useState } from 'react';
import { Banknote, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { getEffectivePrice, useStore } from '../context/StoreContext';
import { StudioImage } from './StudioImage';

export function CartDrawer() {
  const {
    cart,
    cartCount,
    cartSubtotal,
    isCartOpen,
    setCartOpen,
    updateCartQuantity,
    removeFromCart,
    deliveryZones,
    settings,
    navigate,
  } = useStore();
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  const activeZones = useMemo(() => deliveryZones.filter((z) => z.is_active), [deliveryZones]);
  const selectedZone = useMemo(
    () => activeZones.find((z) => z.id === selectedZoneId) ?? null,
    [activeZones, selectedZoneId]
  );

  const estimatedDeliveryFee = useMemo(() => {
    if (!selectedZone) return null;
    const threshold = selectedZone.free_shipping_threshold ?? settings.free_shipping_threshold;
    if (threshold !== null && cartSubtotal >= threshold) return 0;
    return selectedZone.delivery_fee;
  }, [cartSubtotal, selectedZone, settings.free_shipping_threshold]);

  const estimatedTotal = useMemo(() => {
    if (estimatedDeliveryFee === null) return cartSubtotal;
    return Number((cartSubtotal + estimatedDeliveryFee).toFixed(2));
  }, [cartSubtotal, estimatedDeliveryFee]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Cart">
      <div
        className="fixed inset-0 bg-[#050B18]/45 backdrop-blur-[1px]"
        onClick={() => setCartOpen(false)}
      />

      <aside className="relative z-10 w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-[#EAECF0]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAECF0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#155EEF]" />
            <h2 className="font-display text-lg font-bold text-[#101828]">
              Shopping Cart <span className="text-sm font-medium text-[#667085] tabular-nums">({cartCount})</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#667085] hover:bg-[#F5F7FB] hover:text-[#101828]"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F5F7FB] flex items-center justify-center mx-auto mb-3 text-[#667085]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-[#101828]">Your cart is empty</p>
              <p className="mt-1 text-sm text-[#667085]">
                Explore our latest gadgets and pay safely with Cash on Delivery.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="mt-5 h-10 px-5 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const unit = getEffectivePrice(item.product);
              return (
                <div
                  key={item.product.id}
                  className="flex gap-4 pb-4 border-b border-[#EAECF0] last:border-b-0"
                >
                  <div className="w-20 h-16 rounded-lg bg-[#F5F7FB] overflow-hidden shrink-0 border border-[#EAECF0]">
                    <StudioImage
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/product/${item.product.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setCartOpen(false);
                          navigate(`/product/${item.product.slug}`);
                        }}
                        className="text-sm font-semibold text-[#101828] hover:text-[#155EEF] line-clamp-2"
                      >
                        {item.product.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-[#667085] hover:text-[#D92D20] rounded"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="mt-0.5 text-xs text-[#667085]">{item.product.brand}</p>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#D0D5DD] rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#344054] hover:bg-[#F5F7FB] rounded-l-lg"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold tabular-nums text-[#101828]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.product.stock_quantity}
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#344054] hover:bg-[#F5F7FB] disabled:opacity-40 rounded-r-lg"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-[#101828] tabular-nums">
                        ${(unit * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary & Checkout Footer */}
        {cart.length > 0 && (
          <div className="border-t border-[#EAECF0] bg-[#F5F7FB] px-6 py-5 space-y-4">
            {/* Delivery Zone Estimator */}
            {activeZones.length > 0 && (
              <div>
                <label
                  htmlFor="cart-zone-select"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#344054] mb-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-[#155EEF]" />
                  <span>Estimate delivery fee by location</span>
                </label>
                <select
                  id="cart-zone-select"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none focus:border-[#155EEF]"
                >
                  <option value="">Select delivery city / country...</option>
                  {activeZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.country} {z.city ? `— ${z.city}` : ''} (${z.delivery_fee.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#475467]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#101828] tabular-nums">
                  ${cartSubtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#475467]">
                <span>Estimated Delivery</span>
                <span className="font-medium text-[#101828] tabular-nums">
                  {estimatedDeliveryFee === null
                    ? 'Calculated at checkout'
                    : estimatedDeliveryFee === 0
                    ? 'Free (Qualifying order)'
                    : `$${estimatedDeliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#D0D5DD] text-base font-bold text-[#101828]">
                <span>Total (USD)</span>
                <span className="tabular-nums">${estimatedTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#D0D5DD] text-xs font-medium text-[#101828]">
              <Banknote className="w-4 h-4 text-[#155EEF] shrink-0" />
              <span>Payment Method: Cash on Delivery</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setCartOpen(false);
                navigate('/checkout');
              }}
              className="w-full h-12 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors"
            >
              Proceed to Cash on Delivery Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
