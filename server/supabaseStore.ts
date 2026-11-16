import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminOverviewMetrics,
  Category,
  CustomerProfile,
  DeliveryZone,
  InventoryMovement,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  StoreSettings,
  SupabaseSchemaInfo,
} from '../src/types/store.ts';
import { fallbackStore } from './fallbackStore.ts';

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  'audio-devices': '/src/assets/images/cat_audio_devices_1794799613236.jpg',
  'smart-watches': '/src/assets/images/cat_smart_watches_1794799613981.jpg',
  'power-solutions': '/src/assets/images/cat_power_solutions_1794799613842.jpg',
  'drones-cameras': '/src/assets/images/cat_drones_cameras_1794799614383.jpg',
};

const AUTHORIZED_ADMIN_ID = '42a4a551-693b-4961-a48d-20c96f02d5ce';
const AUTHORIZED_ADMIN_EMAIL = 'godtime1999@gmail.com';

export class SupabaseStore {
  private client: SupabaseClient;
  private url: string;
  private secretKey: string;
  private publishableKey: string;
  private idempotencyCache = new Map<string, Order>();

  constructor(url: string, secretKey: string, publishableKey: string) {
    this.url = url;
    this.secretKey = secretKey;
    this.publishableKey = publishableKey;
    this.client = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async inspectOpenApiDefinitions(): Promise<Record<string, string[]>> {
    try {
      const res = await fetch(`${this.url}/rest/v1/`, {
        headers: {
          apikey: this.secretKey,
          Authorization: `Bearer ${this.secretKey}`,
        },
      });
      if (!res.ok) return {};
      const spec = (await res.json()) as {
        definitions?: Record<string, { properties?: Record<string, { format?: string; type?: string }> }>;
      };
      const result: Record<string, string[]> = {};
      for (const [tbl, def] of Object.entries(spec.definitions ?? {})) {
        result[tbl] = Object.entries(def.properties ?? {}).map(
          ([col, info]) => `${col}:${info.format ?? info.type ?? 'unknown'}`
        );
      }
      return result;
    } catch {
      return {};
    }
  }

  async inspectSchema(): Promise<SupabaseSchemaInfo> {
    const openApiDefs = await this.inspectOpenApiDefinitions();
    const tables = Array.from(
      new Set([
        'admins',
        'customer_profiles',
        'categories',
        'products',
        'orders',
        'order_items',
        'store_settings',
        'delivery_zones',
        'inventory_movements',
        ...Object.keys(openApiDefs),
      ])
    );
    const tablesDetected: SupabaseSchemaInfo['tablesDetected'] = {};
    const notes: string[] = [];

    for (const table of tables) {
      const { data, error, count } = await this.client
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      if (error) {
        tablesDetected[table] = { exists: false, columns: openApiDefs[table] ?? [] };
        notes.push(`Table "${table}": ${error.message}`);
      } else {
        const columns =
          data && data.length > 0
            ? Object.keys(data[0])
            : openApiDefs[table] ?? [];
        tablesDetected[table] = { exists: true, columns, rowCount: count ?? 0 };
      }
    }

    return {
      mode: 'supabase',
      connected: true,
      urlConfigured: Boolean(this.url),
      publishableKeyConfigured: Boolean(this.publishableKey),
      secretKeyConfigured: true,
      tablesDetected,
      notes,
    };
  }

  async verifyUserFromToken(accessToken: string | undefined): Promise<CustomerProfile | null> {
    if (!accessToken) return null;
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) return null;
    const u = data.user;

    // admins table schema: (user_id, created_at)
    const { data: adminRows } = await this.client
      .from('admins')
      .select('user_id')
      .eq('user_id', u.id)
      .limit(1);

    const isAuthorizedAdmin =
      u.id === AUTHORIZED_ADMIN_ID ||
      (u.email ?? '').toLowerCase() === AUTHORIZED_ADMIN_EMAIL ||
      Boolean(adminRows && adminRows.length > 0);

    // customer_profiles schema: (id, full_name, phone, created_at, updated_at)
    const { data: profileRows } = await this.client
      .from('customer_profiles')
      .select('*')
      .eq('id', u.id)
      .limit(1);

    const p = (profileRows?.[0] ?? {}) as Record<string, unknown>;
    return {
      id: u.id,
      email: u.email ?? '',
      full_name:
        (p.full_name as string) ||
        (u.user_metadata?.full_name as string) ||
        (isAuthorizedAdmin ? 'GizmoHub Store Admin' : ''),
      phone: (p.phone as string) || (u.user_metadata?.phone as string) || '',
      country: '',
      city: '',
      address: '',
      role: isAuthorizedAdmin ? 'admin' : 'customer',
      created_at: u.created_at,
    };
  }

