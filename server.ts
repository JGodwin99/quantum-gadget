import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { fallbackStore } from './server/fallbackStore.ts';
import { SupabaseStore } from './server/supabaseStore.ts';
import type { CustomerProfile, SupabaseSchemaInfo } from './src/types/store.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseStore =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? new SupabaseStore(SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY)
    : null;

const supabasePublicAuthClient =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

interface AuthedRequest extends Request {
  authUser?: CustomerProfile | null;
}

function extractBearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

async function resolveOptionalUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) {
    req.authUser = null;
    return next();
  }
  try {
    if (supabaseStore) {
      req.authUser = await supabaseStore.verifyUserFromToken(token);
    } else if (supabasePublicAuthClient) {
      // Fallback-safe verification using publishable client if secret key is not yet set
      const { data } = await supabasePublicAuthClient.auth.getUser(token);
      if (data.user) {
        req.authUser = {
          id: data.user.id,
          email: data.user.email ?? '',
          full_name: (data.user.user_metadata?.full_name as string) ?? '',
          phone: (data.user.user_metadata?.phone as string) ?? '',
          country: '',
          city: '',
          address: '',
          role: 'customer',
          created_at: data.user.created_at,
        };
      } else {
        req.authUser = fallbackStore.getUserByToken(token);
      }
    } else {
      req.authUser = fallbackStore.getUserByToken(token);
    }
  } catch {
    req.authUser = null;
  }
  next();
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  await resolveOptionalUser(req, res, () => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    next();
  });
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  await resolveOptionalUser(req, res, () => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Administrator sign-in required.' });
    }
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: authorized administrator access only.' });
    }
    next();
  });
}

const createOrderSchema = z.object({
  idempotency_key: z.string().min(8).max(120).optional(),
  customer_name: z.string().trim().min(2, 'Full name is required').max(120),
  customer_phone: z.string().trim().min(7, 'Valid phone number is required').max(30),
  customer_email: z.string().trim().email('Valid email address required').optional().or(z.literal('')),
  country: z.string().trim().min(2, 'Country is required').max(80),
  city: z.string().trim().min(2, 'City is required').max(80),
  delivery_address: z.string().trim().min(5, 'Full delivery address is required').max(300),
  delivery_instructions: z.string().trim().max(400).optional().or(z.literal('')),
  delivery_zone_id: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, 'Cart cannot be empty'),
});

