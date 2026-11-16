import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, initRuntimeConfig } from '../lib/supabaseClient';
import type {
  CartItem,
  Category,
  CustomerProfile,
  DeliveryZone,
  Order,
  Product,
  StoreSettings,
} from '../types/store';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface StoreContextValue {
  route: string;
  navigate: (to: string) => void;
  backendMode: 'supabase' | 'local_preview';
  authMode: 'supabase' | 'local_preview';
  loadingCatalog: boolean;
  categories: Category[];
  products: Product[];
  deliveryZones: DeliveryZone[];
  settings: StoreSettings;
  refreshCatalog: () => Promise<void>;

  // Cart
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, openDrawer?: boolean) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Auth
  user: CustomerProfile | null;
  authToken: string | null;
  authLoading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<CustomerProfile>;
  register: (input: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    country?: string;
    city?: string;
    address?: string;
  }) => Promise<CustomerProfile>;
  requestPasswordReset: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  updateProfile: (
    patch: Partial<Pick<CustomerProfile, 'full_name' | 'phone' | 'country' | 'city' | 'address'>>
  ) => Promise<void>;

  // Last Confirmed Order
  lastConfirmedOrder: Order | null;
  setLastConfirmedOrder: (order: Order | null) => void;

  // Toasts
  toasts: ToastMessage[];
  notify: (text: string, type?: ToastMessage['type']) => void;
}

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'GizmoHub',
  currency: 'USD',
  cod_enabled: true,
  free_shipping_threshold: 150,
  default_low_stock_threshold: 5,
  support_email: 'support@gizmohub.store',
  support_phone: '+1 (800) 555-0194',
};

const CART_STORAGE_KEY = 'gizmohub_cart_v1';
const TOKEN_STORAGE_KEY = 'gizmohub_auth_token_v1';
const LAST_ORDER_KEY = 'gizmohub_last_order_v1';

const StoreContext = createContext<StoreContextValue | null>(null);

