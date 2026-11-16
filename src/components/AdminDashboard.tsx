import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Banknote,
  Box,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  DollarSign,
  Edit3,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  X,
  XCircle,
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

const TAB_LABELS: Record<AdminTab, string> = {
  overview: 'Overview',
  orders: 'Orders & COD Fulfillment',
  products: 'Product Catalog',
  categories: 'Categories',
  inventory: 'Inventory & Movements',
  zones: 'Delivery Zones & Settings',
};

const OPTIONAL_SUPABASE_SQL = `-- Optional GizmoHub SQL Migration (run in Supabase SQL Editor after review)
-- Creates store_settings, delivery_zones, and inventory_movements if missing

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null default 'GizmoHub',
  currency text not null default 'USD',
  cod_enabled boolean not null default true,
  free_shipping_threshold numeric default 150,
  default_low_stock_threshold integer not null default 5,
  support_email text not null default 'support@gizmohub.store',
  support_phone text not null default '+1 (800) 555-0194',
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  city text,
  delivery_fee numeric not null default 0,
  free_shipping_threshold numeric,
  estimated_delivery_days text not null default '2-4 business days',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  change_quantity integer not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  movement_type text not null,
  reason text not null,
  reference_id text,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.inventory_movements enable row level security;

create policy "Public read store_settings" on public.store_settings
  for select using (true);
create policy "Admin manage store_settings" on public.store_settings
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Public read active delivery_zones" on public.delivery_zones
  for select using (is_active = true);
create policy "Admin manage delivery_zones" on public.delivery_zones
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admin manage inventory_movements" on public.inventory_movements
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));

insert into public.store_settings (store_name, currency, cod_enabled, free_shipping_threshold)
select 'GizmoHub', 'USD', true, 150
where not exists (select 1 from public.store_settings);

insert into public.delivery_zones (name, country, city, delivery_fee, free_shipping_threshold, estimated_delivery_days)
select 'New York & Tri-State Metro', 'United States', 'New York', 8, 150, '1-2 business days'
where not exists (select 1 from public.delivery_zones);`;

