import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { getEffectivePrice, useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';

interface ShopPageProps {
  presetMode?: 'all' | 'new-arrivals' | 'top-deals';
}

const PAGE_SIZE = 8;

export function ShopPage({ presetMode = 'all' }: ShopPageProps) {
  const { products, categories, loadingCatalog, route } = useStore();

  const initialParams = useMemo(() => {
    const query = route.includes('?') ? route.split('?')[1] : '';
    return new URLSearchParams(query);
  }, [route]);

  const [search, setSearch] = useState(() => initialParams.get('q') ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => initialParams.get('category') ?? 'all'
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(
    () => initialParams.get('brand') ?? 'all'
  );
  const [priceRange, setPriceRange] = useState<'all' | 'under-150' | '150-300' | 'over-300'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = initialParams.get('q');
    const cat = initialParams.get('category');
    const br = initialParams.get('brand');
    if (q !== null) setSearch(q);
    if (cat !== null) setSelectedCategory(cat);
    if (br !== null) setSelectedBrand(br);
    setPage(1);
  }, [initialParams]);

  const brands = useMemo(() => {
    const set = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (presetMode === 'top-deals') {
        if (!(p.discount_price !== null && p.discount_price > 0 && p.discount_price < p.price)) {
          return false;
        }
      }
      if (q) {
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.category_name ?? '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (selectedCategory !== 'all') {
        const catObj = categories.find(
          (c) => c.slug === selectedCategory || c.id === selectedCategory
        );
        if (catObj && p.category_id !== catObj.id) return false;
        if (!catObj && p.category_id !== selectedCategory) return false;
      }
      if (selectedBrand !== 'all' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }
      const price = getEffectivePrice(p);
      if (priceRange === 'under-150' && price >= 150) return false;
      if (priceRange === '150-300' && (price < 150 || price > 300)) return false;
      if (priceRange === 'over-300' && price <= 300) return false;
      return true;
    });

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [products, presetMode, search, selectedCategory, selectedBrand, priceRange, sortBy, categories]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProducts, page]
  );

  const pageTitle =
    presetMode === 'new-arrivals'
      ? 'New Arrivals'
      : presetMode === 'top-deals'
      ? 'Top Deals'
      : 'Shop All Gadgets';

  const pageSubtitle =
    presetMode === 'new-arrivals'
      ? 'The latest smart devices, audio hardware, and accessories in stock.'
      : presetMode === 'top-deals'
      ? 'Current price reductions across our Cash on Delivery catalog.'
      : 'Browse our complete electronics catalog with verified stock and Cash on Delivery.';

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setPriceRange('all');
    setSortBy('newest');
    setPage(1);
  };

  return (
    <div className="bg-[#F5F7FB] min-h-[75vh] py-10 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#101828] tracking-tight">
            {pageTitle}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#667085]">{pageSubtitle}</p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="bg-white border border-[#EAECF0] rounded-xl p-4 sm:p-5 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by product name or brand..."
                aria-label="Search products"
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] placeholder:text-[#667085] focus:outline-none focus:border-[#155EEF]"
              />
            </div>

            {/* Brand */}
            <div className="md:col-span-2">
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by brand"
                className="w-full h-11 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm text-[#101828] focus:outline-none focus:border-[#155EEF]"
              >
                <option value="all">All Brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="md:col-span-2">
              <select
                value={priceRange}
                onChange={(e) => {
                  setPriceRange(e.target.value as typeof priceRange);
                  setPage(1);
                }}
                aria-label="Filter by price range"
                className="w-full h-11 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm text-[#101828] focus:outline-none focus:border-[#155EEF]"
              >
                <option value="all">All Prices</option>
                <option value="under-150">Under $150</option>
                <option value="150-300">$150 – $300</option>
                <option value="over-300">$300+</option>
              </select>
            </div>

            {/* Sort */}
            <div className="md:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as typeof sortBy);
                  setPage(1);
                }}
                aria-label="Sort products"
                className="w-full h-11 px-3 rounded-lg border border-[#D0D5DD] bg-white text-sm text-[#101828] focus:outline-none focus:border-[#155EEF]"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAECF0]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] mr-2">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Category:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-[#050B18] text-white'
                    : 'bg-[#F5F7FB] text-[#344054] hover:bg-[#EAECF0]'
                }`}
              >
                All
              </button>
              {categories.map((cat) => {
                const active = selectedCategory === cat.slug || selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.slug);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#050B18] text-white'
                        : 'bg-[#F5F7FB] text-[#344054] hover:bg-[#EAECF0]'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#667085] tabular-nums">
              <span>{filteredProducts.length} products</span>
              {(search || selectedCategory !== 'all' || selectedBrand !== 'all' || priceRange !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-[#155EEF] font-semibold hover:underline"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        {loadingCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-96 rounded-xl bg-white border border-[#EAECF0] animate-pulse" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="bg-white border border-[#EAECF0] rounded-xl p-12 text-center">
            <p className="text-base font-semibold text-[#101828]">No matching products found</p>
            <p className="mt-1 text-sm text-[#667085]">
              Try adjusting your search query, category filter, or price range.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 h-10 px-5 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginated.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-10 px-3.5 rounded-lg border border-[#D0D5DD] bg-white text-sm font-medium text-[#344054] hover:bg-[#F5F7FB] disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <span className="px-4 text-sm font-medium text-[#475467] tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-10 px-3.5 rounded-lg border border-[#D0D5DD] bg-white text-sm font-medium text-[#344054] hover:bg-[#F5F7FB] disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
