import crypto from 'node:crypto';
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
} from '../src/types/store.ts';

// Temporary fallback repository used strictly when Supabase credentials are not yet configured.
// Isolated cleanly from server/supabaseStore.ts so real database integration remains separate.

interface FallbackUserRecord extends CustomerProfile {
  passwordHash: string;
}

interface FallbackState {
  storeSettings: StoreSettings;
  categories: Category[];
  products: Product[];
  deliveryZones: DeliveryZone[];
  orders: Order[];
  inventoryMovements: InventoryMovement[];
  users: FallbackUserRecord[];
  sessions: Map<string, string>;
  idempotencyKeys: Map<string, Order>;
  newsletterSubscribers: Set<string>;
  contactMessages: Array<{ id: string; name: string; email: string; subject: string; message: string; created_at: string }>;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`gizmohub-salt:${password}`).digest('hex');
}

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400_000).toISOString();

const state: FallbackState = {
  storeSettings: {
    store_name: 'GizmoHub',
    currency: 'USD',
    cod_enabled: true,
    free_shipping_threshold: 150,
    default_low_stock_threshold: 5,
    support_email: 'support@gizmohub.store',
    support_phone: '+1 (800) 555-0194',
  },
  categories: [
    {
      id: 'cat-audio',
      name: 'Audio Devices',
      slug: 'audio-devices',
      description: 'Studio-grade headphones, wireless earbuds, and acoustic desktop speakers.',
      image_url: '/src/assets/images/cat_audio_devices_1794799613236.jpg',
      is_active: true,
      display_order: 1,
      created_at: daysAgo(60),
    },
    {
      id: 'cat-watches',
      name: 'Smart Watches',
      slug: 'smart-watches',
      description: 'Titanium wearables with sapphire glass, GPS tracking, and multi-day battery.',
      image_url: '/src/assets/images/cat_smart_watches_1794799613981.jpg',
      is_active: true,
      display_order: 2,
      created_at: daysAgo(58),
    },
    {
      id: 'cat-power',
      name: 'Power Solutions',
      slug: 'power-solutions',
      description: 'High-wattage GaN chargers, magnetic power banks, and braided USB-C cables.',
      image_url: '/src/assets/images/cat_power_solutions_1794799613842.jpg',
      is_active: true,
      display_order: 3,
      created_at: daysAgo(55),
    },
    {
      id: 'cat-drones',
      name: 'Drones & Cameras',
      slug: 'drones-cameras',
      description: 'Compact 4K gimbal drones, portable SSD media storage, and creator hardware.',
      image_url: '/src/assets/images/cat_drones_cameras_1794799614383.jpg',
      is_active: true,
      display_order: 4,
      created_at: daysAgo(50),
    },
  ],
  products: [
    {
      id: 'prod-aether-anc',
      name: 'Aether Studio ANC Headphones',
      slug: 'aether-studio-anc-headphones',
      brand: 'SonicLab',
      category_id: 'cat-audio',
      description:
        'Precision-tuned 40mm planar drivers paired with adaptive hybrid active noise cancellation and 45-hour battery endurance in a matte anodized chassis.',
      price: 299,
      discount_price: 249,
      stock_quantity: 18,
      low_stock_threshold: 5,
      image_url: '/src/assets/images/cat_audio_devices_1794799613236.jpg',
      specifications: {
        Drivers: '40mm Custom Planar',
        Connectivity: 'Bluetooth 5.4 · USB-C Lossless',
        Battery: '45 Hours (ANC On)',
        Weight: '254g',
      },
      is_active: true,
      is_featured: true,
      created_at: daysAgo(45),
    },
    {
      id: 'prod-chronos-ti',
      name: 'Chronos Titanium Watch Ultra',
      slug: 'chronos-titanium-watch-ultra',
      brand: 'Veloce',
      category_id: 'cat-watches',
      description:
        'Grade-5 brushed titanium case with dual-frequency L1+L5 GPS, LTPO OLED 2000-nit display, and continuous heart-rate telemetry.',
      price: 399,
      discount_price: 349,
      stock_quantity: 12,
      low_stock_threshold: 5,
      image_url: '/src/assets/images/cat_smart_watches_1794799613981.jpg',
      specifications: {
        Case: '47mm Grade-5 Titanium',
        Display: '1.92" LTPO OLED Sapphire',
        WaterResistance: '100m / EN13319',
        Battery: 'Up to 72 Hours',
      },
      is_active: true,
      is_featured: true,
      created_at: daysAgo(30),
    },
    {
      id: 'prod-volt-140w',
      name: 'VoltCore 140W GaN Station & MagPack',
      slug: 'voltcore-140w-gan-station-magpack',
      brand: 'VoltCore',
      category_id: 'cat-power',
      description:
        'Dual-port PD 3.1 140W GaN wall adapter bundled with a 10,000mAh Qi2 magnetic aluminum battery pack and 240W braided USB-C cable.',
      price: 129,
      discount_price: 99,
      stock_quantity: 27,
      low_stock_threshold: 6,
      image_url: '/src/assets/images/cat_power_solutions_1794799613842.jpg',
      specifications: {
        Output: '140W USB-C PD 3.1',
        PowerBank: '10,000mAh Qi2 15W Magnetic',
        Cable: '1.5m 240W Braided Nylon',
        Protection: 'ThermalGuard 2.0',
      },
      is_active: true,
      is_featured: true,
      created_at: daysAgo(12),
    },
    {
      id: 'prod-skyhawk-4k',
      name: 'SkyHawk Mini 4K Gimbal Drone',
      slug: 'skyhawk-mini-4k-gimbal-drone',
      brand: 'AeroSight',
      category_id: 'cat-drones',
      description:
        'Sub-249g foldable aerial camera platform featuring a 3-axis mechanical gimbal, 1/1.3-inch CMOS sensor, 4K60 HDR capture, and 38-minute flight time.',
      price: 549,
      discount_price: 489,
      stock_quantity: 4,
      low_stock_threshold: 5,
      image_url: '/src/assets/images/cat_drones_cameras_1794799614383.jpg',
      specifications: {
        Sensor: '1/1.3" CMOS · 48MP',
        Video: '4K / 60fps 10-bit',
        FlightTime: '38 Minutes',
        TakeoffWeight: '248g Foldable',
      },
      is_active: true,
      is_featured: true,
      created_at: daysAgo(20),
    },
    {
      id: 'prod-pulse-buds',
      name: 'Pulse Pro Wireless Earbuds',
      slug: 'pulse-pro-wireless-earbuds',
      brand: 'SonicLab',
      category_id: 'cat-audio',
      description:
        'Dual-driver acoustic architecture with brushed aluminum touch stems, 48dB adaptive noise isolation, and wireless Qi charging pebble case.',
      price: 159,
      discount_price: null,
      stock_quantity: 24,
      low_stock_threshold: 5,
      image_url: '/src/assets/images/prod_earbuds_wireless_1794799614673.jpg',
      specifications: {
        Drivers: '11mm Dynamic + Planar Tweeter',
        Codec: 'LDAC / AAC / SBC',
        Battery: '8h Buds · 32h Case',
        Rating: 'IP55 Dust & Sweat',
      },
      is_active: true,
      is_featured: true,
      created_at: daysAgo(3),
    },
    {
      id: 'prod-keycraft-75',
      name: 'KeyCraft 75 CNC Wireless Keyboard',
      slug: 'keycraft-75-cnc-wireless-keyboard',
      brand: 'KeyCraft',
      category_id: 'cat-power',
      description:
        'CNC-machined 6063 aluminum 75% gasket-mounted mechanical keyboard with hot-swappable tactile switches, PBT keycaps, and tri-mode wireless.',
      price: 189,
      discount_price: 169,
      stock_quantity: 9,
      low_stock_threshold: 5,
      image_url: '/src/assets/images/prod_mech_keyboard_1794799614796.jpg',
      specifications: {
        Chassis: 'CNC 6063 Anodized Aluminum',
        Mount: 'Poron Gasket Mount',
        Connectivity: '2.4GHz · Bluetooth 5.3 · USB-C',
        Battery: '4000mAh Rechargeable',
      },
      is_active: true,
      is_featured: true,
      created_at: daysAgo(2),
    },
    {
      id: 'prod-vault-ssd-2tb',
      name: 'VaultDrive 2TB Portable NVMe SSD',
      slug: 'vaultdrive-2tb-portable-nvme-ssd',
      brand: 'VaultDrive',
      category_id: 'cat-drones',
      description:
        'Rugged pocket-sized USB 3.2 Gen 2x2 solid-state drive delivering sustained 2,000MB/s transfers for 4K ProRes camera workflows and backups.',
      price: 179,
      discount_price: 149,
      stock_quantity: 3,
      low_stock_threshold: 5,
      image_url: '/src/assets/images/prod_portable_ssd_1794799615296.jpg',
      specifications: {
        Capacity: '2TB NVMe M.2',
        Speed: 'Up to 2,050 MB/s Read',
        Interface: 'USB-C 20Gbps',
        Enclosure: 'Fin-Cooled Aluminum · IP65',
      },
      is_active: true,
      is_featured: false,
      created_at: daysAgo(5),
    },
    {
      id: 'prod-resonance-one',
      name: 'Resonance One Acoustic Smart Speaker',
      slug: 'resonance-one-acoustic-smart-speaker',
      brand: 'SonicLab',
      category_id: 'cat-audio',
      description:
        '360-degree spatial room-calibrating desktop speaker wrapped in acoustic charcoal textile with machined aluminum touch top plate.',
      price: 219,
      discount_price: null,
      stock_quantity: 14,
      low_stock_threshold: 4,
      image_url: '/src/assets/images/prod_smart_speaker_1794799615471.jpg',
      specifications: {
        Amplification: '90W Class-D Tri-Amp',
        Connectivity: 'Wi-Fi 6 · AirPlay 2 · Bluetooth',
        Microphones: 'Far-field 4-mic Array with Mute',
        Dimensions: '182mm × 112mm',
      },
      is_active: true,
      is_featured: false,
      created_at: daysAgo(1),
    },
  ],
  deliveryZones: [
    {
      id: 'zone-us-ny',
      name: 'New York & Tri-State Metro',
      country: 'United States',
      city: 'New York',
      delivery_fee: 8,
      free_shipping_threshold: 150,
      estimated_delivery_days: '1-2 business days',
      is_active: true,
    },
    {
      id: 'zone-us-ca',
      name: 'California Metro Delivery',
      country: 'United States',
      city: 'Los Angeles',
      delivery_fee: 10,
      free_shipping_threshold: 150,
      estimated_delivery_days: '2-3 business days',
      is_active: true,
    },
    {
      id: 'zone-uk-lon',
      name: 'Greater London Courier',
      country: 'United Kingdom',
      city: 'London',
      delivery_fee: 12,
      free_shipping_threshold: 180,
      estimated_delivery_days: '2-3 business days',
      is_active: true,
    },
    {
      id: 'zone-ae-dxb',
      name: 'Dubai & Abu Dhabi Express COD',
      country: 'United Arab Emirates',
      city: 'Dubai',
      delivery_fee: 9,
      free_shipping_threshold: 150,
      estimated_delivery_days: 'Same / Next day',
      is_active: true,
    },
    {
      id: 'zone-ca-tor',
      name: 'Toronto & Ontario Metro',
      country: 'Canada',
      city: 'Toronto',
      delivery_fee: 14,
      free_shipping_threshold: 200,
      estimated_delivery_days: '2-4 business days',
      is_active: true,
    },
    {
      id: 'zone-sg',
      name: 'Singapore Islandwide COD',
      country: 'Singapore',
      city: 'Singapore',
      delivery_fee: 7,
      free_shipping_threshold: 120,
      estimated_delivery_days: '1-2 business days',
      is_active: true,
    },
  ],
  orders: [
    {
      id: 'ord-1001',
      order_number: 'GH-2026-1041',
      user_id: 'user-customer-1',
      customer_name: 'Marcus Vance',
      customer_phone: '+14155550142',
      customer_email: 'customer@gizmohub.store',
      country: 'United States',
      city: 'New York',
      delivery_address: '420 Lexington Ave, Suite 14B',
      delivery_instructions: 'Call on arrival at reception desk.',
      delivery_zone_id: 'zone-us-ny',
      subtotal: 348,
      delivery_fee: 0,
      total_amount: 348,
      payment_method: 'cash_on_delivery',
      payment_status: 'paid',
      order_status: 'delivered',
      items: [
        {
          id: 'oi-1',
          order_id: 'ord-1001',
          product_id: 'prod-aether-anc',
          product_name: 'Aether Studio ANC Headphones',
          product_brand: 'SonicLab',
          product_image: '/src/assets/images/cat_audio_devices_1794799613236.jpg',
          quantity: 1,
          unit_price: 249,
          total_price: 249,
        },
        {
          id: 'oi-2',
          order_id: 'ord-1001',
          product_id: 'prod-volt-140w',
          product_name: 'VoltCore 140W GaN Station & MagPack',
          product_brand: 'VoltCore',
          product_image: '/src/assets/images/cat_power_solutions_1794799613842.jpg',
          quantity: 1,
          unit_price: 99,
          total_price: 99,
        },
      ],
      created_at: daysAgo(9),
      updated_at: daysAgo(6),
    },
    {
      id: 'ord-1002',
      order_number: 'GH-2026-1042',
      user_id: null,
      customer_name: 'Nadia Al-Mansoor',
      customer_phone: '+971505550188',
      customer_email: 'nadia.m@example.com',
      country: 'United Arab Emirates',
      city: 'Dubai',
      delivery_address: 'Marina Gate Tower 2, Apt 2104',
      delivery_instructions: 'Evening delivery after 6 PM preferred.',
      delivery_zone_id: 'zone-ae-dxb',
      subtotal: 448,
      delivery_fee: 0,
      total_amount: 448,
      payment_method: 'cash_on_delivery',
      payment_status: 'unpaid',
      order_status: 'shipped',
      items: [
        {
          id: 'oi-3',
          order_id: 'ord-1002',
          product_id: 'prod-chronos-ti',
          product_name: 'Chronos Titanium Watch Ultra',
          product_brand: 'Veloce',
          product_image: '/src/assets/images/cat_smart_watches_1794799613981.jpg',
          quantity: 1,
          unit_price: 349,
          total_price: 349,
        },
        {
          id: 'oi-4',
          order_id: 'ord-1002',
          product_id: 'prod-volt-140w',
          product_name: 'VoltCore 140W GaN Station & MagPack',
          product_brand: 'VoltCore',
          product_image: '/src/assets/images/cat_power_solutions_1794799613842.jpg',
          quantity: 1,
          unit_price: 99,
          total_price: 99,
        },
      ],
      created_at: daysAgo(2),
      updated_at: daysAgo(1),
    },
    {
      id: 'ord-1003',
      order_number: 'GH-2026-1043',
      user_id: 'user-customer-1',
      customer_name: 'Marcus Vance',
      customer_phone: '+14155550142',
      customer_email: 'customer@gizmohub.store',
      country: 'United States',
      city: 'New York',
      delivery_address: '420 Lexington Ave, Suite 14B',
      delivery_instructions: null,
      delivery_zone_id: 'zone-us-ny',
      subtotal: 149,
      delivery_fee: 8,
      total_amount: 157,
      payment_method: 'cash_on_delivery',
      payment_status: 'unpaid',
      order_status: 'pending',
      items: [
        {
          id: 'oi-5',
          order_id: 'ord-1003',
          product_id: 'prod-vault-ssd-2tb',
          product_name: 'VaultDrive 2TB Portable NVMe SSD',
          product_brand: 'VaultDrive',
          product_image: '/src/assets/images/prod_portable_ssd_1794799615296.jpg',
          quantity: 1,
          unit_price: 149,
          total_price: 149,
        },
      ],
      created_at: daysAgo(0),
      updated_at: daysAgo(0),
    },
  ],
  inventoryMovements: [
    {
      id: 'mov-1',
      product_id: 'prod-aether-anc',
      product_name: 'Aether Studio ANC Headphones',
      change_quantity: 20,
      previous_quantity: 0,
      new_quantity: 20,
      movement_type: 'restock',
      reason: 'Initial warehouse intake',
      created_by: 'admin@gizmohub.store',
      created_at: daysAgo(45),
    },
    {
      id: 'mov-2',
      product_id: 'prod-aether-anc',
      product_name: 'Aether Studio ANC Headphones',
      change_quantity: -1,
      previous_quantity: 19,
      new_quantity: 18,
      movement_type: 'order_deduction',
      reason: 'COD Order GH-2026-1041',
      reference_id: 'ord-1001',
      created_by: 'system',
      created_at: daysAgo(9),
    },
    {
      id: 'mov-3',
      product_id: 'prod-vault-ssd-2tb',
      product_name: 'VaultDrive 2TB Portable NVMe SSD',
      change_quantity: -1,
      previous_quantity: 4,
      new_quantity: 3,
      movement_type: 'order_deduction',
      reason: 'COD Order GH-2026-1043',
      reference_id: 'ord-1003',
      created_by: 'system',
      created_at: daysAgo(0),
    },
  ],
  users: [
    {
      id: 'user-admin-1',
      email: 'admin@gizmohub.store',
      full_name: 'GizmoHub Operations Admin',
      phone: '+18005550194',
      country: 'United States',
      city: 'New York',
      address: '100 Tech Plaza, Floor 8',
      role: 'admin',
      created_at: daysAgo(90),
      passwordHash: hashPassword('AdminDemo!2026'),
    },
    {
      id: 'user-customer-1',
      email: 'customer@gizmohub.store',
      full_name: 'Marcus Vance',
      phone: '+14155550142',
      country: 'United States',
      city: 'New York',
      address: '420 Lexington Ave, Suite 14B',
      role: 'customer',
      created_at: daysAgo(30),
      passwordHash: hashPassword('CustomerDemo!2026'),
    },
  ],
  sessions: new Map(),
  idempotencyKeys: new Map(),
  newsletterSubscribers: new Set(),
  contactMessages: [],
};