const trackOrderSchema = z.object({
  order_number: z.string().trim().min(3, 'Order number is required').max(64),
  phone: z.string().trim().min(7, 'Phone number is required').max(30),
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  // Public client configuration (never exposes SUPABASE_SECRET_KEY)
  app.get('/api/config', (_req, res) => {
    res.json({
      mode: supabaseStore ? 'supabase' : 'local_preview',
      authMode: supabasePublicAuthClient ? 'supabase' : 'local_preview',
      supabaseUrl: SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY ? SUPABASE_URL : null,
      supabasePublishableKey:
        SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY ? SUPABASE_PUBLISHABLE_KEY : null,
    });
  });

  // Public Storefront Catalog
  app.get('/api/storefront', async (_req, res) => {
    try {
      if (supabaseStore) {
        const [settings, categories, products, deliveryZones] = await Promise.all([
          supabaseStore.getStoreSettings(),
          supabaseStore.getCategories(false),
          supabaseStore.getProducts(false),
          supabaseStore.getDeliveryZones(false),
        ]);
        return res.json({ settings, categories, products, deliveryZones, mode: 'supabase' });
      }
      return res.json({
        settings: fallbackStore.getStoreSettings(),
        categories: fallbackStore.getCategories(false),
        products: fallbackStore.getProducts(false),
        deliveryZones: fallbackStore.getDeliveryZones(false),
        mode: 'local_preview',
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load catalog.' });
    }
  });

  // Authoritative Server COD Order Placement
  app.post('/api/orders', resolveOptionalUser, async (req: AuthedRequest, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid order information.',
      });
    }
    const payload = parsed.data;
    try {
      const orderInput = {
        idempotencyKey: payload.idempotency_key,
        userId: req.authUser?.id ?? null,
        customerName: payload.customer_name,
        customerPhone: payload.customer_phone,
        customerEmail: payload.customer_email || null,
        country: payload.country,
        city: payload.city,
        deliveryAddress: payload.delivery_address,
        deliveryInstructions: payload.delivery_instructions || null,
        deliveryZoneId: payload.delivery_zone_id,
        items: payload.items,
      };

      const result = supabaseStore
        ? await supabaseStore.createCodOrder(orderInput)
        : fallbackStore.createCodOrder(orderInput);

      return res.status(result.duplicate ? 200 : 201).json(result);
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : 'Could not place order.',
      });
    }
  });

  // Verified Order Tracking (requires both Order Number + Phone Number)
  app.post('/api/orders/track', async (req, res) => {
    const parsed = trackOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
    }
    try {
      const order = supabaseStore
        ? await supabaseStore.trackOrder(parsed.data.order_number, parsed.data.phone)
        : fallbackStore.trackOrder(parsed.data.order_number, parsed.data.phone);

      if (!order) {
        return res.status(404).json({
          error: 'No order matched that order number and phone number.',
        });
      }
      return res.json({ order });
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Tracking lookup failed.' });
    }
  });

  // Newsletter & Contact
  app.post('/api/newsletter', (req, res) => {
    const parsed = z.object({ email: z.string().trim().email() }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    fallbackStore.subscribeNewsletter(parsed.data.email);
    res.json({ ok: true, message: 'Subscribed to GizmoHub updates.' });
  });

  app.post('/api/contact', (req, res) => {
    const parsed = z
      .object({
        name: z.string().trim().min(2),
        email: z.string().trim().email(),
        subject: z.string().trim().min(2),
        message: z.string().trim().min(8),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please complete all contact fields.' });
    }
    fallbackStore.saveContactMessage(parsed.data);
    res.json({ ok: true, message: 'Thank you. Our support team will reply within 1 business day.' });
  });

  // Fallback-Mode Auth Endpoints (when Supabase is not configured yet)
  app.post('/api/auth/register', (req, res) => {
    if (supabaseStore) {
      return res.status(400).json({ error: 'Use Supabase client authentication.' });
    }
    const parsed = z
      .object({
        email: z.string().trim().email(),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        full_name: z.string().trim().min(2),
        phone: z.string().trim().min(7),
        country: z.string().optional(),
        city: z.string().optional(),
        address: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid registration data.' });
    }
    try {
      const result = fallbackStore.registerCustomer(parsed.data);
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed.' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    if (supabaseStore) {
      return res.status(400).json({ error: 'Use Supabase client authentication.' });
    }
    const parsed = z
      .object({ email: z.string().trim().email(), password: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
      const result = fallbackStore.login(parsed.data.email, parsed.data.password);
      return res.json(result);
    } catch (err) {
      return res.status(401).json({ error: err instanceof Error ? err.message : 'Sign-in failed.' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    if (!supabaseStore) {
      fallbackStore.logout(extractBearer(req));
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: req.authUser });
  });

  app.patch('/api/customer/profile', requireAuth, async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        full_name: z.string().trim().min(2).optional(),
        phone: z.string().trim().min(7).optional(),
        country: z.string().trim().optional(),
        city: z.string().trim().optional(),
        address: z.string().trim().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid profile fields.' });
    }
    try {
      const user = supabaseStore
        ? await supabaseStore.updateCustomerProfile(
            req.authUser!.id,
            req.authUser!.email,
            parsed.data
          )
        : fallbackStore.updateCustomerProfile(req.authUser!.id, parsed.data);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update profile.' });
    }
  });

  app.get('/api/customer/orders', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const orders = supabaseStore
        ? await supabaseStore.getCustomerOrders(req.authUser!.id)
        : fallbackStore.getCustomerOrders(req.authUser!.id);
      res.json({ orders });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load orders.' });
    }
  });

  // Administrator Routes (strictly authorized via admins table / role === 'admin')
  app.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
    try {
      if (supabaseStore) {
        const [overview, orders, products, categories, zones, movements, settings, schema] =
          await Promise.all([
            supabaseStore.getAdminOverview(),
            supabaseStore.getAllOrders(),
            supabaseStore.getProducts(true),
            supabaseStore.getCategories(true),
            supabaseStore.getDeliveryZones(true),
            supabaseStore.getInventoryMovements(),
            supabaseStore.getStoreSettings(),
            supabaseStore.inspectSchema(),
          ]);
        return res.json({ overview, orders, products, categories, zones, movements, settings, schema });
      }

      const localSchema: SupabaseSchemaInfo = {
        mode: 'local_preview',
        connected: false,
        urlConfigured: Boolean(SUPABASE_URL),
        publishableKeyConfigured: Boolean(SUPABASE_PUBLISHABLE_KEY),
        secretKeyConfigured: Boolean(SUPABASE_SECRET_KEY),
        tablesDetected: {},
        notes: [
          'Running in temporary local preview mode because NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are not yet configured.',
        ],
      };
      return res.json({
        overview: fallbackStore.getAdminOverview(),
        orders: fallbackStore.getAllOrders(),
        products: fallbackStore.getProducts(true),
        categories: fallbackStore.getCategories(true),
        zones: fallbackStore.getDeliveryZones(true),
        movements: fallbackStore.getInventoryMovements(),
        settings: fallbackStore.getStoreSettings(),
        schema: localSchema,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load admin data.' });
    }
  });

  app.patch('/api/admin/orders/:id', requireAdmin, async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        order_status: z
          .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
          .optional(),
        payment_status: z.enum(['unpaid', 'paid', 'refunded']).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid order update payload.' });
    }
    try {
      const order = supabaseStore
        ? await supabaseStore.updateOrder(req.params.id, parsed.data, req.authUser!.email)
        : fallbackStore.updateOrder(req.params.id, parsed.data, req.authUser!.email);
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update order.' });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const product = supabaseStore
        ? await supabaseStore.upsertProduct(req.body, req.authUser!.email)
        : fallbackStore.upsertProduct(req.body, req.authUser!.email);
      res.json({ product });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save product.' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const hard = req.query.hard === 'true';
      if (supabaseStore) {
        await supabaseStore.deleteOrDeactivateProduct(req.params.id, hard);
      } else {
        fallbackStore.deleteOrDeactivateProduct(req.params.id, hard);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update product.' });
    }
  });

  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    try {
      const category = supabaseStore
        ? await supabaseStore.upsertCategory(req.body)
        : fallbackStore.upsertCategory(req.body);
      res.json({ category });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save category.' });
    }
  });

  app.post('/api/admin/inventory/adjust', requireAdmin, async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        product_id: z.string().min(1),
        delta: z.number().int().refine((n) => n !== 0, 'Adjustment cannot be zero'),
        movement_type: z.enum(['restock', 'adjustment']),
        reason: z.string().trim().min(2),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid adjustment.' });
    }
    try {
      const result = supabaseStore
        ? await supabaseStore.adjustInventory(parsed.data, req.authUser!.email)
        : fallbackStore.adjustInventory(parsed.data, req.authUser!.email);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Stock adjustment failed.' });
    }
  });

  app.post('/api/admin/delivery-zones', requireAdmin, async (req, res) => {
    try {
      const zone = supabaseStore
        ? await supabaseStore.upsertDeliveryZone(req.body)
        : fallbackStore.upsertDeliveryZone(req.body);
      res.json({ zone });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save zone.' });
    }
  });

  app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const settings = supabaseStore
        ? await supabaseStore.updateStoreSettings(req.body)
        : fallbackStore.updateStoreSettings(req.body);
      res.json({ settings });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update settings.' });
    }
  });

  app.post('/api/admin/upload', requireAdmin, async (req, res) => {
    const parsed = z
      .object({
        fileName: z.string().min(1),
        base64Data: z.string().min(1),
        contentType: z.string().min(1),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid upload payload.' });
    }
    try {
      if (supabaseStore) {
        const url = await supabaseStore.uploadProductImage(
          parsed.data.fileName,
          parsed.data.base64Data,
          parsed.data.contentType
        );
        return res.json({ url });
      }
      // Fallback: return data URL so preview image upload works immediately
      const dataUrl = `data:${parsed.data.contentType};base64,${parsed.data.base64Data}`;
      return res.json({ url: dataUrl });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed.' });
    }
  });

  // Vite Dev Middleware vs Static Production Build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GizmoHub server running on http://localhost:${PORT}`);
  });
}

startServer();
