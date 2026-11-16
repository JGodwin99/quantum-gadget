import React, { useEffect, useState } from 'react';
import { Banknote, LogOut, Package, Save, User } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types/store';

export function AccountPage() {
  const { user, authToken, logout, updateProfile, setAuthModalOpen, navigate } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [country, setCountry] = useState(user?.country ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone);
      setCountry(user.country);
      setCity(user.city);
      setAddress(user.address);
    }
  }, [user]);

  useEffect(() => {
    if (!authToken || !user) {
      setLoadingOrders(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/customer/orders', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (active) setOrders(data.orders ?? []);
        }
      } finally {
        if (active) setLoadingOrders(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authToken, user]);

  if (!user) {
    return (
      <div className="bg-[#F5F7FB] min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#101828]">Customer Account</h1>
          <p className="text-sm text-[#667085]">
            Sign in to view your previous orders, manage delivery details, and track shipments. Guest checkout is always available without an account.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="h-11 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
          >
            Sign In or Register
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ full_name: fullName, phone, country, city, address });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-[#F5F7FB] min-h-[80vh] py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#101828]">My Account</h1>
            <p className="text-sm text-[#667085] mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="h-10 px-4 rounded-lg bg-[#050B18] text-white text-sm font-semibold hover:bg-[#155EEF]"
              >
                Open Admin Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="h-10 px-4 rounded-lg border border-[#D0D5DD] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F5F7FB] inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Profile Form */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-5 bg-white border border-[#EAECF0] rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
              <User className="w-5 h-5 text-[#155EEF]" />
              <h2 className="font-display text-lg font-bold text-[#101828]">Delivery Profile</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Default Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full h-11 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] inline-flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </form>

          {/* Order History */}
          <div className="lg:col-span-7 bg-white border border-[#EAECF0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#155EEF]" />
                <h2 className="font-display text-lg font-bold text-[#101828]">My Orders</h2>
              </div>
              <span className="text-xs text-[#667085] tabular-nums">{orders.length} total</span>
            </div>

            {loadingOrders ? (
              <div className="py-10 text-center text-sm text-[#667085]">Loading your orders...</div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm font-medium text-[#344054]">You have not placed any orders yet.</p>
                <button
                  type="button"
                  onClick={() => navigate('/shop')}
                  className="h-10 px-5 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#EAECF0]">
                {orders.map((order) => {
                  const expanded = expandedOrderId === order.id;
                  return (
                    <div key={order.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-bold text-[#101828]">
                            {order.order_number}
                          </p>
                          <p className="text-xs text-[#667085] mt-0.5">
                            {new Date(order.created_at).toLocaleDateString()} · {order.items.length} item(s)
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#101828] tabular-nums">
                              ${order.total_amount.toFixed(2)}
                            </p>
                            <p className="text-xs font-medium text-[#344054] capitalize">
                              {order.order_status} · {order.payment_status}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                            className="h-9 px-3 rounded-lg border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB]"
                          >
                            {expanded ? 'Hide' : 'Details'}
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-4 p-4 rounded-xl bg-[#F5F7FB] border border-[#EAECF0] space-y-3 text-xs">
                          <div className="flex flex-wrap justify-between gap-2 text-[#475467]">
                            <span>
                              Deliver to: <strong className="text-[#101828]">{order.delivery_address}, {order.city}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[#101828]">
                              <Banknote className="w-3.5 h-3.5 text-[#155EEF]" />
                              Cash on Delivery
                            </span>
                          </div>
                          <div className="divide-y divide-[#EAECF0] border-t border-[#EAECF0] pt-2">
                            {order.items.map((it) => (
                              <div key={it.id} className="py-1.5 flex justify-between">
                                <span className="text-[#101828]">
                                  {it.product_name} × {it.quantity}
                                </span>
                                <span className="font-semibold tabular-nums text-[#101828]">
                                  ${it.total_price.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
