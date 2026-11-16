import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Headphones,
  RotateCcw,
  Truck,
} from 'lucide-react';
import { getEffectivePrice, useStore } from '../context/StoreContext';
import { HERO_IMAGE, WORKSPACE_BANNER_IMAGE } from '../lib/imageRegistry';
import { ProductCard } from './ProductCard';
import { StudioImage } from './StudioImage';

export function HomePage() {
  const { categories, products, settings, deliveryZones, loadingCatalog, navigate } = useStore();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  const featuredCategories = useMemo(() => categories.slice(0, 4), [categories]);

  const topPicks = useMemo(() => {
    const featured = products.filter((p) => p.is_featured);
    return (featured.length >= 4 ? featured : products).slice(0, 4);
  }, [products]);

  const newArrivals = useMemo(
    () =>
      [...products]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3),
    [products]
  );

  const bestSellers = useMemo(
    () =>
      [...products]
        .filter((p) => (p.units_sold ?? 0) > 0)
        .sort((a, b) => (b.units_sold ?? 0) - (a.units_sold ?? 0))
        .slice(0, 3),
    [products]
  );

  // Qualifying free shipping threshold strictly derived from store_settings / delivery_zones
  const qualifyingThreshold = useMemo(() => {
    if (settings.free_shipping_threshold && settings.free_shipping_threshold > 0) {
      return settings.free_shipping_threshold;
    }
    const zoneThresholds = deliveryZones
      .filter((z) => z.is_active && z.free_shipping_threshold && z.free_shipping_threshold > 0)
      .map((z) => z.free_shipping_threshold as number);
    return zoneThresholds.length > 0 ? Math.min(...zoneThresholds) : null;
  }, [deliveryZones, settings.free_shipping_threshold]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail.trim())) {
      setNewsletterStatus('error');
      setNewsletterMsg('Please enter a valid email address.');
      return;
    }
    setNewsletterStatus('submitting');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Subscription failed.');
      setNewsletterStatus('success');
      setNewsletterMsg('You are subscribed to GizmoHub updates and new arrivals.');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterStatus('error');
      setNewsletterMsg(err instanceof Error ? err.message : 'Unable to subscribe.');
    }
  };

  return (
    <div>
      {/* A. Hero Section */}
      <section className="bg-[#050B18] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#60A5FA]">
                GizmoHub Retail · Cash on Delivery
              </p>
              <h1
                className="font-display font-bold text-white tracking-tight text-balance"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', lineHeight: 1.1 }}
              >
                Smart Tech. Better Everyday.
              </h1>
              <p className="text-base sm:text-lg text-[#D0D5DD] max-w-xl leading-relaxed">
                Discover innovative gadgets and accessories built for performance, convenience and style.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/shop')}
                  className="h-12 px-7 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Explore Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/track-order')}
                  className="h-12 px-6 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  Track Order
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0B1426] aspect-[16/10] lg:aspect-[16/11]">
                <img
                  src={HERO_IMAGE}
                  alt="Flagship smartphone, wireless ANC headphones, titanium smartwatch, and wireless earbuds on dark slate"
                  className="w-full h-full object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B. Store Benefits Strip */}
      <section className="bg-white border-b border-[#EAECF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] flex items-center justify-center text-[#155EEF] shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Free Shipping</h2>
                <p className="mt-0.5 text-xs text-[#667085] leading-relaxed">
                  {qualifyingThreshold
                    ? `On orders over $${qualifyingThreshold} in qualifying zones.`
                    : 'On qualifying orders within eligible delivery zones.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] flex items-center justify-center text-[#155EEF] shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Easy Returns</h2>
                <p className="mt-0.5 text-xs text-[#667085] leading-relaxed">
                  Hassle-free return support.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] flex items-center justify-center text-[#155EEF] shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Cash on Delivery</h2>
                <p className="mt-0.5 text-xs text-[#667085] leading-relaxed">
                  Pay when your order arrives.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] flex items-center justify-center text-[#155EEF] shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Customer Support</h2>
                <p className="mt-0.5 text-xs text-[#667085] leading-relaxed">
                  We're here to help.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* C. Product Categories */}
      <section className="py-14 lg:py-16 bg-[#F5F7FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#101828] tracking-tight">
                Shop by Category
              </h2>
              <p className="mt-1.5 text-sm text-[#667085]">
                Curated hardware across audio, wearables, power delivery, and creator gear.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="text-sm font-semibold text-[#155EEF] hover:text-[#2563EB] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>All Categories</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loadingCatalog ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-64 rounded-xl bg-white border border-[#EAECF0] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/shop?category=${encodeURIComponent(cat.slug)}`)}
                  className="group text-left bg-white border border-[#EAECF0] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#D0D5DD]"
                >
                  <div className="aspect-[4/3] bg-[#F5F7FB] overflow-hidden">
                    <StudioImage
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-[#101828] group-hover:text-[#155EEF] transition-colors truncate">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="mt-0.5 text-xs text-[#667085] line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#155EEF] shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* D. Top Picks / Featured Products */}
      <section className="py-14 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#101828] tracking-tight">
                Top Picks
              </h2>
              <p className="mt-1.5 text-sm text-[#667085]">
                Precision-engineered gadgets ready for Cash on Delivery dispatch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="text-sm font-semibold text-[#155EEF] hover:text-[#2563EB] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>View All Products</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loadingCatalog ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-96 rounded-xl bg-[#F5F7FB] border border-[#EAECF0] animate-pulse" />
              ))}
            </div>
          ) : topPicks.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-[#EAECF0] bg-[#F5F7FB]">
              <p className="text-sm text-[#667085]">No active products found in the catalog yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topPicks.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* E. Promotional Workspace Banner */}
      <section className="bg-white pb-14 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden bg-[#050B18] min-h-[340px] flex items-center">
            <img
              src={WORKSPACE_BANNER_IMAGE}
              alt="Modern minimalist technology workspace with monitor, mechanical keyboard, and USB-C dock"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050B18]/90 via-[#050B18]/65 to-[#050B18]/20" />
            <div className="relative z-10 p-8 sm:p-12 lg:p-16 max-w-xl space-y-4">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight text-balance">
                Boost Your Productivity
              </h2>
              <p className="text-base text-[#E4E7EC] leading-relaxed">
                Essential tech for work, study and entertainment.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/shop?category=power-solutions')}
                  className="h-11 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Shop Accessories</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* F. New Arrivals & Best Sellers */}
      <section className="py-14 lg:py-16 bg-[#F5F7FB] border-t border-[#EAECF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* New Arrivals */}
            <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 flex flex-col">
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#EAECF0]">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[#101828]">
                    New Arrivals
                  </h2>
                  <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
                    Latest hardware added to our inventory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/new-arrivals')}
                  className="text-xs sm:text-sm font-semibold text-[#155EEF] hover:text-[#2563EB] whitespace-nowrap shrink-0"
                >
                  See All
                </button>
              </div>

              <div className="divide-y divide-[#EAECF0] flex-1">
                {newArrivals.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/product/${p.slug}`)}
                    className="w-full py-4 flex items-center gap-4 text-left group hover:bg-[#F5F7FB]/60 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="w-20 h-16 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] overflow-hidden shrink-0">
                      <StudioImage src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wider text-[#667085]">{p.brand}</p>
                      <p className="text-sm font-semibold text-[#101828] group-hover:text-[#155EEF] truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-[#667085] mt-0.5">
                        {p.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#101828] tabular-nums shrink-0">
                      ${getEffectivePrice(p).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Best Sellers (Driven strictly by actual order_items volume) */}
            <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 flex flex-col">
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#EAECF0]">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[#101828]">
                    Best Sellers
                  </h2>
                  <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
                    Ranked strictly by verified customer orders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/shop')}
                  className="text-xs sm:text-sm font-semibold text-[#155EEF] hover:text-[#2563EB] whitespace-nowrap shrink-0"
                >
                  Browse Shop
                </button>
              </div>

              {bestSellers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm font-medium text-[#344054]">
                    No verified sales rankings yet
                  </p>
                  <p className="mt-1 text-xs text-[#667085] max-w-xs">
                    Best sellers appear here automatically once customer orders are placed.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#EAECF0] flex-1">
                  {bestSellers.map((p, index) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/product/${p.slug}`)}
                      className="w-full py-4 flex items-center gap-4 text-left group hover:bg-[#F5F7FB]/60 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <span className="w-6 text-xs font-mono font-semibold text-[#667085] tabular-nums shrink-0">
                        0{index + 1}
                      </span>
                      <div className="w-20 h-16 rounded-lg bg-[#F5F7FB] border border-[#EAECF0] overflow-hidden shrink-0">
                        <StudioImage src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wider text-[#667085]">{p.brand}</p>
                        <p className="text-sm font-semibold text-[#101828] group-hover:text-[#155EEF] truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-[#667085] mt-0.5 tabular-nums">
                          {p.units_sold} sold
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#101828] tabular-nums shrink-0">
                        ${getEffectivePrice(p).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* G. Newsletter Section */}
      <section className="py-14 lg:py-16 bg-white border-t border-[#EAECF0]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#101828] tracking-tight">
            Join Our Newsletter
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#667085]">
            Get the latest updates, offers and new arrivals.
          </p>

          <form
            onSubmit={handleNewsletterSubmit}
            className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              aria-label="Email address"
              className="flex-1 h-12 px-4 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] placeholder:text-[#667085] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
            />
            <button
              type="submit"
              disabled={newsletterStatus === 'submitting'}
              className="h-12 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              {newsletterStatus === 'submitting' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>

          {newsletterStatus === 'success' && (
            <p className="mt-3 text-sm font-medium text-[#166534] inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{newsletterMsg}</span>
            </p>
          )}
          {newsletterStatus === 'error' && (
            <p className="mt-3 text-sm font-medium text-[#B42318]">{newsletterMsg}</p>
          )}
        </div>
      </section>
    </div>
  );
}