function enrichProducts(): Product[] {
  const salesMap = new Map<string, number>();
  for (const order of state.orders) {
    if (order.order_status === 'cancelled') continue;
    for (const item of order.items) {
      salesMap.set(item.product_id, (salesMap.get(item.product_id) ?? 0) + item.quantity);
    }
  }
  const catMap = new Map(state.categories.map((c) => [c.id, c.name]));
  return state.products.map((p) => ({
    ...p,
    category_name: p.category_id ? catMap.get(p.category_id) ?? 'Accessories' : 'Accessories',
    units_sold: salesMap.get(p.id) ?? 0,
  }));
}

export const fallbackStore = {
  getStoreSettings(): StoreSettings {
    return { ...state.storeSettings };
  },

  updateStoreSettings(patch: Partial<StoreSettings>): StoreSettings {
    state.storeSettings = {
      ...state.storeSettings,
      ...patch,
      cod_enabled: true,
    };
    return { ...state.storeSettings };
  },

  getCategories(includeInactive = false): Category[] {
    return state.categories
      .filter((c) => includeInactive || c.is_active)
      .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));
  },

  getProducts(includeInactive = false): Product[] {
    return enrichProducts()
      .filter((p) => includeInactive || p.is_active)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getProductByIdOrSlug(idOrSlug: string): Product | null {
    return enrichProducts().find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
  },

  getDeliveryZones(includeInactive = false): DeliveryZone[] {
    return state.deliveryZones.filter((z) => includeInactive || z.is_active);
  },

  findMatchingDeliveryZone(country: string, city?: string): DeliveryZone | null {
    const normCountry = country.trim().toLowerCase();
    const normCity = (city ?? '').trim().toLowerCase();
    const active = state.deliveryZones.filter((z) => z.is_active);
    if (normCity) {
      const exact = active.find(
        (z) =>
          z.country.toLowerCase() === normCountry &&
          (z.city ?? '').toLowerCase() === normCity
      );
      if (exact) return exact;
    }
    return (
      active.find(
        (z) =>
          z.country.toLowerCase() === normCountry &&
          (!z.city || z.city.trim() === '' || z.city.toLowerCase() === normCity)
      ) ?? active.find((z) => z.country.toLowerCase() === normCountry) ?? null
    );
  },

  createCodOrder(input: {
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
  }): { order: Order; duplicate: boolean } {
    if (input.idempotencyKey && state.idempotencyKeys.has(input.idempotencyKey)) {
      return { order: state.idempotencyKeys.get(input.idempotencyKey)!, duplicate: true };
    }

    const zone = input.deliveryZoneId
      ? state.deliveryZones.find((z) => z.id === input.deliveryZoneId && z.is_active)
      : this.findMatchingDeliveryZone(input.country, input.city);

    if (!zone) {
      throw new Error('Delivery is not currently available for the selected location.');
    }

    if (!input.items.length) {
      throw new Error('Your cart is empty.');
    }

    // Aggregate quantities per product before atomic validation
    const qtyByProduct = new Map<string, number>();
    for (const row of input.items) {
      const q = Math.floor(row.quantity);
      if (q <= 0) throw new Error('Invalid item quantity.');
      qtyByProduct.set(row.product_id, (qtyByProduct.get(row.product_id) ?? 0) + q);
    }

    const resolvedProducts: Array<{ product: Product; quantity: number; unitPrice: number }> = [];
    for (const [productId, qty] of qtyByProduct.entries()) {
      const prod = state.products.find((p) => p.id === productId && p.is_active);
      if (!prod) {
        throw new Error('One or more selected products are no longer available.');
      }
      if (prod.stock_quantity < qty) {
        throw new Error(
          `Insufficient stock for ${prod.name}. Only ${prod.stock_quantity} available.`
        );
      }
      const unitPrice =
        prod.discount_price !== null && prod.discount_price > 0 && prod.discount_price < prod.price
          ? prod.discount_price
          : prod.price;
      resolvedProducts.push({ product: prod, quantity: qty, unitPrice });
    }

    // Atomic deduction after all checks succeed
    const orderId = `ord-${crypto.randomUUID().slice(0, 8)}`;
    const orderNumber = `GH-2026-${1044 + state.orders.length}`;
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const entry of resolvedProducts) {
      const prev = entry.product.stock_quantity;
      const next = prev - entry.quantity;
      entry.product.stock_quantity = next;
      const lineTotal = Number((entry.unitPrice * entry.quantity).toFixed(2));
      subtotal += lineTotal;

      orderItems.push({
        id: `oi-${crypto.randomUUID().slice(0, 8)}`,
        order_id: orderId,
        product_id: entry.product.id,
        product_name: entry.product.name,
        product_brand: entry.product.brand,
        product_image: entry.product.image_url,
        quantity: entry.quantity,
        unit_price: entry.unitPrice,
        total_price: lineTotal,
      });

      state.inventoryMovements.unshift({
        id: `mov-${crypto.randomUUID().slice(0, 8)}`,
        product_id: entry.product.id,
        product_name: entry.product.name,
        change_quantity: -entry.quantity,
        previous_quantity: prev,
        new_quantity: next,
        movement_type: 'order_deduction',
        reason: `COD Order ${orderNumber}`,
        reference_id: orderId,
        created_by: input.userId ?? 'guest',
        created_at: new Date().toISOString(),
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    const freeThreshold =
      zone.free_shipping_threshold ?? state.storeSettings.free_shipping_threshold;
    const deliveryFee =
      freeThreshold !== null && subtotal >= freeThreshold ? 0 : Number(zone.delivery_fee.toFixed(2));
    const totalAmount = Number((subtotal + deliveryFee).toFixed(2));

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
      items: orderItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    state.orders.unshift(order);
    if (input.idempotencyKey) {
      state.idempotencyKeys.set(input.idempotencyKey, order);
    }
    return { order, duplicate: false };
  },

  trackOrder(orderNumber: string, phone: string): Order | null {
    const normOrder = orderNumber.trim().toUpperCase();
    const normPhone = phone.replace(/[^0-9+]/g, '');
    const order = state.orders.find((o) => o.order_number.toUpperCase() === normOrder);
    if (!order) return null;
    const orderPhone = order.customer_phone.replace(/[^0-9+]/g, '');
    if (orderPhone !== normPhone && !orderPhone.endsWith(normPhone.slice(-7))) {
      return null;
    }
    if (normPhone.length < 7) return null;
    return order;
  },

  // Auth helpers
  registerCustomer(input: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    country?: string;
    city?: string;
    address?: string;
  }): { user: CustomerProfile; token: string } {
    const email = input.email.trim().toLowerCase();
    if (state.users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('An account with this email already exists.');
    }
    const newUser: FallbackUserRecord = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      email,
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      country: input.country?.trim() || 'United States',
      city: input.city?.trim() || 'New York',
      address: input.address?.trim() || '',
      role: 'customer', // Never allow public admin registration
      created_at: new Date().toISOString(),
      passwordHash: hashPassword(input.password),
    };
    state.users.push(newUser);
    const token = crypto.randomBytes(24).toString('hex');
    state.sessions.set(token, newUser.id);
    const { passwordHash: _pw, ...safeUser } = newUser;
    return { user: safeUser, token };
  },

  login(email: string, password: string): { user: CustomerProfile; token: string } {
    const cleanEmail = email.trim().toLowerCase();
    const record = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!record || record.passwordHash !== hashPassword(password)) {
      throw new Error('Invalid email or password.');
    }
    const token = crypto.randomBytes(24).toString('hex');
    state.sessions.set(token, record.id);
    const { passwordHash: _pw, ...safeUser } = record;
    return { user: safeUser, token };
  },

  getUserByToken(token: string | undefined): CustomerProfile | null {
    if (!token) return null;
    const userId = state.sessions.get(token);
    if (!userId) return null;
    const record = state.users.find((u) => u.id === userId);
    if (!record) return null;
    const { passwordHash: _pw, ...safeUser } = record;
    return safeUser;
  },

  logout(token: string | undefined) {
    if (token) state.sessions.delete(token);
  },

  updateCustomerProfile(
    userId: string,
    patch: Partial<Pick<CustomerProfile, 'full_name' | 'phone' | 'country' | 'city' | 'address'>>
  ): CustomerProfile {
    const record = state.users.find((u) => u.id === userId);
    if (!record) throw new Error('Account not found.');
    if (patch.full_name !== undefined) record.full_name = patch.full_name.trim();
    if (patch.phone !== undefined) record.phone = patch.phone.trim();
    if (patch.country !== undefined) record.country = patch.country.trim();
    if (patch.city !== undefined) record.city = patch.city.trim();
    if (patch.address !== undefined) record.address = patch.address.trim();
    const { passwordHash: _pw, ...safeUser } = record;
    return safeUser;
  },

  getCustomerOrders(userId: string): Order[] {
    return state.orders.filter((o) => o.user_id === userId);
  },

  // Admin Operations
  getAdminOverview(): AdminOverviewMetrics {
    const orders = state.orders;
    const products = state.products;
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.order_status === 'pending').length,
      confirmedOrders: orders.filter((o) => o.order_status === 'confirmed').length,
      deliveredOrders: orders.filter((o) => o.order_status === 'delivered').length,
      totalProducts: products.length,
      lowStockProducts: products.filter((p) => p.is_active && p.stock_quantity <= p.low_stock_threshold).length,
      paidSalesRevenue: orders
        .filter((o) => o.payment_status === 'paid')
        .reduce((acc, o) => acc + o.total_amount, 0),
      unpaidCodPendingValue: orders
        .filter((o) => o.payment_status === 'unpaid' && o.order_status !== 'cancelled')
        .reduce((acc, o) => acc + o.total_amount, 0),
    };
  },

  getAllOrders(): Order[] {
    return [...state.orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  updateOrder(
    orderId: string,
    patch: { order_status?: OrderStatus; payment_status?: PaymentStatus },
    adminEmail: string
  ): Order {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found.');

    const prevStatus = order.order_status;
    if (patch.order_status) {
      // Restore stock if cancelling an active order
      if (patch.order_status === 'cancelled' && prevStatus !== 'cancelled') {
        for (const item of order.items) {
          const prod = state.products.find((p) => p.id === item.product_id);
          if (prod) {
            const prevQty = prod.stock_quantity;
            prod.stock_quantity += item.quantity;
            state.inventoryMovements.unshift({
              id: `mov-${crypto.randomUUID().slice(0, 8)}`,
              product_id: prod.id,
              product_name: prod.name,
              change_quantity: item.quantity,
              previous_quantity: prevQty,
              new_quantity: prod.stock_quantity,
              movement_type: 'order_cancelled_restore',
              reason: `Restored from cancelled order ${order.order_number}`,
              reference_id: order.id,
              created_by: adminEmail,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
      order.order_status = patch.order_status;
    }

    if (patch.payment_status) {
      if (patch.payment_status === 'paid' && order.order_status !== 'delivered') {
        throw new Error('COD orders can only be marked as paid after delivery.');
      }
      order.payment_status = patch.payment_status;
    }

    order.updated_at = new Date().toISOString();
    return order;
  },

  upsertProduct(
    input: Partial<Product> & { id?: string },
    adminEmail: string
  ): Product {
    if (input.id) {
      const existing = state.products.find((p) => p.id === input.id);
      if (!existing) throw new Error('Product not found.');
      const prevStock = existing.stock_quantity;
      Object.assign(existing, {
        ...input,
        price: input.price !== undefined ? Number(input.price) : existing.price,
        discount_price:
          input.discount_price === null || input.discount_price === undefined || Number(input.discount_price) <= 0
            ? null
            : Number(input.discount_price),
        stock_quantity:
          input.stock_quantity !== undefined ? Math.max(0, Math.floor(Number(input.stock_quantity))) : existing.stock_quantity,
      });
      if (existing.stock_quantity !== prevStock) {
        state.inventoryMovements.unshift({
          id: `mov-${crypto.randomUUID().slice(0, 8)}`,
          product_id: existing.id,
          product_name: existing.name,
          change_quantity: existing.stock_quantity - prevStock,
          previous_quantity: prevStock,
          new_quantity: existing.stock_quantity,
          movement_type: 'adjustment',
          reason: 'Updated via product editor',
          created_by: adminEmail,
          created_at: new Date().toISOString(),
        });
      }
      return enrichProducts().find((p) => p.id === existing.id)!;
    }

    const name = (input.name ?? '').trim();
    if (!name) throw new Error('Product name is required.');
    const id = `prod-${crypto.randomUUID().slice(0, 8)}`;
    const slug =
      (input.slug ?? name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      id.slice(-4);
    const stockQty = Math.max(0, Math.floor(Number(input.stock_quantity ?? 0)));
    const created: Product = {
      id,
      name,
      slug,
      brand: (input.brand ?? 'GizmoHub').trim(),
      category_id: input.category_id ?? state.categories[0]?.id ?? null,
      description: (input.description ?? '').trim(),
      price: Number(input.price ?? 0),
      discount_price:
        input.discount_price && Number(input.discount_price) > 0
          ? Number(input.discount_price)
          : null,
      stock_quantity: stockQty,
      low_stock_threshold: Number(input.low_stock_threshold ?? 5),
      image_url: input.image_url ?? '/src/assets/images/prod_earbuds_wireless_1794799614673.jpg',
      specifications: input.specifications ?? {},
      is_active: input.is_active ?? true,
      is_featured: input.is_featured ?? true,
      created_at: new Date().toISOString(),
    };
    state.products.unshift(created);
    if (stockQty > 0) {
      state.inventoryMovements.unshift({
        id: `mov-${crypto.randomUUID().slice(0, 8)}`,
        product_id: created.id,
        product_name: created.name,
        change_quantity: stockQty,
        previous_quantity: 0,
        new_quantity: stockQty,
        movement_type: 'restock',
        reason: 'Initial product creation',
        created_by: adminEmail,
        created_at: new Date().toISOString(),
      });
    }
    return enrichProducts().find((p) => p.id === created.id)!;
  },

  deleteOrDeactivateProduct(productId: string, hardDelete = false) {
    const idx = state.products.findIndex((p) => p.id === productId);
    if (idx === -1) throw new Error('Product not found.');
    if (hardDelete) {
      state.products.splice(idx, 1);
    } else {
      state.products[idx].is_active = false;
    }
  },

  upsertCategory(input: Partial<Category> & { id?: string }): Category {
    if (input.id) {
      const existing = state.categories.find((c) => c.id === input.id);
      if (!existing) throw new Error('Category not found.');
      Object.assign(existing, input);
      return existing;
    }
    const name = (input.name ?? '').trim();
    if (!name) throw new Error('Category name is required.');
    const created: Category = {
      id: `cat-${crypto.randomUUID().slice(0, 8)}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: input.description ?? null,
      image_url: input.image_url ?? '/src/assets/images/cat_audio_devices_1794799613236.jpg',
      is_active: input.is_active ?? true,
      display_order: state.categories.length + 1,
      created_at: new Date().toISOString(),
    };
    state.categories.push(created);
    return created;
  },

  adjustInventory(
    input: { product_id: string; delta: number; movement_type: 'restock' | 'adjustment'; reason: string },
    adminEmail: string
  ): { product: Product; movement: InventoryMovement } {
    const prod = state.products.find((p) => p.id === input.product_id);
    if (!prod) throw new Error('Product not found.');
    const prev = prod.stock_quantity;
    const next = prev + Math.trunc(input.delta);
    if (next < 0) {
      throw new Error('Stock quantity cannot become negative.');
    }
    prod.stock_quantity = next;
    const movement: InventoryMovement = {
      id: `mov-${crypto.randomUUID().slice(0, 8)}`,
      product_id: prod.id,
      product_name: prod.name,
      change_quantity: Math.trunc(input.delta),
      previous_quantity: prev,
      new_quantity: next,
      movement_type: input.movement_type,
      reason: input.reason.trim() || 'Manual stock adjustment',
      created_by: adminEmail,
      created_at: new Date().toISOString(),
    };
    state.inventoryMovements.unshift(movement);
    return { product: enrichProducts().find((p) => p.id === prod.id)!, movement };
  },

  getInventoryMovements(): InventoryMovement[] {
    return state.inventoryMovements;
  },

  upsertDeliveryZone(input: Partial<DeliveryZone> & { id?: string }): DeliveryZone {
    if (input.id) {
      const existing = state.deliveryZones.find((z) => z.id === input.id);
      if (!existing) throw new Error('Delivery zone not found.');
      Object.assign(existing, input);
      return existing;
    }
    const created: DeliveryZone = {
      id: `zone-${crypto.randomUUID().slice(0, 8)}`,
      name: input.name || `${input.country} Zone`,
      country: input.country || 'United States',
      city: input.city ?? null,
      delivery_fee: Number(input.delivery_fee ?? 10),
      free_shipping_threshold:
        input.free_shipping_threshold !== undefined && input.free_shipping_threshold !== null
          ? Number(input.free_shipping_threshold)
          : null,
      estimated_delivery_days: input.estimated_delivery_days || '2-3 business days',
      is_active: input.is_active ?? true,
    };
    state.deliveryZones.push(created);
    return created;
  },

  subscribeNewsletter(email: string) {
    state.newsletterSubscribers.add(email.trim().toLowerCase());
  },

  saveContactMessage(msg: { name: string; email: string; subject: string; message: string }) {
    state.contactMessages.push({
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      ...msg,
      created_at: new Date().toISOString(),
    });
  },
};
