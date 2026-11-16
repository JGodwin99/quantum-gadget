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

function pickFirst<T>(row: Record<string, unknown>, keys: string[], fallback: T): T {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) {
      return row[k] as T;
    }
  }
  return fallback;
}

export class SupabaseStore {
  private client: SupabaseClient;
  private url: string;
  private publishableKey: string;
  private idempotencyCache = new Map<string, Order>();

  constructor(url: string, secretKey: string, publishableKey: string) {
    this.url = url;
    this.publishableKey = publishableKey;
    this.client = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async inspectSchema(): Promise<SupabaseSchemaInfo> {
    const tables = [
      'admins',
      'customer_profiles',
      'categories',
      'products',
      'orders',
      'order_items',
      'store_settings',
      'delivery_zones',
      'inventory_movements',
    ];
    const tablesDetected: SupabaseSchemaInfo['tablesDetected'] = {};
    const notes: string[] = [];

    for (const table of tables) {
      const { data, error, count } = await this.client
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      if (error) {
        tablesDetected[table] = { exists: false, columns: [] };
        notes.push(`Table "${table}": ${error.message}`);
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
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

    // Check admins table by user_id or email
    const { data: adminRows } = await this.client
      .from('admins')
      .select('*')
      .or(`user_id.eq.${u.id},id.eq.${u.id},email.eq.${u.email ?? ''}`)
      .limit(1);

    const isAdmin = Boolean(adminRows && adminRows.length > 0);

    // Fetch customer_profiles if exists
    const { data: profileRows } = await this.client
      .from('customer_profiles')
      .select('*')
      .or(`id.eq.${u.id},user_id.eq.${u.id}`)
      .limit(1);

    const p = (profileRows?.[0] ?? {}) as Record<string, unknown>;
    return {
      id: u.id,
      email: u.email ?? '',
      full_name: pickFirst<string>(p, ['full_name', 'name'], (u.user_metadata?.full_name as string) ?? ''),
      phone: pickFirst<string>(p, ['phone', 'phone_number'], (u.user_metadata?.phone as string) ?? ''),
      country: pickFirst<string>(p, ['country'], ''),
      city: pickFirst<string>(p, ['city'], ''),
      address: pickFirst<string>(p, ['address', 'delivery_address'], ''),
      role: isAdmin ? 'admin' : 'customer',
      created_at: u.created_at,
    };
  }

  async getStoreSettings(): Promise<StoreSettings> {
    const { data } = await this.client.from('store_settings').select('*').limit(1);
    const row = (data?.[0] ?? {}) as Record<string, unknown>;
    return {
      store_name: pickFirst<string>(row, ['store_name', 'name'], 'GizmoHub'),
      currency: pickFirst<string>(row, ['currency'], 'USD'),
      cod_enabled: Boolean(pickFirst<boolean>(row, ['cod_enabled', 'cash_on_delivery_enabled'], true)),
      free_shipping_threshold: pickFirst<number | null>(
        row,
        ['free_shipping_threshold', 'free_delivery_threshold'],
        null
      ),
      default_low_stock_threshold: Number(
        pickFirst<number>(row, ['default_low_stock_threshold', 'low_stock_threshold'], 5)
      ),
      support_email: pickFirst<string>(row, ['support_email', 'email'], 'support@gizmohub.store'),
      support_phone: pickFirst<string>(row, ['support_phone', 'phone'], '+1 (800) 555-0194'),
    };
  }

  async updateStoreSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
    const { data } = await this.client.from('store_settings').select('*').limit(1);
    if (data && data.length > 0) {
      const id = (data[0] as Record<string, unknown>).id;
      await this.client.from('store_settings').update(patch).eq('id', id);
    }
    return this.getStoreSettings();
  }

  async getCategories(includeInactive = false): Promise<Category[]> {
    const { data, error } = await this.client.from('categories').select('*');
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((raw) => {
        const r = raw as Record<string, unknown>;
        return {
          id: String(r.id),
          name: pickFirst<string>(r, ['name', 'title'], 'Category'),
          slug: pickFirst<string>(r, ['slug'], String(r.id)),
          description: pickFirst<string | null>(r, ['description'], null),
          image_url: pickFirst<string | null>(r, ['image_url', 'thumbnail_url', 'image'], null),
          is_active: Boolean(pickFirst<boolean>(r, ['is_active', 'active'], true)),
          display_order: Number(pickFirst<number>(r, ['display_order', 'sort_order'], 99)),
          created_at: pickFirst<string>(r, ['created_at'], new Date().toISOString()),
        };
      })
      .filter((c) => includeInactive || c.is_active)
      .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));
  }

