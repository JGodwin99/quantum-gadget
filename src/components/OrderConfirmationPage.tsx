import React from 'react';
import { ArrowRight, Banknote, CheckCircle2, MapPin, Package } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function OrderConfirmationPage() {
  const { lastConfirmedOrder, navigate } = useStore();

  if (!lastConfirmedOrder) {
    return (
      <div className="bg-[#F5F7FB] min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="font-display text-2xl font-bold text-[#101828]">No Recent Order</h1>
          <p className="mt-2 text-sm text-[#667085]">
            You can track an existing order using your order number and phone number.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/track-order')}
              className="h-11 px-5 rounded-lg border border-[#D0D5DD] text-sm font-semibold text-[#101828] hover:bg-[#F5F7FB]"
            >
              Track Order
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="h-11 px-5 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  const order = lastConfirmedOrder;

  return (
    <div className="bg-[#F5F7FB] min-h-[80vh] py-12 lg:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 pb-6 border-b border-[#EAECF0]">
            <div className="w-14 h-14 rounded-full bg-[#ECFDF3] text-[#15803D] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#101828]">
              Thank You for Your Order!
            </h1>
            <p className="text-sm sm:text-base text-[#475467] max-w-lg mx-auto">
              Your order has been received successfully. We will contact you to confirm your delivery details.
            </p>
          </div>

          {/* Core Order Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F5F7FB] border border-[#EAECF0] rounded-xl p-5 text-sm">
            <div>
              <p className="text-xs text-[#667085]">Order Number</p>
              <p className="font-mono font-bold text-[#101828] mt-0.5">{order.order_number}</p>
            </div>
            <div>
              <p className="text-xs text-[#667085]">Customer Name</p>
              <p className="font-semibold text-[#101828] mt-0.5">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-[#667085]">Payment Method</p>
              <p className="font-semibold text-[#101828] mt-0.5 inline-flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-[#155EEF]" />
                <span>Cash on Delivery</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-[#667085]">Order Status</p>
              <p className="font-semibold text-[#B45309] mt-0.5 capitalize">{order.order_status}</p>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-[#EAECF0]">
              <p className="text-xs text-[#667085] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Delivery Address</span>
              </p>
              <p className="font-medium text-[#101828] mt-0.5">
                {order.delivery_address}, {order.city}, {order.country}
              </p>
            </div>
          </div>

          {/* Ordered Items */}
          <div>
            <h2 className="text-sm font-semibold text-[#101828] mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#155EEF]" />
              <span>Products Ordered</span>
            </h2>
            <div className="divide-y divide-[#EAECF0] border border-[#EAECF0] rounded-xl overflow-hidden">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 flex items-center justify-between gap-4 text-sm bg-white"
                >
                  <div>
                    <p className="font-semibold text-[#101828]">{item.product_name}</p>
                    <p className="text-xs text-[#667085] tabular-nums">
                      Qty {item.quantity} × ${item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <span className="font-semibold text-[#101828] tabular-nums">
                    ${item.total_price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-[#475467]">
                <span>Subtotal</span>
                <span className="tabular-nums">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#475467]">
                <span>Delivery Fee</span>
                <span className="tabular-nums">
                  {order.delivery_fee === 0 ? 'Free' : `$${order.delivery_fee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EAECF0] text-base font-bold text-[#101828]">
                <span>Total Amount Payable on Delivery (USD)</span>
                <span className="tabular-nums">${order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="h-12 px-7 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] inline-flex items-center justify-center gap-2"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/track-order')}
              className="h-12 px-6 rounded-lg border border-[#D0D5DD] text-sm font-semibold text-[#101828] hover:bg-[#F5F7FB]"
            >
              Track Order Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
