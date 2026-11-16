import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Box,
  CheckCircle2,
  ClipboardList,
  Database,
  Edit3,
  FolderTree,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PRESET_GALLERY_OPTIONS } from '../lib/imageRegistry';
import type {
  AdminOverviewMetrics,
  Category,
  DeliveryZone,
  InventoryMovement,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  StoreSettings,
  SupabaseSchemaInfo,
} from '../types/store';
import { StudioImage } from './StudioImage';

type AdminTab = 'overview' | 'orders' | 'products' | 'categories' | 'inventory' | 'zones';

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

export function AdminDashboard() {
  const { user, authToken, login, logout, backendMode, notify, refreshCatalog, navigate } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);

  // Admin Sign-in State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard Data
  const [overview, setOverview] = useState<AdminOverviewMetrics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [schemaInfo, setSchemaInfo] = useState<SupabaseSchemaInfo | null>(null);

  // Orders Filter & Detail
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Product Editor Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Editor
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  // Inventory Adjustment
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('10');
  const [adjustType, setAdjustType] = useState<'restock' | 'adjustment'>('restock');
  const [adjustReason, setAdjustReason] = useState('');

  // Zone Editor
  const [editingZone, setEditingZone] = useState<Partial<DeliveryZone> | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!authToken || user?.role !== 'admin') return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load dashboard.');
      setOverview(data.overview);
      setOrders(data.orders ?? []);
      setProducts(data.products ?? []);
      setCategories(data.categories ?? []);
      setZones(data.zones ?? []);
      setMovements(data.movements ?? []);
      setStoreSettings(data.settings ?? null);
      setSchemaInfo(data.schema ?? null);
      if (!adjustProductId && data.products?.length > 0) {
        setAdjustProductId(data.products[0].id);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Admin load error.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authToken, user?.role, notify, adjustProductId]);

  useEffect(() => {
    if (user?.role === 'admin' && authToken) {
      loadDashboard();
    }
  }, [user?.role, authToken, loadDashboard]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.order_status !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const lowStockList = useMemo(
    () => products.filter((p) => p.is_active && p.stock_quantity <= p.low_stock_threshold),
    [products]
  );

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const logged = await login(loginEmail, loginPassword);
      if (logged.role !== 'admin') {
        setLoginError('This account is not registered in the admins table.');
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleOrderUpdate = async (
    orderId: string,
    patch: { order_status?: OrderStatus; payment_status?: PaymentStatus }
  ) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Order update failed.');
      notify('Order updated.', 'success');
      if (selectedOrder?.id === orderId) setSelectedOrder(data.order);
      await Promise.all([loadDashboard(), refreshCatalog()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to update order.', 'error');
    }
  };

  const handleImageFileUpload = async (file: File) => {
    if (!authToken) return;
    setUploadingImage(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? '');
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          base64Data,
          contentType: file.type || 'image/jpeg',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Image upload failed.');
      setEditingProduct((prev) => (prev ? { ...prev, image_url: data.url } : prev));
      notify('Image uploaded.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Image upload failed.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !editingProduct) return;
    setSavingProduct(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save product.');
      setEditingProduct(null);
      notify('Product saved.', 'success');
      await Promise.all([loadDashboard(), refreshCatalog()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeactivateProduct = async (productId: string, hard = false) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}?hard=${hard}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Action failed.');
      }
      notify(hard ? 'Product deleted.' : 'Product deactivated.', 'info');
      await Promise.all([loadDashboard(), refreshCatalog()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Action failed.', 'error');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !editingCategory) return;
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(editingCategory),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save category.');
      setEditingCategory(null);
      notify('Category saved.', 'success');
      await Promise.all([loadDashboard(), refreshCatalog()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed.', 'error');
    }
  };

  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const delta = parseInt(adjustDelta, 10);
    if (Number.isNaN(delta) || delta === 0) {
      notify('Enter a non-zero quantity change.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          product_id: adjustProductId,
          delta,
          movement_type: adjustType,
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Adjustment failed.');
      setAdjustReason('');
      notify('Inventory updated and logged.', 'success');
      await Promise.all([loadDashboard(), refreshCatalog()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Adjustment failed.', 'error');
    }
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !editingZone) return;
    try {
      const res = await fetch('/api/admin/delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(editingZone),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save zone.');
      setEditingZone(null);
      notify('Delivery zone saved.', 'success');
      await Promise.all([loadDashboard(), refreshCatalog()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save zone.', 'error');
    }
  };

  // Unauthorized / Admin Login Gate (No public admin registration)
  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-[#050B18] min-h-[82vh] flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl border border-[#EAECF0] p-8 max-w-md w-full space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#050B18] text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#101828]">
                GizmoHub Admin Console
              </h1>
              <p className="text-xs text-[#667085]">
                Restricted to the authorized administrator in Supabase.
              </p>
            </div>
          </div>

          {user && user.role !== 'admin' && (
            <div className="p-3.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318]">
              Signed in as {user.email} (Customer). Sign out or sign in with your administrator credentials.
            </div>
          )}

          {loginError && (
            <div className="p-3.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318]">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Administrator Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@gizmohub.store"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm focus:outline-none focus:border-[#155EEF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm focus:outline-none focus:border-[#155EEF]"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full h-11 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:opacity-60"
            >
              {loggingIn ? 'Verifying...' : 'Sign In to Admin Console'}
            </button>
          </form>

          {backendMode === 'local_preview' && (
            <div className="pt-4 border-t border-[#EAECF0] text-xs text-[#667085] flex items-center justify-between">
              <span>Preview Admin: admin@gizmohub.store</span>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@gizmohub.store');
                  setLoginPassword('AdminDemo!2026');
                }}
                className="text-[#155EEF] font-semibold hover:underline"
              >
                Fill Credentials
              </button>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs font-medium text-[#667085] hover:text-[#101828]"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F7FB] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#EAECF0]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#155EEF]">
              Operations Console · {backendMode === 'supabase' ? 'Supabase Connected' : 'Local Preview Mode'}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#101828]">
              GizmoHub Admin Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="h-10 px-3.5 rounded-lg border border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB] inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="h-10 px-3.5 rounded-lg bg-[#050B18] text-white text-xs font-semibold hover:bg-[#155EEF] inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 py-5">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'orders', label: 'Orders', icon: ClipboardList },
            { id: 'products', label: 'Products', icon: Box },
            { id: 'categories', label: 'Categories', icon: FolderTree },
            { id: 'inventory', label: 'Inventory', icon: Archive },
            { id: 'zones', label: 'Zones & Database', icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as AdminTab)}
                className={`h-10 px-4 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#155EEF] text-white'
                    : 'bg-white border border-[#EAECF0] text-[#344054] hover:bg-[#F5F7FB]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && overview && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#667085]">Paid Sales Revenue</p>
                <p className="mt-2 text-2xl font-bold text-[#101828] tabular-nums">
                  ${overview.paidSalesRevenue.toFixed(2)}
                </p>
                <p className="mt-1 text-[11px] text-[#667085]">
                  Excludes ${overview.unpaidCodPendingValue.toFixed(2)} unpaid COD
                </p>
              </div>
              <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#667085]">Total Orders</p>
                <p className="mt-2 text-2xl font-bold text-[#101828] tabular-nums">
                  {overview.totalOrders}
                </p>
                <p className="mt-1 text-[11px] text-[#667085] tabular-nums">
                  {overview.pendingOrders} pending · {overview.confirmedOrders} confirmed
                </p>
              </div>
              <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#667085]">Delivered Orders</p>
                <p className="mt-2 text-2xl font-bold text-[#101828] tabular-nums">
                  {overview.deliveredOrders}
                </p>
                <p className="mt-1 text-[11px] text-[#667085]">Fulfilled COD deliveries</p>
              </div>
              <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#667085]">Catalog & Stock Alerts</p>
                <p className="mt-2 text-2xl font-bold text-[#101828] tabular-nums">
                  {overview.totalProducts}
                </p>
                <p className="mt-1 text-[11px] font-medium text-[#B45309] tabular-nums">
                  {overview.lowStockProducts} low-stock products
                </p>
              </div>
            </div>

            {lowStockList.length > 0 && (
              <div className="bg-white border border-[#EAECF0] rounded-xl p-6">
                <div className="flex items-center gap-2 text-[#B45309] mb-4">
                  <AlertTriangle className="w-5 h-5" />
                  <h2 className="font-display text-lg font-bold text-[#101828]">
                    Low-Stock Warnings
                  </h2>
                </div>
                <div className="divide-y divide-[#EAECF0]">
                  {lowStockList.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-[#101828]">{p.name}</p>
                        <p className="text-xs text-[#667085]">{p.brand}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs font-semibold text-[#B42318] tabular-nums">
                          {p.stock_quantity} remaining
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustProductId(p.id);
                            setTab('inventory');
                          }}
                          className="h-8 px-3 rounded-lg border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB]"
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#EAECF0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search order #, customer name, or phone..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D0D5DD] text-sm"
                />
              </div>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
              >
                <option value="all">All Statuses</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-[#EAECF0] rounded-xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F5F7FB] border-b border-[#EAECF0] text-xs uppercase text-[#667085]">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">Total (USD)</th>
                    <th className="px-4 py-3">Order Status</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#F5F7FB]/50">
                      <td className="px-4 py-3 font-mono font-semibold text-[#101828] whitespace-nowrap">
                        {o.order_number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#101828]">{o.customer_name}</p>
                        <p className="text-xs text-[#667085]">{o.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#475467]">
                        {o.city}, {o.country}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#101828]">
                        ${o.total_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.order_status}
                          onChange={(e) =>
                            handleOrderUpdate(o.id, { order_status: e.target.value as OrderStatus })
                          }
                          className="h-8 px-2 rounded border border-[#D0D5DD] bg-white text-xs capitalize"
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.payment_status}
                          onChange={(e) =>
                            handleOrderUpdate(o.id, { payment_status: e.target.value as PaymentStatus })
                          }
                          className="h-8 px-2 rounded border border-[#D0D5DD] bg-white text-xs capitalize"
                        >
                          {PAYMENT_STATUSES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="h-8 px-3 rounded-lg border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB]"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedOrder && (
              <div className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
                  <h3 className="font-display text-lg font-bold text-[#101828]">
                    Order {selectedOrder.order_number} Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs font-semibold text-[#667085] hover:text-[#101828]"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-[#667085]">Customer</p>
                    <p className="font-semibold text-[#101828] mt-0.5">{selectedOrder.customer_name}</p>
                    <p className="text-[#475467]">{selectedOrder.customer_phone}</p>
                    {selectedOrder.customer_email && (
                      <p className="text-[#475467]">{selectedOrder.customer_email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[#667085]">Delivery Address</p>
                    <p className="font-medium text-[#101828] mt-0.5">
                      {selectedOrder.delivery_address}
                    </p>
                    <p className="text-[#475467]">
                      {selectedOrder.city}, {selectedOrder.country}
                    </p>
                    {selectedOrder.delivery_instructions && (
                      <p className="text-[#667085] mt-1">
                        Note: {selectedOrder.delivery_instructions}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[#667085]">COD Payment</p>
                    <p className="font-semibold text-[#101828] mt-0.5 tabular-nums">
                      Subtotal ${selectedOrder.subtotal.toFixed(2)} + Delivery $
                      {selectedOrder.delivery_fee.toFixed(2)} = $
                      {selectedOrder.total_amount.toFixed(2)}
                    </p>
                    <p className="text-[#475467] capitalize mt-0.5">
                      Status: {selectedOrder.order_status} · Payment: {selectedOrder.payment_status}
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-[#EAECF0] border border-[#EAECF0] rounded-lg">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="px-4 py-2.5 flex justify-between text-xs">
                      <span className="font-medium text-[#101828]">
                        {it.product_name} × {it.quantity}
                      </span>
                      <span className="tabular-nums font-semibold">${it.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-lg font-bold text-[#101828]">
                Product Catalog ({products.length})
              </h2>
              <button
                type="button"
                onClick={() =>
                  setEditingProduct({
                    name: '',
                    brand: '',
                    category_id: categories[0]?.id ?? null,
                    description: '',
                    price: 99,
                    discount_price: null,
                    stock_quantity: 10,
                    low_stock_threshold: 5,
                    image_url: PRESET_GALLERY_OPTIONS[0].value,
                    is_active: true,
                    is_featured: true,
                  })
                }
                className="h-10 px-4 rounded-lg bg-[#155EEF] text-white text-xs font-semibold hover:bg-[#2563EB] inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            {editingProduct && (
              <form
                onSubmit={handleSaveProduct}
                className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
                  <h3 className="font-display text-base font-bold text-[#101828]">
                    {editingProduct.id ? 'Edit Product' : 'New Product'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="text-xs text-[#667085] hover:text-[#101828]"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name ?? ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, name: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">Brand *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.brand ?? ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, brand: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Category
                    </label>
                    <select
                      value={editingProduct.category_id ?? ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, category_id: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Price (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editingProduct.price ?? 0}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Discount Price (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingProduct.discount_price ?? ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          discount_price: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingProduct.stock_quantity ?? 0}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          stock_quantity: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editingProduct.description ?? ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, description: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#D0D5DD] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Product Image URL or Gallery Preset
                    </label>
                    <select
                      value={editingProduct.image_url ?? ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, image_url: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                    >
                      {PRESET_GALLERY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {editingProduct.image_url &&
                        !PRESET_GALLERY_OPTIONS.some((o) => o.value === editingProduct.image_url) && (
                          <option value={editingProduct.image_url}>Uploaded / Custom Image</option>
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[#D0D5DD] bg-[#F5F7FB] text-xs font-semibold text-[#344054] cursor-pointer hover:bg-[#EAECF0]">
                      <Upload className="w-4 h-4" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageFileUpload(f);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-medium text-[#344054]">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingProduct.is_active ?? true}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, is_active: e.target.checked })
                      }
                    />
                    <span>Active in Storefront</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingProduct.is_featured ?? false}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, is_featured: e.target.checked })
                      }
                    />
                    <span>Featured on Homepage</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={savingProduct}
                  className="h-10 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
                >
                  {savingProduct ? 'Saving...' : 'Save Product'}
                </button>
              </form>
            )}

            <div className="bg-white border border-[#EAECF0] rounded-xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F5F7FB] border-b border-[#EAECF0] text-xs uppercase text-[#667085]">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-9 rounded bg-[#F5F7FB] overflow-hidden shrink-0">
                            <StudioImage src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#101828]">{p.name}</p>
                            <p className="text-xs text-[#667085]">{p.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#475467]">{p.category_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="font-semibold text-[#101828]">
                          ${(p.discount_price ?? p.price).toFixed(2)}
                        </span>
                        {p.discount_price && (
                          <span className="block text-xs text-[#667085] line-through">
                            ${p.price.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {p.stock_quantity}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {p.is_active ? (
                          <span className="text-[#166534]">Active</span>
                        ) : (
                          <span className="text-[#667085]">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="p-1.5 rounded border border-[#D0D5DD] text-[#344054] hover:bg-[#F5F7FB]"
                          title="Edit product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeactivateProduct(p.id, !p.is_active)}
                          className="p-1.5 rounded border border-[#D0D5DD] text-[#B42318] hover:bg-[#FEF3F2]"
                          title={p.is_active ? 'Deactivate' : 'Delete permanently'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {tab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-lg font-bold text-[#101828]">
                Categories ({categories.length})
              </h2>
              <button
                type="button"
                onClick={() =>
                  setEditingCategory({
                    name: '',
                    description: '',
                    image_url: PRESET_GALLERY_OPTIONS[0].value,
                    is_active: true,
                  })
                }
                className="h-10 px-4 rounded-lg bg-[#155EEF] text-white text-xs font-semibold hover:bg-[#2563EB] inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            {editingCategory && (
              <form
                onSubmit={handleSaveCategory}
                className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingCategory.name ?? ''}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, name: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Category Image
                    </label>
                    <select
                      value={editingCategory.image_url ?? PRESET_GALLERY_OPTIONS[0].value}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, image_url: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                    >
                      {PRESET_GALLERY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingCategory.description ?? ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, description: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#344054]">
                  <input
                    type="checkbox"
                    checked={editingCategory.is_active ?? true}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, is_active: e.target.checked })
                    }
                  />
                  <span>Active Category</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-lg bg-[#155EEF] text-white text-sm font-semibold"
                  >
                    Save Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="h-10 px-4 rounded-lg border border-[#D0D5DD] text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-[#F5F7FB]">
                    <StudioImage src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="font-semibold text-[#101828]">{cat.name}</p>
                      <p className="text-xs text-[#667085] mt-0.5">
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(cat)}
                      className="h-9 rounded-lg border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB]"
                    >
                      Edit Category
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab === 'inventory' && (
          <div className="space-y-6">
            <form
              onSubmit={handleAdjustInventory}
              className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-[#101828]">
                Record Stock Adjustment
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Product</label>
                  <select
                    value={adjustProductId}
                    onChange={(e) => setAdjustProductId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Current: {p.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Movement Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as 'restock' | 'adjustment')}
                    className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  >
                    <option value="restock">Restock (+)</option>
                    <option value="adjustment">Audit Adjustment (+/-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Quantity Change
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm tabular-nums"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason (e.g. Supplier shipment #408 or physical cycle count)"
                  className="flex-1 h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                />
                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] whitespace-nowrap"
                >
                  Apply Stock Change
                </button>
              </div>
            </form>

            <div className="bg-white border border-[#EAECF0] rounded-xl overflow-x-auto">
              <div className="px-5 py-4 border-b border-[#EAECF0]">
                <h3 className="font-display text-base font-bold text-[#101828]">
                  Inventory Movement Audit Log
                </h3>
              </div>
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F5F7FB] border-b border-[#EAECF0] text-xs uppercase text-[#667085]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Change</th>
                    <th className="px-4 py-3 text-right">Stock After</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-xs text-[#667085] whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#101828]">{m.product_name}</td>
                      <td className="px-4 py-3 text-xs capitalize text-[#475467]">
                        {m.movement_type.replace(/_/g, ' ')}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                          m.change_quantity > 0 ? 'text-[#166534]' : 'text-[#B42318]'
                        }`}
                      >
                        {m.change_quantity > 0 ? `+${m.change_quantity}` : m.change_quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#101828]">
                        {m.new_quantity}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#475467]">{m.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ZONES & SUPABASE INSPECTOR TAB */}
        {tab === 'zones' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[#101828]">
                  Active Delivery Zones
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setEditingZone({
                      name: '',
                      country: '',
                      city: '',
                      delivery_fee: 10,
                      free_shipping_threshold: storeSettings?.free_shipping_threshold ?? 150,
                      estimated_delivery_days: '2-3 business days',
                      is_active: true,
                    })
                  }
                  className="h-9 px-3.5 rounded-lg bg-[#155EEF] text-white text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Zone</span>
                </button>
              </div>

              {editingZone && (
                <form
                  onSubmit={handleSaveZone}
                  className="p-4 rounded-xl bg-[#F5F7FB] border border-[#EAECF0] grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="Zone Name"
                    value={editingZone.name ?? ''}
                    onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                    className="h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Country"
                    value={editingZone.country ?? ''}
                    onChange={(e) => setEditingZone({ ...editingZone, country: e.target.value })}
                    className="h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="City (optional)"
                    value={editingZone.city ?? ''}
                    onChange={(e) => setEditingZone({ ...editingZone, city: e.target.value })}
                    className="h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Fee (USD)"
                    value={editingZone.delivery_fee ?? 10}
                    onChange={(e) =>
                      setEditingZone({ ...editingZone, delivery_fee: Number(e.target.value) })
                    }
                    className="h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Free Over (USD)"
                    value={editingZone.free_shipping_threshold ?? ''}
                    onChange={(e) =>
                      setEditingZone({
                        ...editingZone,
                        free_shipping_threshold: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Estimated Window"
                    value={editingZone.estimated_delivery_days ?? ''}
                    onChange={(e) =>
                      setEditingZone({ ...editingZone, estimated_delivery_days: e.target.value })
                    }
                    className="h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  />
                  <div className="sm:col-span-3 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={editingZone.is_active ?? true}
                        onChange={(e) =>
                          setEditingZone({ ...editingZone, is_active: e.target.checked })
                        }
                      />
                      <span>Zone Active</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingZone(null)}
                        className="h-9 px-4 rounded-lg border border-[#D0D5DD] bg-white text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-9 px-4 rounded-lg bg-[#155EEF] text-white text-xs font-semibold"
                      >
                        Save Zone
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="divide-y divide-[#EAECF0]">
                {zones.map((z) => (
                  <div key={z.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-[#101828]">
                        {z.name} ({z.city ? `${z.city}, ` : ''}
                        {z.country})
                      </p>
                      <p className="text-xs text-[#667085] tabular-nums">
                        Fee: ${z.delivery_fee.toFixed(2)} · Free over:{' '}
                        {z.free_shipping_threshold ? `$${z.free_shipping_threshold}` : 'None'} ·{' '}
                        {z.estimated_delivery_days}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingZone(z)}
                      className="h-8 px-3 rounded-lg border border-[#D0D5DD] text-xs font-semibold"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Supabase Schema Inspector */}
            {schemaInfo && (
              <div className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#155EEF]" />
                  <h2 className="font-display text-lg font-bold text-[#101828]">
                    Supabase Integration Inspector
                  </h2>
                </div>
                <p className="text-xs text-[#475467]">
                  Mode: <strong className="text-[#101828]">{schemaInfo.mode}</strong> · URL
                  configured: {String(schemaInfo.urlConfigured)} · Publishable key:{' '}
                  {String(schemaInfo.publishableKeyConfigured)} · Server Secret key:{' '}
                  {String(schemaInfo.secretKeyConfigured)}
                </p>

                {schemaInfo.notes.map((n, i) => (
                  <p key={i} className="text-xs text-[#667085]">
                    {n}
                  </p>
                ))}

                {Object.keys(schemaInfo.tablesDetected).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {Object.entries(schemaInfo.tablesDetected).map(([tbl, info]) => (
                      <div
                        key={tbl}
                        className="p-3 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-[#101828]">
                          <span>{tbl}</span>
                          {info.exists ? (
                            <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[#B42318]" />
                          )}
                        </div>
                        <p className="text-[#667085] mt-1">
                          {info.exists
                            ? `${info.rowCount ?? 0} rows · ${info.columns.length} cols`
                            : 'Not detected'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