  async getProducts(includeInactive = false): Promise<Product[]> {
    const [{ data: rawProducts, error }, categories, { data: rawOrderItems }] = await Promise.all([
      this.client.from('products').select('*'),
      this.getCategories(true),
      this.client.from('order_items').select('product_id,quantity,order_id'),
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
        const categoryId = pickFirst<string | null>(r, ['category_id'], null);
        const price = Number(pickFirst<number>(r, ['price', 'base_price'], 0));
        const discount = pickFirst<number | null>(
          r,
          ['discount_price', 'sale_price', 'discounted_price'],
          null
        );
        const stock = Number(pickFirst<number>(r, ['stock_quantity', 'stock', 'quantity'], 0));
        const imagesArr = Array.isArray(r.images) ? (r.images as string[]) : [];
        return {
          id: String(r.id),
          name: pickFirst<string>(r, ['name', 'title'], 'Product'),
          slug: pickFirst<string>(r, ['slug'], String(r.id)),
          brand: pickFirst<string>(r, ['brand'], 'GizmoHub'),
          category_id: categoryId,
          category_name: categoryId ? catMap.get(categoryId) ?? 'Gadgets' : 'Gadgets',
          description: pickFirst<string>(r, ['description', 'summary'], ''),
          price,
          discount_price: discount !== null ? Number(discount) : null,
          stock_quantity: stock,
          low_stock_threshold: Number(pickFirst<number>(r, ['low_stock_threshold'], 5)),
          image_url: pickFirst<string | null>(
            r,
            ['image_url', 'thumbnail_url', 'main_image'],
            imagesArr[0] ?? null
          ),
          gallery_urls: imagesArr,
          specifications:
            typeof r.specifications === 'object' && r.specifications !== null
              ? (r.specifications as Record<string, string>)
              : undefined,
          is_active: Boolean(pickFirst<boolean>(r, ['is_active', 'active'], true)),
          is_featured: Boolean(pickFirst<boolean>(r, ['is_featured', 'featured'], false)),
          units_sold: salesMap.get(String(r.id)) ?? 0,
          created_at: pickFirst<string>(r, ['created_at'], new Date().toISOString()),
        };
      })
      .filter((p) => includeInactive || p.is_active)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getDeliveryZones(includeInactive = false): Promise<DeliveryZone[]> {
    const { data, error } = await this.client.from('delivery_zones').select('*');
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((raw) => {
        const r = raw as Record<string, unknown>;
        return {
          id: String(r.id),
          name: pickFirst<string>(r, ['name', 'zone_name', 'country'], 'Delivery Zone'),
          country: pickFirst<string>(r, ['country', 'country_name'], ''),
          city: pickFirst<string | null>(r, ['city', 'city_name'], null),
          delivery_fee: Number(pickFirst<number>(r, ['delivery_fee', 'fee', 'shipping_fee'], 0)),
          free_shipping_threshold: pickFirst<number | null>(
            r,
            ['free_shipping_threshold', 'free_delivery_threshold'],
            null
          ),
          estimated_delivery_days: String(
            pickFirst<string>(r, ['estimated_delivery_days', 'estimated_days', 'delivery_time'], '2-4 business days')
          ),
          is_active: Boolean(pickFirst<boolean>(r, ['is_active', 'active'], true)),
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

    // Attempt atomic RPC if deployed, otherwise perform conditional optimistic update + rollback
    const deducted: Array<{ productId: string; prevStock: number; qty: number }> = [];
    try {
      for (const entry of resolved) {
        const newQty = entry.product.stock_quantity - entry.quantity;
        const { data: updatedRows, error: stockErr } = await this.client
          .from('products')
          .update({ stock_quantity: newQty })
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

      const { data: orderData, error: orderErr } = await this.client
        .from('orders')
        .insert({
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
        })
        .select('*')
        .single();

      if (orderErr || !orderData) {
        throw new Error(orderErr?.message ?? 'Failed to record order.');
      }

      const orderId = String((orderData as Record<string, unknown>).id);
      const itemInserts = resolved.map((entry) => ({
        order_id: orderId,
        product_id: entry.product.id,
        product_name: entry.product.name,
        quantity: entry.quantity,
        unit_price: entry.unitPrice,
        total_price: Number((entry.unitPrice * entry.quantity).toFixed(2)),
      }));

      const { data: insertedItems, error: itemsErr } = await this.client
        .from('order_items')
        .insert(itemInserts)
        .select('*');

      if (itemsErr) {
        await this.client.from('orders').delete().eq('id', orderId);
        throw new Error(itemsErr.message);
      }

      // Log inventory movements
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
            total_price: Number(r.total_price),
          };
        }),
        created_at: String((orderData as Record<string, unknown>).created_at ?? new Date().toISOString()),
      };

      if (input.idempotencyKey) {
        this.idempotencyCache.set(input.idempotencyKey, order);
      }
      return { order, duplicate: false };
    } catch (err) {
      // Roll back any already deducted stock
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
        product_name: pickFirst<string>(r, ['product_name'], 'Product'),
        quantity: Number(r.quantity ?? 1),
        unit_price: Number(r.unit_price ?? 0),
        total_price: Number(r.total_price ?? Number(r.unit_price ?? 0) * Number(r.quantity ?? 1)),
      });
      itemsByOrder.set(oid, list);
    }