  async getStoreSettings(): Promise<StoreSettings> {
    const { data, error } = await this.client.from('store_settings').select('*').limit(1);
    if (error || !data || data.length === 0) {
      return fallbackStore.getStoreSettings();
    }
    const row = data[0] as Record<string, unknown>;
    return {
      store_name: (row.store_name as string) ?? 'GizmoHub',
      currency: (row.currency as string) ?? 'USD',
      cod_enabled: row.cod_enabled !== undefined ? Boolean(row.cod_enabled) : true,
      free_shipping_threshold:
        row.free_shipping_threshold !== undefined && row.free_shipping_threshold !== null
          ? Number(row.free_shipping_threshold)
          : 150,
      default_low_stock_threshold: Number(row.default_low_stock_threshold ?? 5),
      support_email: (row.support_email as string) ?? 'support@gizmohub.store',
      support_phone: (row.support_phone as string) ?? '+1 (800) 555-0194',
    };
  }

  async updateStoreSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
    const { data, error } = await this.client.from('store_settings').select('*').limit(1);
    if (error) {
      // Table not created in Supabase yet -> keep in memory until SQL migration is approved
      return fallbackStore.updateStoreSettings(patch);
    }
    if (data && data.length > 0) {
      const id = (data[0] as Record<string, unknown>).id;
      await this.client.from('store_settings').update(patch).eq('id', id);
    } else {
      await this.client.from('store_settings').insert(patch);
    }
    return this.getStoreSettings();
  }

  async getCategories(includeInactive = false): Promise<Category[]> {
    // categories schema: (id, name, slug, description, is_active, created_at)
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((raw) => {
        const r = raw as Record<string, unknown>;
        const slug = String(r.slug ?? r.id);
        return {
          id: String(r.id),
          name: String(r.name ?? 'Category'),
          slug,
          description: (r.description as string | null) ?? null,
          image_url:
            (r.image_url as string | null) ??
            CATEGORY_DEFAULT_IMAGES[slug] ??
            '/src/assets/images/cat_audio_devices_1794799613236.jpg',
          is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
          created_at: String(r.created_at ?? new Date().toISOString()),
        };
      })
      .filter((c) => includeInactive || c.is_active);
  }

  async getProducts(includeInactive = false): Promise<Product[]> {
    // products schema: (id, category_id, name, slug, sku, brand, description, price, compare_at_price, stock_quantity, image_url, is_active, created_at, updated_at)
    const [{ data: rawProducts, error }, categories, { data: rawOrderItems }] = await Promise.all([
      this.client.from('products').select('*').order('created_at', { ascending: false }),
      this.getCategories(true),
      this.client.from('order_items').select('product_id,quantity'),
    ]);

    if (error) throw new Error(error.message);

    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const salesMap = new Map<string, number>();
    if (rawOrderItems) {
      for (const item of rawOrderItems as Array<Record<string, unknown>>) {
        const pid = String(item.product_id ?? '');
        const qty = Number(item.quantity ?? 0);
        if (pid && qty > 0) {
          salesMap.set(pid, (salesMap.get(pid) ?? 0) + qty);
        }
      }
    }

    return (rawProducts ?? [])
      .map((raw) => {
        const r = raw as Record<string, unknown>;
        const categoryId = (r.category_id as string | null) ?? null;
        const sellingPrice = Number(r.price ?? 0);
        const compareAt =
          r.compare_at_price !== null && r.compare_at_price !== undefined
            ? Number(r.compare_at_price)
            : null;
        const hasDiscount = compareAt !== null && compareAt > sellingPrice;

        return {
          id: String(r.id),
          name: String(r.name ?? 'Product'),
          slug: String(r.slug ?? r.id),
          brand: String(r.brand ?? 'GizmoHub'),
          category_id: categoryId,
          category_name: categoryId ? catMap.get(categoryId) ?? 'Gadgets' : 'Gadgets',
          description: String(r.description ?? ''),
          // Map compare_at_price -> original price, price -> current discounted price when discounted
          price: hasDiscount ? compareAt! : sellingPrice,
          discount_price: hasDiscount ? sellingPrice : null,
          stock_quantity: Number(r.stock_quantity ?? 0),
          low_stock_threshold: 5,
          image_url: (r.image_url as string | null) ?? null,
          specifications: r.sku ? { SKU: String(r.sku) } : undefined,
          is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
          is_featured: true,
          units_sold: salesMap.get(String(r.id)) ?? 0,
          created_at: String(r.created_at ?? new Date().toISOString()),
        };
      })
      .filter((p) => includeInactive || p.is_active);
  }

  async getDeliveryZones(includeInactive = false): Promise<DeliveryZone[]> {
    const { data, error } = await this.client.from('delivery_zones').select('*');
    if (error) {
      // Fallback safely to configured local zones if delivery_zones table is not yet created in Supabase
      return fallbackStore.getDeliveryZones(includeInactive);
    }
    return (data ?? [])
      .map((raw) => {
        const r = raw as Record<string, unknown>;
        return {
          id: String(r.id),
          name: String(r.name ?? r.country ?? 'Delivery Zone'),
          country: String(r.country ?? ''),
          city: (r.city as string | null) ?? null,
          delivery_fee: Number(r.delivery_fee ?? 0),
          free_shipping_threshold:
            r.free_shipping_threshold !== undefined && r.free_shipping_threshold !== null
              ? Number(r.free_shipping_threshold)
              : null,
          estimated_delivery_days: String(r.estimated_delivery_days ?? '2-4 business days'),
          is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
        };
      })
      .filter((z) => includeInactive || z.is_active);
  }

  async createCodOrder(input: {
    idempotencyKey?: string;
    userId: string | null;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    country: string;
    city: string;
    deliveryAddress: string;
    deliveryInstructions: string | null;
    deliveryZoneId?: string;
    items: Array<{ product_id: string; quantity: number }>;
  }): Promise<{ order: Order; duplicate: boolean }> {
    if (input.idempotencyKey && this.idempotencyCache.has(input.idempotencyKey)) {
      return { order: this.idempotencyCache.get(input.idempotencyKey)!, duplicate: true };
    }

    const [zones, settings, products] = await Promise.all([
      this.getDeliveryZones(false),
      this.getStoreSettings(),
      this.getProducts(false),
    ]);

    const normCountry = input.country.trim().toLowerCase();
    const normCity = input.city.trim().toLowerCase();
    const zone = input.deliveryZoneId
      ? zones.find((z) => z.id === input.deliveryZoneId)
      : zones.find(
          (z) =>
            z.country.toLowerCase() === normCountry &&
            (!z.city || z.city.toLowerCase() === normCity)
        ) ?? zones.find((z) => z.country.toLowerCase() === normCountry);

    if (!zone) {
      throw new Error('Delivery is not currently supported for the selected zone.');
    }

    const qtyMap = new Map<string, number>();
    for (const item of input.items) {
      const q = Math.floor(item.quantity);
      if (q <= 0) throw new Error('Quantity must be greater than zero.');
      qtyMap.set(item.product_id, (qtyMap.get(item.product_id) ?? 0) + q);
    }

    const resolved: Array<{ product: Product; quantity: number; unitPrice: number }> = [];
    for (const [productId, quantity] of qtyMap.entries()) {
      const prod = products.find((p) => p.id === productId);
      if (!prod) throw new Error('One or more products are no longer active.');
      if (prod.stock_quantity < quantity) {
        throw new Error(`Insufficient stock for ${prod.name}. Available: ${prod.stock_quantity}`);
      }
      const unitPrice =
        prod.discount_price !== null && prod.discount_price > 0 && prod.discount_price < prod.price
          ? prod.discount_price
          : prod.price;
      resolved.push({ product: prod, quantity, unitPrice });
    }

    let subtotal = resolved.reduce((sum, r) => sum + r.unitPrice * r.quantity, 0);
    subtotal = Number(subtotal.toFixed(2));
    const freeThreshold = zone.free_shipping_threshold ?? settings.free_shipping_threshold;
    const deliveryFee =
      freeThreshold !== null && subtotal >= freeThreshold ? 0 : Number(zone.delivery_fee.toFixed(2));
    const totalAmount = Number((subtotal + deliveryFee).toFixed(2));
    const orderNumber = `GH-${new Date().getFullYear()}-${crypto.randomInt(10000, 99999)}`;

    const deducted: Array<{ productId: string; prevStock: number; qty: number }> = [];
    try {
      for (const entry of resolved) {
        const newQty = entry.product.stock_quantity - entry.quantity;
        const { data: updatedRows, error: stockErr } = await this.client
          .from('products')
          .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
          .eq('id', entry.product.id)
          .gte('stock_quantity', entry.quantity)
          .select('id,stock_quantity');

        if (stockErr || !updatedRows || updatedRows.length === 0) {
          throw new Error(`Stock changed while placing order for ${entry.product.name}. Please try again.`);
        }
        deducted.push({
          productId: entry.product.id,
          prevStock: entry.product.stock_quantity,
          qty: entry.quantity,
        });
      }

      // Exact orders schema: shipping_address, delivery_notes, total, currency_code
      const { data: orderData, error: orderErr } = await this.client
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: input.userId,
          customer_name: input.customerName,
          customer_phone: input.customerPhone,
          customer_email: input.customerEmail,
          shipping_address: input.deliveryAddress,
          city: input.city || zone.city || zone.name,
          region: zone.name,
          country: zone.country,
          delivery_notes: input.deliveryInstructions,
          subtotal,
          delivery_fee: deliveryFee,
          total: totalAmount,
          currency_code: 'USD',
          payment_method: 'cash_on_delivery',
          payment_status: 'unpaid',
          order_status: 'pending',
        })
        .select('*')
        .single();

      if (orderErr || !orderData) {
        throw new Error(orderErr?.message ?? 'Failed to record order.');
      }

      const orderId = String((orderData as Record<string, unknown>).id);
      // Exact order_items schema: order_id, product_id, product_name, sku, unit_price, quantity, line_total
      const itemInserts = resolved.map((entry) => ({
        order_id: orderId,
        product_id: entry.product.id,
        product_name: entry.product.name,
        sku: entry.product.specifications?.SKU ?? entry.product.slug.slice(0, 24).toUpperCase(),
        unit_price: entry.unitPrice,
        quantity: entry.quantity,
        line_total: Number((entry.unitPrice * entry.quantity).toFixed(2)),
      }));

      const { data: insertedItems, error: itemsErr } = await this.client
        .from('order_items')
        .insert(itemInserts)
        .select('*');

      if (itemsErr) {
        await this.client.from('orders').delete().eq('id', orderId);
        throw new Error(itemsErr.message);
      }

      // Best-effort log to inventory_movements if table exists
      await this.client.from('inventory_movements').insert(
        deducted.map((d) => ({
          product_id: d.productId,
          change_quantity: -d.qty,
          previous_quantity: d.prevStock,
          new_quantity: d.prevStock - d.qty,
          movement_type: 'order_deduction',
          reason: `COD Order ${orderNumber}`,
          reference_id: orderId,
        }))
      );

      const order: Order = {
        id: orderId,
        order_number: orderNumber,
        user_id: input.userId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        customer_email: input.customerEmail,
        country: zone.country,
        city: input.city || zone.city || zone.name,
        delivery_address: input.deliveryAddress,
        delivery_instructions: input.deliveryInstructions,
        delivery_zone_id: zone.id,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_method: 'cash_on_delivery',
        payment_status: 'unpaid',
        order_status: 'pending',
        items: (insertedItems ?? []).map((it, idx) => {
          const r = it as Record<string, unknown>;
          return {
            id: String(r.id ?? idx),
            order_id: orderId,
            product_id: String(r.product_id),
            product_name: String(r.product_name ?? resolved[idx]?.product.name ?? ''),
            product_brand: resolved[idx]?.product.brand,
            product_image: resolved[idx]?.product.image_url,
            quantity: Number(r.quantity),
            unit_price: Number(r.unit_price),
            total_price: Number(r.line_total ?? r.total_price ?? 0),
          };
        }),
        created_at: String((orderData as Record<string, unknown>).created_at ?? new Date().toISOString()),
      };

      if (input.idempotencyKey) {
        this.idempotencyCache.set(input.idempotencyKey, order);
      }
      return { order, duplicate: false };
    } catch (err) {
      for (const d of deducted) {
        await this.client
          .from('products')
          .update({ stock_quantity: d.prevStock })
          .eq('id', d.productId);
      }
      throw err;
    }
  }

  private mapOrders(
    rawOrders: Array<Record<string, unknown>>,
    rawItems: Array<Record<string, unknown>>
  ): Order[] {
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const r of rawItems) {
      const oid = String(r.order_id);
      const list = itemsByOrder.get(oid) ?? [];
      list.push({
        id: String(r.id),
        order_id: oid,
        product_id: String(r.product_id),
        product_name: String(r.product_name ?? 'Product'),
        quantity: Number(r.quantity ?? 1),
        unit_price: Number(r.unit_price ?? 0),
        total_price: Number(r.line_total ?? Number(r.unit_price ?? 0) * Number(r.quantity ?? 1)),
      });
      itemsByOrder.set(oid, list);
    }

    return rawOrders.map((r) => ({
      id: String(r.id),
      order_number: String(r.order_number ?? r.id),
      user_id: (r.user_id as string | null) ?? null,
      customer_name: String(r.customer_name ?? ''),
      customer_phone: String(r.customer_phone ?? ''),
      customer_email: (r.customer_email as string | null) ?? null,
      country: String(r.country ?? ''),
      city: String(r.city ?? ''),
      delivery_address: String(r.shipping_address ?? ''),
      delivery_instructions: (r.delivery_notes as string | null) ?? null,
      delivery_zone_id: null,
      subtotal: Number(r.subtotal ?? 0),
      delivery_fee: Number(r.delivery_fee ?? 0),
      total_amount: Number(r.total ?? 0),
      payment_method: 'cash_on_delivery',
      payment_status: (r.payment_status as PaymentStatus) ?? 'unpaid',
      order_status: (r.order_status as OrderStatus) ?? 'pending',
      items: itemsByOrder.get(String(r.id)) ?? [],
      created_at: String(r.created_at ?? new Date().toISOString()),
      updated_at: (r.updated_at as string | undefined) ?? undefined,
    }));
  }

  async trackOrder(orderNumber: string, phone: string): Promise<Order | null> {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 7) return null;

    const { data: rawOrders } = await this.client
      .from('orders')
      .select('*')
      .ilike('order_number', orderNumber.trim())
      .limit(1);

    if (!rawOrders || rawOrders.length === 0) return null;
    const raw = rawOrders[0] as Record<string, unknown>;
    const dbPhone = String(raw.customer_phone ?? '').replace(/[^0-9+]/g, '');
    if (dbPhone !== cleanPhone && !dbPhone.endsWith(cleanPhone.slice(-7))) {
      return null;
    }

    const { data: rawItems } = await this.client
      .from('order_items')
      .select('*')
      .eq('order_id', raw.id);

    return this.mapOrders([raw], (rawItems ?? []) as Array<Record<string, unknown>>)[0];
  }

  async getCustomerOrders(userId: string): Promise<Order[]> {
    const { data: rawOrders, error } = await this.client
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!rawOrders || rawOrders.length === 0) return [];
    const orderIds = rawOrders.map((o) => (o as Record<string, unknown>).id);
    const { data: rawItems } = await this.client
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    return this.mapOrders(
      rawOrders as Array<Record<string, unknown>>,
      (rawItems ?? []) as Array<Record<string, unknown>>
    );
  }

  async updateCustomerProfile(
    userId: string,
    email: string,
    patch: Partial<Pick<CustomerProfile, 'full_name' | 'phone' | 'country' | 'city' | 'address'>>
  ): Promise<CustomerProfile> {
    // customer_profiles schema: id, full_name, phone, created_at, updated_at
    const dbPatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.full_name !== undefined) dbPatch.full_name = patch.full_name;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;

    const { data: existing } = await this.client
      .from('customer_profiles')
      .select('id')
      .eq('id', userId)
      .limit(1);

    if (existing && existing.length > 0) {
      await this.client.from('customer_profiles').update(dbPatch).eq('id', userId);
    } else {
      await this.client.from('customer_profiles').insert({
        id: userId,
        full_name: patch.full_name ?? '',
        phone: patch.phone ?? '',
      });
    }
    return {
      id: userId,
      email,
      full_name: patch.full_name ?? '',
      phone: patch.phone ?? '',
      country: patch.country ?? '',
      city: patch.city ?? '',
      address: patch.address ?? '',
      role: 'customer',
      created_at: new Date().toISOString(),
    };
  }

  async getAllOrders(): Promise<Order[]> {
    const { data: rawOrders, error } = await this.client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    if (!rawOrders || rawOrders.length === 0) return [];
    const orderIds = rawOrders.map((o) => (o as Record<string, unknown>).id);
    const { data: rawItems } = await this.client
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);
    return this.mapOrders(
      rawOrders as Array<Record<string, unknown>>,
      (rawItems ?? []) as Array<Record<string, unknown>>
    );
  }

  async getAdminOverview(): Promise<AdminOverviewMetrics> {
    const [orders, products] = await Promise.all([this.getAllOrders(), this.getProducts(true)]);
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.order_status === 'pending').length,
      confirmedOrders: orders.filter((o) => o.order_status === 'confirmed').length,
      deliveredOrders: orders.filter((o) => o.order_status === 'delivered').length,
      totalProducts: products.length,
      lowStockProducts: products.filter((p) => p.is_active && p.stock_quantity <= p.low_stock_threshold).length,
      paidSalesRevenue: orders
        .filter((o) => o.payment_status === 'paid')
        .reduce((sum, o) => sum + o.total_amount, 0),
      unpaidCodPendingValue: orders
        .filter((o) => o.payment_status === 'unpaid' && o.order_status !== 'cancelled')
        .reduce((sum, o) => sum + o.total_amount, 0),
    };
  }

  async updateOrder(
    orderId: string,
    patch: { order_status?: OrderStatus; payment_status?: PaymentStatus },
    adminEmail: string
  ): Promise<Order> {
    const { data: current } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (!current) throw new Error('Order not found.');
    const cur = current as Record<string, unknown>;
    const currentStatus = String(cur.order_status ?? 'pending');

    if (patch.payment_status === 'paid' && (patch.order_status ?? currentStatus) !== 'delivered') {
      throw new Error('COD orders can only be marked as paid after delivery.');
    }

    if (patch.order_status === 'cancelled' && currentStatus !== 'cancelled') {
      const { data: items } = await this.client
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      for (const item of (items ?? []) as Array<Record<string, unknown>>) {
        const pid = String(item.product_id);
        const qty = Number(item.quantity ?? 0);
        const { data: prod } = await this.client
          .from('products')
          .select('stock_quantity')
          .eq('id', pid)
          .single();
        if (prod) {
          const prev = Number((prod as Record<string, unknown>).stock_quantity ?? 0);
          await this.client
            .from('products')
            .update({ stock_quantity: prev + qty, updated_at: new Date().toISOString() })
            .eq('id', pid);
          await this.client.from('inventory_movements').insert({
            product_id: pid,
            change_quantity: qty,
            previous_quantity: prev,
            new_quantity: prev + qty,
            movement_type: 'order_cancelled_restore',
            reason: `Restored from cancelled order ${cur.order_number ?? orderId}`,
            reference_id: orderId,
            created_by: adminEmail,
          });
        }
      }
    }

    await this.client
      .from('orders')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    const all = await this.getAllOrders();
    return all.find((o) => o.id === orderId)!;
  }

  async upsertProduct(input: Partial<Product> & { id?: string }, adminEmail: string): Promise<Product> {
    // Convert UI (price, discount_price) -> Supabase (price, compare_at_price)
    const rawPrice = Number(input.price ?? 0);
    const rawDiscount =
      input.discount_price !== undefined && input.discount_price !== null && Number(input.discount_price) > 0
        ? Number(input.discount_price)
        : null;
    const sellingPrice = rawDiscount !== null && rawDiscount < rawPrice ? rawDiscount : rawPrice;
    const compareAtPrice = rawDiscount !== null && rawDiscount < rawPrice ? rawPrice : null;

    if (input.id) {
      const { data: existing } = await this.client
        .from('products')
        .select('stock_quantity,name')
        .eq('id', input.id)
        .single();
      const prevStock = Number((existing as Record<string, unknown> | null)?.stock_quantity ?? 0);

      const updatePayload: Record<string, unknown> = {
        name: input.name,
        brand: input.brand,
        category_id: input.category_id === '' ? null : input.category_id,
        description: input.description,
        price: sellingPrice,
        compare_at_price: compareAtPrice,
        stock_quantity: input.stock_quantity,
        image_url: input.image_url,
        is_active: input.is_active,
        updated_at: new Date().toISOString(),
      };
      Object.keys(updatePayload).forEach((k) => updatePayload[k] === undefined && delete updatePayload[k]);

      const { error } = await this.client.from('products').update(updatePayload).eq('id', input.id);
      if (error) throw new Error(error.message);

      if (input.stock_quantity !== undefined && input.stock_quantity !== prevStock) {
        await this.client.from('inventory_movements').insert({
          product_id: input.id,
          change_quantity: input.stock_quantity - prevStock,
          previous_quantity: prevStock,
          new_quantity: input.stock_quantity,
          movement_type: 'adjustment',
          reason: 'Updated via product editor',
          created_by: adminEmail,
        });
      }
      const list = await this.getProducts(true);
      return list.find((p) => p.id === input.id)!;
    }

    const slugBase = (input.slug ?? input.name ?? 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${crypto.randomInt(100, 999)}`;
    const sku = input.specifications?.SKU || `GH-${slugBase.slice(0, 6).toUpperCase()}-${crypto.randomInt(100, 999)}`;

    const { data: created, error } = await this.client
      .from('products')
      .insert({
        name: input.name,
        slug,
        sku,
        brand: input.brand ?? 'GizmoHub',
        category_id: input.category_id || null,
        description: input.description ?? '',
        price: sellingPrice,
        compare_at_price: compareAtPrice,
        stock_quantity: Number(input.stock_quantity ?? 0),
        image_url: input.image_url ?? null,
        is_active: input.is_active ?? true,
      })
      .select('id')
      .single();

    if (error || !created) throw new Error(error?.message ?? 'Failed to create product.');
    const list = await this.getProducts(true);
    return list.find((p) => p.id === String((created as Record<string, unknown>).id))!;
  }

  async deleteOrDeactivateProduct(productId: string, hardDelete = false) {
    if (hardDelete) {
      const { error } = await this.client.from('products').delete().eq('id', productId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await this.client.from('products').update({ is_active: false }).eq('id', productId);
      if (error) throw new Error(error.message);
    }
  }

  async seedStarterCatalog(adminEmail: string): Promise<{ categoriesInserted: number; productsInserted: number }> {
    const existingCats = await this.getCategories(true);
    const catBySlug = new Map(existingCats.map((c) => [c.slug, c.id]));
    const fallbackCats = fallbackStore.getCategories(true);
    let categoriesInserted = 0;

    for (const fc of fallbackCats) {
      if (!catBySlug.has(fc.slug)) {
        const { data, error } = await this.client
          .from('categories')
          .insert({
            name: fc.name,
            slug: fc.slug,
            description: fc.description,
            is_active: fc.is_active,
          })
          .select('id,slug')
          .single();
        if (error) throw new Error(error.message);
        if (data) {
          catBySlug.set(String((data as Record<string, unknown>).slug), String((data as Record<string, unknown>).id));
          categoriesInserted += 1;
        }
      }
    }

    const existingProds = await this.getProducts(true);
    const existingSlugs = new Set(existingProds.map((p) => p.slug));
    const fallbackProds = fallbackStore.getProducts(true);
    let productsInserted = 0;

    for (const fp of fallbackProds) {
      if (existingSlugs.has(fp.slug)) continue;
      const fallbackCat = fallbackCats.find((c) => c.id === fp.category_id);
      const targetCatId = fallbackCat ? catBySlug.get(fallbackCat.slug) ?? null : null;
      const hasDiscount = fp.discount_price !== null && fp.discount_price > 0 && fp.discount_price < fp.price;
      const sellingPrice = hasDiscount ? fp.discount_price! : fp.price;
      const compareAtPrice = hasDiscount ? fp.price : null;
      const sku = `GH-${fp.slug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${crypto.randomInt(100, 999)}`;

      const { data: created, error } = await this.client
        .from('products')
        .insert({
          name: fp.name,
          slug: fp.slug,
          sku,
          brand: fp.brand,
          category_id: targetCatId,
          description: fp.description,
          price: sellingPrice,
          compare_at_price: compareAtPrice,
          stock_quantity: fp.stock_quantity,
          image_url: fp.image_url,
          is_active: fp.is_active,
        })
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      productsInserted += 1;

      if (created && fp.stock_quantity > 0) {
        await this.client.from('inventory_movements').insert({
          product_id: String((created as Record<string, unknown>).id),
          change_quantity: fp.stock_quantity,
          previous_quantity: 0,
          new_quantity: fp.stock_quantity,
          movement_type: 'restock',
          reason: 'Starter catalog import',
          created_by: adminEmail,
        });
      }
    }

    return { categoriesInserted, productsInserted };
  }

  async upsertCategory(input: Partial<Category> & { id?: string }): Promise<Category> {
    // categories schema: id, name, slug, description, is_active, created_at
    if (input.id) {
      const updatePayload: Record<string, unknown> = {
        name: input.name,
        description: input.description,
        is_active: input.is_active,
      };
      Object.keys(updatePayload).forEach((k) => updatePayload[k] === undefined && delete updatePayload[k]);
      const { error } = await this.client.from('categories').update(updatePayload).eq('id', input.id);
      if (error) throw new Error(error.message);
      const all = await this.getCategories(true);
      return all.find((c) => c.id === input.id)!;
    }
    const slug = (input.slug ?? input.name ?? 'category')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const { data, error } = await this.client
      .from('categories')
      .insert({
        name: input.name,
        slug,
        description: input.description ?? null,
        is_active: input.is_active ?? true,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create category.');
    const all = await this.getCategories(true);
    return all.find((c) => c.id === String((data as Record<string, unknown>).id))!;
  }

  async adjustInventory(
    input: { product_id: string; delta: number; movement_type: 'restock' | 'adjustment'; reason: string },
    adminEmail: string
  ): Promise<{ product: Product; movement: InventoryMovement }> {
    const { data: prod, error: fetchErr } = await this.client
      .from('products')
      .select('stock_quantity,name')
      .eq('id', input.product_id)
      .single();
    if (fetchErr || !prod) throw new Error('Product not found.');

    const prev = Number((prod as Record<string, unknown>).stock_quantity ?? 0);
    const next = prev + Math.trunc(input.delta);
    if (next < 0) throw new Error('Stock quantity cannot become negative.');

    const { error: updErr } = await this.client
      .from('products')
      .update({ stock_quantity: next, updated_at: new Date().toISOString() })
      .eq('id', input.product_id);
    if (updErr) throw new Error(updErr.message);

    // Best-effort log to inventory_movements if table exists
    const { data: movData } = await this.client
      .from('inventory_movements')
      .insert({
        product_id: input.product_id,
        change_quantity: Math.trunc(input.delta),
        previous_quantity: prev,
        new_quantity: next,
        movement_type: input.movement_type,
        reason: input.reason,
        created_by: adminEmail,
      })
      .select('*')
      .single();

    const products = await this.getProducts(true);
    const product = products.find((p) => p.id === input.product_id)!;
    const m = (movData ?? {}) as Record<string, unknown>;
    return {
      product,
      movement: {
        id: String(m.id ?? crypto.randomUUID()),
        product_id: input.product_id,
        product_name: product.name,
        change_quantity: Math.trunc(input.delta),
        previous_quantity: prev,
        new_quantity: next,
        movement_type: input.movement_type,
        reason: input.reason,
        created_by: adminEmail,
        created_at: String(m.created_at ?? new Date().toISOString()),
      },
    };
  }

  async getInventoryMovements(): Promise<InventoryMovement[]> {
    const [{ data, error }, products] = await Promise.all([
      this.client.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(100),
      this.getProducts(true),
    ]);
    if (error) {
      // Gracefully return empty if inventory_movements table is not exposed yet
      return [];
    }
    const prodMap = new Map(products.map((p) => [p.id, p.name]));
    return (data ?? []).map((raw) => {
      const r = raw as Record<string, unknown>;
      const pid = String(r.product_id);
      return {
        id: String(r.id),
        product_id: pid,
        product_name: prodMap.get(pid) ?? 'Product',
        change_quantity: Number(r.change_quantity ?? 0),
        previous_quantity: Number(r.previous_quantity ?? 0),
        new_quantity: Number(r.new_quantity ?? 0),
        movement_type: (r.movement_type as InventoryMovement['movement_type']) ?? 'adjustment',
        reason: String(r.reason ?? ''),
        reference_id: (r.reference_id as string | null) ?? null,
        created_by: (r.created_by as string | null) ?? null,
        created_at: String(r.created_at ?? new Date().toISOString()),
      };
    });
  }

  async upsertDeliveryZone(input: Partial<DeliveryZone> & { id?: string }): Promise<DeliveryZone> {
    if (input.id) {
      const { error } = await this.client.from('delivery_zones').update(input).eq('id', input.id);
      if (error) {
        return fallbackStore.upsertDeliveryZone(input);
      }
      const all = await this.getDeliveryZones(true);
      return all.find((z) => z.id === input.id)!;
    }
    const { data, error } = await this.client
      .from('delivery_zones')
      .insert(input)
      .select('id')
      .single();
    if (error || !data) {
      return fallbackStore.upsertDeliveryZone(input);
    }
    const all = await this.getDeliveryZones(true);
    return all.find((z) => z.id === String((data as Record<string, unknown>).id))!;
  }

  async uploadProductImage(fileName: string, base64Data: string, contentType: string): Promise<string> {
    const buffer = Buffer.from(base64Data, 'base64');
    const cleanName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const bucketCandidates = ['product-images', 'products', 'public'];
    for (const bucket of bucketCandidates) {
      const { error } = await this.client.storage.from(bucket).upload(cleanName, buffer, {
        contentType,
        upsert: false,
      });
      if (!error) {
        const { data } = this.client.storage.from(bucket).getPublicUrl(cleanName);
        return data.publicUrl;
      }
    }
    throw new Error('Could not upload to Supabase Storage. Ensure a "product-images" bucket exists.');
  }
}
