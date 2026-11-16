export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type PaymentMethod = 'cash_on_delivery';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order?: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category_id: string | null;
  category_name?: string;
  description: string;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  gallery_urls?: string[];
  specifications?: Record<string, string>;
  is_active: boolean;
  is_featured?: boolean;
  units_sold?: number;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  country: string;
  city: string | null;
  delivery_fee: number;
  free_shipping_threshold: number | null;
  estimated_delivery_days: string;
  is_active: boolean;
}

export interface StoreSettings {
  store_name: string;
  currency: string;
  cod_enabled: boolean;
  free_shipping_threshold: number | null;
  default_low_stock_threshold: number;
  support_email: string;
  support_phone: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_brand?: string;
  product_image?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  country: string;
  city: string;
  delivery_address: string;
  delivery_instructions: string | null;
  delivery_zone_id: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name?: string;
  change_quantity: number;
  previous_quantity: number;
  new_quantity: number;
  movement_type: 'order_deduction' | 'restock' | 'adjustment' | 'order_cancelled_restore';
  reason: string;
  reference_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  role: 'customer' | 'admin';
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  published_at: string;
  read_time: string;
  excerpt: string;
  body: string[];
  image_key: string;
}

export interface AdminOverviewMetrics {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  paidSalesRevenue: number;
  unpaidCodPendingValue: number;
}

export interface SupabaseSchemaInfo {
  mode: 'supabase' | 'local_preview';
  connected: boolean;
  urlConfigured: boolean;
  publishableKeyConfigured: boolean;
  secretKeyConfigured: boolean;
  tablesDetected: Record<string, { exists: boolean; columns: string[]; rowCount?: number }>;
  notes: string[];
}