    return rawOrders.map((r) => ({
      id: String(r.id),
      order_number: pickFirst<string>(r, ['order_number'], String(r.id)),
      user_id: pickFirst<string | null>(r, ['user_id', 'customer_id'], null),
      customer_name: pickFirst<string>(r, ['customer_name', 'full_name'], ''),
      customer_phone: pickFirst<string>(r, ['customer_phone', 'phone'], ''),
      customer_email: pickFirst<string | null>(r, ['customer_email', 'email'], null),
      country: pickFirst<string>(r, ['country'], ''),
      city: pickFirst<string>(r, ['city'], ''),
      delivery_address: pickFirst<string>(r, ['delivery_address', 'address'], ''),
      delivery_instructions: pickFirst<string | null>(r, ['delivery_instructions', 'notes'], null),
      delivery_zone_id: pickFirst<string | null>(r, ['delivery_zone_id'], null),
      subtotal: Number(r.subtotal ?? 0),
      delivery_fee: Number(r.delivery_fee ?? 0),
      total_amount: Number(r.total_amount ?? 0),
      payment_method: 'cash_on_delivery',
      payment_status: pickFirst<PaymentStatus>(r, ['payment_status'], 'unpaid'),
      order_status: pickFirst<OrderStatus>(r, ['order_status', 'status'], 'pending'),
      items: itemsByOrder.get(String(r.id)) ?? [],
      created_at: pickFirst<string>(r, ['created_at'], new Date().toISOString()),
      updated_at: pickFirst<string | undefined>(r, ['updated_at'], undefined),
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
    const dbPhone = String(raw.customer_phone ?? raw.phone ?? '').replace(/[^0-9+]/g, '');
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
    const { data: existing } = await this.client
      .from('customer_profiles')
      .select('*')
      .eq('id', userId)
      .limit(1);

    if (existing && existing.length > 0) {
      await this.client.from('customer_profiles').update(patch).eq('id', userId);
    } else {
      await this.client.from('customer_profiles').insert({ id: userId, email, ...patch });
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
            .update({ stock_quantity: prev + qty })
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
        category_id: input.category_id,
        description: input.description,
        price: input.price,
        discount_price: input.discount_price && input.discount_price > 0 ? input.discount_price : null,
        stock_quantity: input.stock_quantity,
        low_stock_threshold: input.low_stock_threshold,
        image_url: input.image_url,
        specifications: input.specifications,
        is_active: input.is_active,
        is_featured: input.is_featured,
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

    const slug = (input.slug ?? input.name ?? 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + crypto.randomInt(100, 999);

    const { data: created, error } = await this.client
      .from('products')
      .insert({
        name: input.name,
        slug,
        brand: input.brand ?? 'GizmoHub',
        category_id: input.category_id,
        description: input.description ?? '',
        price: Number(input.price ?? 0),
        discount_price: input.discount_price && input.discount_price > 0 ? Number(input.discount_price) : null,
        stock_quantity: Number(input.stock_quantity ?? 0),
        low_stock_threshold: Number(input.low_stock_threshold ?? 5),
        image_url: input.image_url ?? null,
        specifications: input.specifications ?? {},
        is_active: input.is_active ?? true,
        is_featured: input.is_featured ?? true,
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

  async upsertCategory(input: Partial<Category> & { id?: string }): Promise<Category> {
    if (input.id) {
      const { error } = await this.client.from('categories').update(input).eq('id', input.id);
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
        image_url: input.image_url ?? null,
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
      .update({ stock_quantity: next })
      .eq('id', input.product_id);
    if (updErr) throw new Error(updErr.message);

    const { data: movData, error: movErr } = await this.client
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
    if (movErr) throw new Error(movErr.message);

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
    if (error) throw new Error(error.message);
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
        movement_type: pickFirst<InventoryMovement['movement_type']>(r, ['movement_type'], 'adjustment'),
        reason: pickFirst<string>(r, ['reason'], ''),
        reference_id: pickFirst<string | null>(r, ['reference_id'], null),
        created_by: pickFirst<string | null>(r, ['created_by'], null),
        created_at: String(r.created_at ?? new Date().toISOString()),
      };
    });
  }

  async upsertDeliveryZone(input: Partial<DeliveryZone> & { id?: string }): Promise<DeliveryZone> {
    if (input.id) {
      const { error } = await this.client.from('delivery_zones').update(input).eq('id', input.id);
      if (error) throw new Error(error.message);
      const all = await this.getDeliveryZones(true);
      return all.find((z) => z.id === input.id)!;
    }
    const { data, error } = await this.client
      .from('delivery_zones')
      .insert(input)
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to save delivery zone.');
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