function OrderStatusTag({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    pending: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    confirmed: 'bg-[#EFF4FF] text-[#155EEF] border-[#C7D7FE]',
    processing: 'bg-[#F5F7FB] text-[#344054] border-[#D0D5DD]',
    shipped: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
    delivered: 'bg-[#ECFDF3] text-[#166534] border-[#ABEFC6]',
    cancelled: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold capitalize whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function PaymentStatusTag({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    unpaid: 'bg-[#F5F7FB] text-[#475467] border-[#D0D5DD]',
    paid: 'bg-[#ECFDF3] text-[#166534] border-[#ABEFC6]',
    refunded: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold capitalize whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function AdminDashboard() {
  const {
    user,
    authToken,
    login,
    logout,
    backendMode,
    authMode,
    notify,
    refreshCatalog,
    navigate,
  } = useStore();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Admin Sign-in State
  const [loginEmail, setLoginEmail] = useState('godtime1999@gmail.com');
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

  // Orders Filter & Inspector
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Products Filter & Editor
  const [productSearch, setProductSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Editor
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  // Inventory Adjustment
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('10');
  const [adjustType, setAdjustType] = useState<'restock' | 'adjustment'>('restock');
  const [adjustReason, setAdjustReason] = useState('');

  // Zone & Store Settings Editor
  const [editingZone, setEditingZone] = useState<Partial<DeliveryZone> | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [seedingCatalog, setSeedingCatalog] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

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
        o.customer_phone.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.category_name ?? '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const lowStockList = useMemo(
    () => products.filter((p) => p.is_active && p.stock_quantity <= p.low_stock_threshold),
    [products]
  );

  const openProductEditor = (prod: Partial<Product>) => {
    setEditingProduct(prod);
    const entries = Object.entries(prod.specifications ?? {}).map(([key, value]) => ({
      key,
      value,
    }));
    setSpecRows(entries);
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const logged = await login(loginEmail.trim(), loginPassword);
      if (logged.role !== 'admin') {
        setLoginError('Access restricted: only the authorized administrator account is permitted.');
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
      const specifications: Record<string, string> = {};
      for (const row of specRows) {
        if (row.key.trim() && row.value.trim()) {
          specifications[row.key.trim()] = row.value.trim();
        }
      }

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ...editingProduct, specifications }),
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
      notify(hard ? 'Product removed.' : 'Product deactivated.', 'info');
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !storeSettings) return;
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(storeSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update store settings.');
      setStoreSettings(data.settings);
      notify('Store settings updated.', 'success');
      await refreshCatalog();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSeedStarterCatalog = async () => {
    if (!authToken) return;
    setSeedingCatalog(true);
    try {
      const res = await fetch('/api/admin/seed-starter-catalog', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Starter catalog import failed.');
      notify(
        `Imported ${data.categoriesInserted ?? 0} categories and ${data.productsInserted ?? 0} products to Supabase.`,
        'success'
      );
      await Promise.all([loadDashboard(), refreshCatalog()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Starter import failed.', 'error');
    } finally {
      setSeedingCatalog(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(OPTIONAL_SUPABASE_SQL);
      setCopiedSql(true);
      notify('SQL migration copied to clipboard.', 'success');
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      notify('Unable to access clipboard — select and copy manually.', 'error');
    }
  };

  // Unauthorized / Admin Sign-In Gate (No public admin registration)
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#050B18] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#EAECF0] p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-5">
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-[#050B18]">
                Gizmo<span className="text-[#155EEF]">Hub</span>
              </span>
              <p className="text-xs text-[#667085] mt-0.5">Store Operations Console</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#050B18] text-white flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-xl font-bold text-[#101828]">
              Administrator Sign In
            </h1>
            <p className="text-xs text-[#667085]">
              Restricted to the single authorized administrator account.
            </p>
          </div>

          {user && user.role !== 'admin' && (
            <div className="p-3.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] space-y-2">
              <p>
                Signed in as <strong>{user.email}</strong> (Customer role). Sign out to authenticate as the store administrator.
              </p>
              <button
                type="button"
                onClick={logout}
                className="font-semibold underline hover:no-underline"
              >
                Sign out current account
              </button>
            </div>
          )}

          {loginError && (
            <div className="p-3.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318]">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-[#344054] mb-1.5">
                Administrator Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="godtime1999@gmail.com"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-[#344054] mb-1.5">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full h-11 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:opacity-60 transition-colors"
            >
              {loggingIn ? 'Verifying Credentials...' : 'Sign In to Admin Console'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#EAECF0] flex items-center justify-between text-xs text-[#667085]">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 font-medium text-[#344054] hover:text-[#155EEF]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Storefront</span>
            </button>
            <span className="font-mono text-[11px] text-[#667085]">
              {authMode === 'supabase' ? 'Supabase Auth' : 'Preview Auth'}
            </span>
          </div>

          {backendMode === 'local_preview' && (
            <div className="p-3 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] text-[11px] text-[#475467] flex items-center justify-between gap-2">
              <span>Preview fallback password available if testing offline</span>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('godtime1999@gmail.com');
                  setLoginPassword('AdminDemo!2026');
                }}
                className="text-[#155EEF] font-semibold hover:underline whitespace-nowrap"
              >
                Fill Preview
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ClipboardList, count: overview?.pendingOrders },
    { id: 'products', label: 'Products', icon: Box, count: products.length },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'inventory', label: 'Inventory', icon: Archive, count: lowStockList.length },
    { id: 'zones', label: 'Zones & Settings', icon: Settings },
  ];

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#050B18] text-white w-64">
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
        <a
          href="/admin"
          onClick={(e) => {
            e.preventDefault();
            setTab('overview');
            setSidebarOpen(false);
          }}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap"
        >
          Gizmo<span className="text-[#2563EB]">Hub</span>
          <span className="ml-2 text-xs font-normal text-[#98A2B3]">Admin</span>
        </a>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 text-[#98A2B3] hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Admin sections">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full h-10 px-3.5 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                active
                  ? 'bg-[#155EEF] text-white font-semibold'
                  : 'text-[#D0D5DD] hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span
                  className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
                    active ? 'bg-white/20 text-white' : 'bg-white/10 text-[#D0D5DD]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Identity & Exit Actions */}
      <div className="p-4 border-t border-white/10 space-y-3 shrink-0">
        <div className="px-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-[#60A5FA] shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-[#98A2B3] truncate" title={user.id}>
            UID: {user.id.slice(0, 13)}…
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-9 px-2.5 rounded-lg border border-white/15 text-xs font-medium text-[#D0D5DD] hover:bg-white/10 hover:text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Storefront</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="h-9 px-2.5 rounded-lg border border-white/15 text-xs font-medium text-[#D0D5DD] hover:bg-white/10 hover:text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block shrink-0">{SidebarContent}</aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-[#050B18]/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full">{SidebarContent}</div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="h-16 bg-white border-b border-[#EAECF0] px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#344054] hover:bg-[#F5F7FB]"
              aria-label="Open admin menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-[#667085] hidden sm:inline">Admin Console</span>
              <span className="text-[#D0D5DD] hidden sm:inline">/</span>
              <h1 className="font-display font-bold text-[#101828] truncate">
                {TAB_LABELS[tab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-[#667085]">
              {backendMode === 'supabase' ? 'Live Supabase DB' : 'Preview Store'}
            </span>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="h-9 px-3.5 rounded-lg border border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1320px] w-full mx-auto space-y-6">
          {/* OVERVIEW TAB */}
          {tab === 'overview' && overview && (
            <div className="space-y-6">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#667085]">
                    <span>Paid Sales Revenue</span>
                    <DollarSign className="w-4 h-4 text-[#155EEF]" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-[#101828] tabular-nums">
                    ${overview.paidSalesRevenue.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-[#667085] tabular-nums">
                    Collected only · ${overview.unpaidCodPendingValue.toFixed(2)} unpaid COD
                  </p>
                </div>

                <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#667085]">
                    <span>Orders Overview</span>
                    <ClipboardList className="w-4 h-4 text-[#155EEF]" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-[#101828] tabular-nums">
                    {overview.totalOrders}
                  </p>
                  <p className="mt-1 text-xs text-[#667085] tabular-nums">
                    {overview.pendingOrders} pending · {overview.confirmedOrders} confirmed
                  </p>
                </div>

                <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#667085]">
                    <span>Delivered Orders</span>
                    <Truck className="w-4 h-4 text-[#15803D]" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-[#101828] tabular-nums">
                    {overview.deliveredOrders}
                  </p>
                  <p className="mt-1 text-xs text-[#667085]">Completed COD shipments</p>
                </div>

                <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#667085]">
                    <span>Catalog & Stock Alerts</span>
                    <Package className="w-4 h-4 text-[#B45309]" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-[#101828] tabular-nums">
                    {overview.totalProducts}
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium tabular-nums ${
                      overview.lowStockProducts > 0 ? 'text-[#B45309]' : 'text-[#667085]'
                    }`}
                  >
                    {overview.lowStockProducts} low-stock products
                  </p>
                </div>
              </div>

              {/* Recent Orders & Low Stock Split */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-8 bg-white border border-[#EAECF0] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#EAECF0] flex items-center justify-between">
                    <h2 className="font-display text-base font-bold text-[#101828]">
                      Recent Cash on Delivery Orders
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab('orders')}
                      className="text-xs font-semibold text-[#155EEF] hover:underline"
                    >
                      Manage All Orders
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#F5F7FB] border-b border-[#EAECF0] text-xs uppercase text-[#667085]">
                        <tr>
                          <th className="px-4 py-2.5">Order</th>
                          <th className="px-4 py-2.5">Customer</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Payment</th>
                          <th className="px-4 py-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAECF0]">
                        {orders.slice(0, 6).map((o) => (
                          <tr
                            key={o.id}
                            onClick={() => {
                              setSelectedOrder(o);
                              setTab('orders');
                            }}
                            className="hover:bg-[#F5F7FB] cursor-pointer"
                          >
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-[#101828]">
                              {o.order_number}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <p className="font-semibold text-[#101828]">{o.customer_name}</p>
                              <p className="text-[#667085]">{o.city}</p>
                            </td>
                            <td className="px-4 py-3">
                              <OrderStatusTag status={o.order_status} />
                            </td>
                            <td className="px-4 py-3">
                              <PaymentStatusTag status={o.payment_status} />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#101828]">
                              ${o.total_amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Low Stock Queue */}
                <div className="xl:col-span-4 bg-white border border-[#EAECF0] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#EAECF0] flex items-center justify-between">
                    <h2 className="font-display text-base font-bold text-[#101828] inline-flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                      <span>Low-Stock Alerts</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab('inventory')}
                      className="text-xs font-semibold text-[#155EEF] hover:underline"
                    >
                      Inventory
                    </button>
                  </div>
                  {lowStockList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#667085]">
                      All active products are above their low-stock thresholds.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#EAECF0]">
                      {lowStockList.map((p) => (
                        <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#101828] truncate">{p.name}</p>
                            <p className="text-xs text-[#B42318] font-mono tabular-nums mt-0.5">
                              {p.stock_quantity} left (min {p.low_stock_threshold})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustProductId(p.id);
                              setTab('inventory');
                            }}
                            className="h-8 px-3 rounded-lg border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB] shrink-0"
                          >
                            Restock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {tab === 'orders' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#EAECF0] rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search order #, customer name, phone, or city..."
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D0D5DD] text-sm focus:outline-none focus:border-[#155EEF]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 p-1 bg-[#F5F7FB] rounded-lg">
                    {['all', ...ORDER_STATUSES].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                          orderStatusFilter === st
                            ? 'bg-white text-[#101828] shadow-xs'
                            : 'text-[#667085] hover:text-[#101828]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#EAECF0] rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F5F7FB] border-b border-[#EAECF0] text-xs uppercase text-[#667085]">
                    <tr>
                      <th className="px-4 py-3">Order #</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Zone / Address</th>
                      <th className="px-4 py-3 text-right">Total (USD)</th>
                      <th className="px-4 py-3">Order Status</th>
                      <th className="px-4 py-3">COD Payment</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECF0]">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#667085]">
                          No orders match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#F5F7FB]/60">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-[#101828] whitespace-nowrap">
                            {o.order_number}
                            <span className="block font-sans font-normal text-[11px] text-[#667085]">
                              {new Date(o.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <p className="font-semibold text-[#101828]">{o.customer_name}</p>
                            <p className="text-[#667085]">{o.customer_phone}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#475467] max-w-[220px] truncate">
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
                              aria-label={`Order status for ${o.order_number}`}
                              className="h-8 px-2 rounded-md border border-[#D0D5DD] bg-white text-xs capitalize"
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
                                handleOrderUpdate(o.id, {
                                  payment_status: e.target.value as PaymentStatus,
                                })
                              }
                              aria-label={`Payment status for ${o.order_number}`}
                              className="h-8 px-2 rounded-md border border-[#D0D5DD] bg-white text-xs capitalize"
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
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {tab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products by name or brand..."
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openProductEditor({
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
                  className="h-10 px-4 rounded-lg bg-[#155EEF] text-white text-xs font-semibold hover:bg-[#2563EB] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {products.length === 0 ? (
                <div className="bg-white border border-[#EAECF0] rounded-xl p-10 text-center space-y-4">
                  <div className="w-11 h-11 rounded-xl bg-[#F5F7FB] border border-[#EAECF0] text-[#155EEF] mx-auto flex items-center justify-center">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h2 className="font-display text-base font-bold text-[#101828]">
                      No products in your Supabase catalog yet
                    </h2>
                    <p className="text-xs text-[#667085]">
                      Your connected <span className="font-mono">public.products</span> table currently has 0 rows. Add a product manually or import the 8 GizmoHub starter gadgets and 4 categories.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSeedStarterCatalog}
                      disabled={seedingCatalog}
                      className="h-10 px-4 rounded-lg bg-[#050B18] text-white text-xs font-semibold hover:bg-[#101828] disabled:opacity-60"
                    >
                      {seedingCatalog ? 'Importing Starter Catalog...' : 'Import Starter GizmoHub Catalog'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openProductEditor({
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
                      className="h-10 px-4 rounded-lg border border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB]"
                    >
                      + Add First Product
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#EAECF0] rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F5F7FB] border-b border-[#EAECF0] text-xs uppercase text-[#667085]">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Price (USD)</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3">Visibility</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAECF0]">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#F5F7FB]/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-9 rounded-md bg-[#F5F7FB] border border-[#EAECF0] overflow-hidden shrink-0">
                                <StudioImage
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-[#101828] truncate max-w-[260px]">
                                  {p.name}
                                </p>
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
                            <span
                              className={
                                p.stock_quantity <= p.low_stock_threshold
                                  ? 'text-[#B42318]'
                                  : 'text-[#101828]'
                              }
                            >
                              {p.stock_quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium">
                            {p.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[#166534]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#667085]">
                                <XCircle className="w-3.5 h-3.5" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openProductEditor(p)}
                              className="h-8 px-2.5 rounded-md border border-[#D0D5DD] text-xs font-medium text-[#344054] hover:bg-[#F5F7FB] inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeactivateProduct(p.id, !p.is_active)}
                              className="h-8 px-2.5 rounded-md border border-[#D0D5DD] text-xs font-medium text-[#B42318] hover:bg-[#FEF3F2] inline-flex items-center gap-1"
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
              )}
            </div>
          )}

          {/* CATEGORIES TAB */}
          {tab === 'categories' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-[#475467]">
                  Organize storefront collections displayed on the homepage and shop filters.
                </p>
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
                  <div className="flex items-center justify-between pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-[#344054]">
                      <input
                        type="checkbox"
                        checked={editingCategory.is_active ?? true}
                        onChange={(e) =>
                          setEditingCategory({ ...editingCategory, is_active: e.target.checked })
                        }
                      />
                      <span>Active on Storefront</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="h-9 px-4 rounded-lg border border-[#D0D5DD] text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-9 px-5 rounded-lg bg-[#155EEF] text-white text-xs font-semibold"
                      >
                        Save Category
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {categories.length === 0 ? (
                <div className="bg-white border border-[#EAECF0] rounded-xl p-8 text-center space-y-3">
                  <p className="text-sm font-semibold text-[#101828]">No categories found in Supabase</p>
                  <p className="text-xs text-[#667085]">
                    Create your own categories or import the 4 starter categories (Audio Devices, Smart Watches, Power Solutions, Drones & Cameras).
                  </p>
                  <button
                    type="button"
                    onClick={handleSeedStarterCatalog}
                    disabled={seedingCatalog}
                    className="h-9 px-4 rounded-lg bg-[#050B18] text-white text-xs font-semibold hover:bg-[#101828] disabled:opacity-60"
                  >
                    {seedingCatalog ? 'Importing...' : 'Import Starter GizmoHub Catalog'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden flex flex-col"
                    >
                      <div className="aspect-[4/3] bg-[#F5F7FB]">
                        <StudioImage
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <p className="font-semibold text-[#101828]">{cat.name}</p>
                          <p className="text-xs text-[#667085] mt-0.5 line-clamp-2">
                            {cat.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-[#EAECF0]">
                          <span
                            className={`text-xs font-medium ${
                              cat.is_active ? 'text-[#166534]' : 'text-[#667085]'
                            }`}
                          >
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(cat)}
                            className="h-8 px-3 rounded-lg border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F5F7FB]"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INVENTORY TAB */}
          {tab === 'inventory' && (
            <div className="space-y-6">
              <form
                onSubmit={handleAdjustInventory}
                className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4"
              >
                <h2 className="font-display text-base font-bold text-[#101828]">
                  Record Stock Restock or Audit Adjustment
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
                          {p.name} (Stock: {p.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">Type</label>
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
                      Quantity Delta
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
                    placeholder="Reason (required for inventory_movements audit trail)"
                    className="flex-1 h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                  />
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] whitespace-nowrap"
                  >
                    Apply Adjustment
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
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Movement Type</th>
                      <th className="px-4 py-3 text-right">Delta</th>
                      <th className="px-4 py-3 text-right">Stock After</th>
                      <th className="px-4 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECF0]">
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="px-4 py-3 text-xs text-[#667085] whitespace-nowrap tabular-nums">
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

          {/* ZONES, STORE SETTINGS & SUPABASE INSPECTOR TAB */}
          {tab === 'zones' && (
            <div className="space-y-6">
              {schemaInfo?.mode === 'supabase' &&
                (schemaInfo.tablesDetected.store_settings?.exists === false ||
                  schemaInfo.tablesDetected.delivery_zones?.exists === false) && (
                  <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3 text-xs text-[#92400E]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
                    <p>
                      <strong>Temporary In-Memory Configuration:</strong>{' '}
                      <span className="font-mono">store_settings</span> and/or{' '}
                      <span className="font-mono">delivery_zones</span> do not exist in your Supabase{' '}
                      <span className="font-mono">public</span> schema yet. Changes made here apply immediately for active shoppers, and will persist permanently once you run the optional SQL migration shown below.
                    </p>
                  </div>
                )}

              {/* Store Settings */}
              {storeSettings && (
                <form
                  onSubmit={handleSaveSettings}
                  className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
                    <h2 className="font-display text-base font-bold text-[#101828]">
                      Store & Cash on Delivery Configuration
                    </h2>
                    <span className="text-xs font-medium text-[#166534] inline-flex items-center gap-1">
                      <Banknote className="w-4 h-4" /> Cash on Delivery Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#344054] mb-1">
                        Free Shipping Threshold (USD)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={storeSettings.free_shipping_threshold ?? ''}
                        onChange={(e) =>
                          setStoreSettings({
                            ...storeSettings,
                            free_shipping_threshold: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#344054] mb-1">
                        Low-Stock Alert Threshold
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={storeSettings.default_low_stock_threshold}
                        onChange={(e) =>
                          setStoreSettings({
                            ...storeSettings,
                            default_low_stock_threshold: Number(e.target.value),
                          })
                        }
                        className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#344054] mb-1">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={storeSettings.support_email}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, support_email: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#344054] mb-1">
                        Support Phone
                      </label>
                      <input
                        type="text"
                        value={storeSettings.support_phone}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, support_phone: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="h-10 px-5 rounded-lg bg-[#155EEF] text-white text-xs font-semibold hover:bg-[#2563EB]"
                  >
                    {savingSettings ? 'Saving...' : 'Save Store Settings'}
                  </button>
                </form>
              )}

              {/* Delivery Zones */}
              <div className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#101828]">
                    Delivery Zones
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
                      placeholder="Estimated Delivery Window"
                      value={editingZone.estimated_delivery_days ?? ''}
                      onChange={(e) =>
                        setEditingZone({
                          ...editingZone,
                          estimated_delivery_days: e.target.value,
                        })
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
                          {z.estimated_delivery_days} · {z.is_active ? 'Active' : 'Inactive'}
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

              {/* Supabase Integration Status & Schema Inspector */}
              {schemaInfo && (
                <div className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-[#155EEF]" />
                      <h2 className="font-display text-base font-bold text-[#101828]">
                        Supabase Backend Connection & Schema Status
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-[#475467]">
                      {schemaInfo.mode === 'supabase' ? 'Live Supabase Connected' : 'Local Preview Mode'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-lg bg-[#F5F7FB] border border-[#EAECF0]">
                      <p className="text-[#667085]">Authorized Admin Identity</p>
                      <p className="font-semibold text-[#101828] mt-0.5">godtime1999@gmail.com</p>
                      <p className="font-mono text-[11px] text-[#475467] mt-0.5">
                        42a4a551-693b-4961-a48d-20c96f02d5ce
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F5F7FB] border border-[#EAECF0]">
                      <p className="text-[#667085]">Environment Configuration</p>
                      <p className="font-semibold text-[#101828] mt-0.5">
                        Data Mode: {schemaInfo.mode === 'supabase' ? 'Live Supabase' : 'Preview Store'}
                      </p>
                      <p className="text-[#475467] mt-0.5">
                        URL: {String(schemaInfo.urlConfigured)} · Publishable:{' '}
                        {String(schemaInfo.publishableKeyConfigured)} · Secret Key:{' '}
                        {String(schemaInfo.secretKeyConfigured)}
                      </p>
                    </div>
                  </div>

                  {Object.keys(schemaInfo.tablesDetected).length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                        Detected Public Tables
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(schemaInfo.tablesDetected).map(([tableName, info]) => (
                          <div
                            key={tableName}
                            className="p-3 rounded-lg border border-[#EAECF0] bg-white space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold text-[#101828]">
                                {tableName}
                              </span>
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                  info.exists
                                    ? 'bg-[#ECFDF3] text-[#166534] border-[#ABEFC6]'
                                    : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                                }`}
                              >
                                {info.exists ? `${info.rowCount ?? 0} rows` : 'Missing'}
                              </span>
                            </div>
                            {info.columns.length > 0 && (
                              <p className="font-mono text-[11px] text-[#667085] leading-relaxed break-words">
                                {info.columns.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(schemaInfo.notes.length > 0 ||
                    Object.values(schemaInfo.tablesDetected).some((t) => !t.exists)) && (
                    <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-[#92400E]">
                            Optional SQL Migration Needed for Missing Tables
                          </p>
                          <p className="text-xs text-[#92400E]/90">
                            Storefront & checkout fall back safely in memory for missing{' '}
                            <span className="font-mono">store_settings</span>,{' '}
                            <span className="font-mono">delivery_zones</span>, or{' '}
                            <span className="font-mono">inventory_movements</span> tables. Run this SQL in your Supabase SQL Editor when ready to persist them (and create a public Storage bucket named{' '}
                            <span className="font-mono">product-images</span> for uploads).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="h-8 px-3 rounded-lg bg-white border border-[#F59E0B]/40 text-xs font-semibold text-[#92400E] hover:bg-[#FEF3C7] inline-flex items-center gap-1.5 shrink-0"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSql ? 'Copied SQL' : 'Copy SQL'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-[#050B18] text-[#E5E7EB] font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                        {OPTIONAL_SUPABASE_SQL}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ORDER INSPECTOR SLIDE-OVER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-[#050B18]/45" onClick={() => setSelectedOrder(null)} />
          <aside className="relative z-10 w-full max-w-lg bg-white h-full overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border-l border-[#EAECF0]">
            <div className="flex items-start justify-between border-b border-[#EAECF0] pb-4">
              <div>
                <p className="text-xs text-[#667085]">Order Inspector</p>
                <h2 className="font-mono text-xl font-bold text-[#101828]">
                  {selectedOrder.order_number}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-[#667085] hover:bg-[#F5F7FB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-xl bg-[#F5F7FB] border border-[#EAECF0] space-y-2 text-xs">
                <p className="font-semibold text-[#101828] text-sm">{selectedOrder.customer_name}</p>
                <p className="text-[#475467]">Phone: {selectedOrder.customer_phone}</p>
                {selectedOrder.customer_email && (
                  <p className="text-[#475467]">Email: {selectedOrder.customer_email}</p>
                )}
                <p className="text-[#101828] pt-1">
                  {selectedOrder.delivery_address}, {selectedOrder.city}, {selectedOrder.country}
                </p>
                {selectedOrder.delivery_instructions && (
                  <p className="text-[#667085]">Instructions: {selectedOrder.delivery_instructions}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Order Status
                  </label>
                  <select
                    value={selectedOrder.order_status}
                    onChange={(e) =>
                      handleOrderUpdate(selectedOrder.id, {
                        order_status: e.target.value as OrderStatus,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm capitalize"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    COD Payment Status
                  </label>
                  <select
                    value={selectedOrder.payment_status}
                    onChange={(e) =>
                      handleOrderUpdate(selectedOrder.id, {
                        payment_status: e.target.value as PaymentStatus,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm capitalize"
                  >
                    {PAYMENT_STATUSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedOrder.order_status === 'delivered' &&
                selectedOrder.payment_status === 'unpaid' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOrderUpdate(selectedOrder.id, { payment_status: 'paid' })
                    }
                    className="w-full h-10 rounded-lg bg-[#15803D] text-white text-xs font-semibold hover:bg-[#166534]"
                  >
                    Confirm Cash Collected (Mark Paid)
                  </button>
                )}

              <div className="divide-y divide-[#EAECF0] border border-[#EAECF0] rounded-xl overflow-hidden">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="px-4 py-3 flex justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#101828]">{it.product_name}</p>
                      <p className="text-[#667085] tabular-nums">
                        Qty {it.quantity} × ${it.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-[#101828]">
                      ${it.total_price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs pt-2">
                <div className="flex justify-between text-[#475467]">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#475467]">
                  <span>Delivery Fee</span>
                  <span className="tabular-nums">${selectedOrder.delivery_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#101828] pt-2 border-t border-[#EAECF0]">
                  <span>Grand Total (COD)</span>
                  <span className="tabular-nums">${selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* PRODUCT EDITOR SLIDE-OVER */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-[#050B18]/45" onClick={() => setEditingProduct(null)} />
          <aside className="relative z-10 w-full max-w-xl bg-white h-full overflow-y-auto p-6 sm:p-8 shadow-2xl border-l border-[#EAECF0]">
            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#EAECF0] pb-4">
                <h2 className="font-display text-lg font-bold text-[#101828]">
                  {editingProduct.id ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="p-1.5 rounded-lg text-[#667085] hover:bg-[#F5F7FB]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Product Name *
                  </label>
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
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Category</label>
                  <select
                    value={editingProduct.category_id ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        category_id: e.target.value || null,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm"
                  >
                    <option value="">Uncategorized</option>
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
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Low-Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.low_stock_threshold ?? 5}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        low_stock_threshold: Number(e.target.value),
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-[#D0D5DD] text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Product Description
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

              {/* Image Selection + Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#344054]">Product Image</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] overflow-hidden shrink-0">
                    <StudioImage
                      src={editingProduct.image_url}
                      alt={editingProduct.name || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <select
                    value={editingProduct.image_url ?? ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, image_url: e.target.value })
                    }
                    className="flex-1 h-10 px-3 rounded-lg border border-[#D0D5DD] bg-white text-xs"
                  >
                    {PRESET_GALLERY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {editingProduct.image_url &&
                      !PRESET_GALLERY_OPTIONS.some((o) => o.value === editingProduct.image_url) && (
                        <option value={editingProduct.image_url}>Uploaded / Custom URL</option>
                      )}
                  </select>
                  <label className="h-10 px-3 rounded-lg border border-[#D0D5DD] bg-[#F5F7FB] text-xs font-semibold text-[#344054] inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#EAECF0] whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
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

              {/* Specifications Editor */}
              <div className="space-y-2 pt-2 border-t border-[#EAECF0]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#344054]">
                    Technical Specifications
                  </span>
                  <button
                    type="button"
                    onClick={() => setSpecRows((prev) => [...prev, { key: '', value: '' }])}
                    className="text-xs font-semibold text-[#155EEF] hover:underline"
                  >
                    + Add Spec
                  </button>
                </div>
                {specRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Spec (e.g. Battery)"
                      value={row.key}
                      onChange={(e) =>
                        setSpecRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r))
                        )
                      }
                      className="w-2/5 h-9 px-2.5 rounded-lg border border-[#D0D5DD] text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 45 Hours)"
                      value={row.value}
                      onChange={(e) =>
                        setSpecRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r))
                        )
                      }
                      className="flex-1 h-9 px-2.5 rounded-lg border border-[#D0D5DD] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecRows((prev) => prev.filter((_, i) => i !== idx))}
                      className="px-2 text-[#667085] hover:text-[#B42318]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-6 text-xs font-medium text-[#344054] pt-2">
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

              <div className="pt-4 border-t border-[#EAECF0] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="h-10 px-4 rounded-lg border border-[#D0D5DD] text-sm font-semibold text-[#344054]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="h-10 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
                >
                  {savingProduct ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