export function getEffectivePrice(product: Product): number {
  if (
    product.discount_price !== null &&
    product.discount_price > 0 &&
    product.discount_price < product.price
  ) {
    return product.discount_price;
  }
  return product.price;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<string>(() => window.location.pathname + window.location.search || '/');
  const [backendMode, setBackendMode] = useState<'supabase' | 'local_preview'>('local_preview');
  const [authMode, setAuthMode] = useState<'supabase' | 'local_preview'>('local_preview');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setCartOpen] = useState(false);

  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const [lastConfirmedOrder, setLastConfirmedOrderState] = useState<Order | null>(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      return raw ? (JSON.parse(raw) as Order) : null;
    } catch {
      return null;
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith('/') ? to : `/${to}`;
    if (window.location.pathname + window.location.search !== target) {
      window.history.pushState({}, '', target);
    }
    setRoute(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname + window.location.search || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota issues
    }
  }, [cart]);

  const setLastConfirmedOrder = useCallback((order: Order | null) => {
    setLastConfirmedOrderState(order);
    try {
      if (order) {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
      } else {
        sessionStorage.removeItem(LAST_ORDER_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) throw new Error('Unable to load products');
      const data = await res.json();
      setCategories(data.categories ?? []);
      setProducts(data.products ?? []);
      setDeliveryZones(data.deliveryZones ?? []);
      if (data.settings) setSettings(data.settings);
      if (data.mode) setBackendMode(data.mode);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to refresh catalog.', 'error');
    } finally {
      setLoadingCatalog(false);
    }
  }, [notify]);

  // Bootstrap runtime config + catalog + existing session
  useEffect(() => {
    let active = true;
    (async () => {
      const cfg = await initRuntimeConfig();
      if (!active) return;
      setBackendMode(cfg.mode);
      const effectiveAuthMode = cfg.authMode ?? cfg.mode;
      setAuthMode(effectiveAuthMode);

      await refreshCatalog();

      const supa = getSupabaseClient();
      let resolved = false;
      if (effectiveAuthMode === 'supabase' && supa) {
        const { data } = await supa.auth.getSession();
        const token = data.session?.access_token ?? null;
        if (token) {
          setAuthToken(token);
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            if (active) {
              setUser(me.user);
              resolved = true;
            }
          }
        }
      }
      if (!resolved) {
        const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (savedToken) {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            if (active) {
              setAuthToken(savedToken);
              setUser(me.user);
            }
          } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setAuthToken(null);
          }
        }
      }
      if (active) setAuthLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshCatalog]);

  // Sync cart items with latest product stock & price whenever products update
  useEffect(() => {
    if (!products.length) return;
    setCart((prev) =>
      prev
        .map((item) => {
          const latest = products.find((p) => p.id === item.product.id);
          if (!latest || !latest.is_active || latest.stock_quantity <= 0) return null;
          return {
            product: latest,
            quantity: Math.min(item.quantity, latest.stock_quantity),
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  }, [products]);

  const addToCart = useCallback(
    (product: Product, quantity = 1, openDrawer = true) => {
      if (product.stock_quantity <= 0) {
        notify(`${product.name} is currently out of stock.`, 'error');
        return;
      }
      setCart((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        const currentQty = existing?.quantity ?? 0;
        const desired = currentQty + quantity;
        if (desired > product.stock_quantity) {
          notify(`Only ${product.stock_quantity} units of ${product.name} available.`, 'error');
          if (existing) {
            return prev.map((i) =>
              i.product.id === product.id ? { product, quantity: product.stock_quantity } : i
            );
          }
          return [...prev, { product, quantity: product.stock_quantity }];
        }
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id ? { product, quantity: desired } : i
          );
        }
        return [...prev, { product, quantity }];
      });
      notify(`Added ${product.name} to cart.`, 'success');
      if (openDrawer) setCartOpen(true);
    },
    [notify]
  );

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((i) => i.product.id !== productId));
        return;
      }
      setCart((prev) =>
        prev.map((item) => {
          if (item.product.id !== productId) return item;
          const clamped = Math.min(quantity, item.product.stock_quantity);
          if (quantity > item.product.stock_quantity) {
            notify(`Maximum available stock is ${item.product.stock_quantity}.`, 'info');
          }
          return { ...item, quantity: clamped };
        })
      );
    },
    [notify]
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () =>
      Number(
        cart.reduce((sum, i) => sum + getEffectivePrice(i.product) * i.quantity, 0).toFixed(2)
      ),
    [cart]
  );

  const login = useCallback(async (email: string, password: string): Promise<CustomerProfile> => {
    const supa = getSupabaseClient();
    if (authMode === 'supabase' && supa) {
      const { data, error } = await supa.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        const token = data.session.access_token;
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) throw new Error('Unable to load account profile.');
        const { user: profile } = (await meRes.json()) as { user: CustomerProfile };
        setAuthToken(token);
        setUser(profile);
        return profile;
      }
      // If in local_preview data mode, allow local fallback demo login when Supabase login didn't match
      if (backendMode === 'supabase') {
        throw new Error(error?.message ?? 'Sign-in failed.');
      }
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Invalid email or password.');
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setAuthToken(data.token);
    setUser(data.user);
    return data.user as CustomerProfile;
  }, [authMode, backendMode]);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      full_name: string;
      phone: string;
      country?: string;
      city?: string;
      address?: string;
    }): Promise<CustomerProfile> => {
      const supa = getSupabaseClient();
      if (authMode === 'supabase' && supa) {
        const { data, error } = await supa.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: { full_name: input.full_name, phone: input.phone },
          },
        });
        if (error) throw new Error(error.message);
        const token = data.session?.access_token;
        if (!token) {
          throw new Error('Check your email to confirm your account, then sign in.');
        }
        await fetch('/api/customer/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: input.full_name,
            phone: input.phone,
            country: input.country,
            city: input.city,
            address: input.address,
          }),
        });
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { user: profile } = (await meRes.json()) as { user: CustomerProfile };
        setAuthToken(token);
        setUser(profile);
        return profile;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed.');
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setAuthToken(data.token);
      setUser(data.user);
      return data.user as CustomerProfile;
    },
    [authMode]
  );

  const requestPasswordReset = useCallback(
    async (email: string): Promise<string> => {
      const supa = getSupabaseClient();
      if (authMode === 'supabase' && supa) {
        const { error } = await supa.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/account`,
        });
        if (error) throw new Error(error.message);
        return 'Password reset instructions have been sent to your email.';
      }
      return 'If an account matches this email, password reset instructions have been queued.';
    },
    [authMode]
  );

  const logout = useCallback(async () => {
    const supa = getSupabaseClient();
    if (authMode === 'supabase' && supa) {
      await supa.auth.signOut();
    }
    if (authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setAuthToken(null);
    setUser(null);
    notify('Signed out successfully.', 'info');
  }, [authToken, authMode, notify]);

  const updateProfile = useCallback(
    async (
      patch: Partial<Pick<CustomerProfile, 'full_name' | 'phone' | 'country' | 'city' | 'address'>>
    ) => {
      if (!authToken) throw new Error('Sign in required.');
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not update profile.');
      setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
      notify('Profile updated.', 'success');
    },
    [authToken, notify]
  );

  const value: StoreContextValue = {
    route,
    navigate,
    backendMode,
    authMode,
    loadingCatalog,
    categories,
    products,
    deliveryZones,
    settings,
    refreshCatalog,
    cart,
    cartCount,
    cartSubtotal,
    isCartOpen,
    setCartOpen,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    user,
    authToken,
    authLoading,
    isAuthModalOpen,
    setAuthModalOpen,
    login,
    register,
    requestPasswordReset,
    logout,
    updateProfile,
    lastConfirmedOrder,
    setLastConfirmedOrder,
    toasts,
    notify,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
