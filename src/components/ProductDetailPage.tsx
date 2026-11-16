import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  XCircle,
} from 'lucide-react';
import { getEffectivePrice, useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { StudioImage } from './StudioImage';

interface ProductDetailPageProps {
  slugOrId: string;
}

export function ProductDetailPage({ slugOrId }: ProductDetailPageProps) {
  const { products, addToCart, navigate, settings } = useStore();
  const [quantity, setQuantity] = useState(1);

  const product = useMemo(
    () => products.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null,
    [products, slugOrId]
  );

  useEffect(() => {
    setQuantity(1);
  }, [slugOrId]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && p.category_id === product.category_id)
      .slice(0, 4);
  }, [product, products]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#101828]">Product Not Found</h1>
        <p className="mt-2 text-sm text-[#667085]">
          This item may have been removed or is currently inactive.
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="mt-6 h-11 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = effectivePrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - effectivePrice) / product.price) * 100)
    : 0;
  const outOfStock = product.stock_quantity <= 0;
  const maxQty = Math.max(1, product.stock_quantity);

  return (
    <div className="bg-white py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#475467] hover:text-[#101828]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shop</span>
        </button>

        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Gallery */}
          <div className="lg:col-span-7">
            <div className="aspect-[4/3] rounded-2xl bg-[#F5F7FB] border border-[#EAECF0] overflow-hidden">
              <StudioImage
                src={product.image_url}
                alt={product.name}
                loading="eager"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Purchase Details */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#155EEF]">
                {product.brand}
                {product.category_name ? ` · ${product.category_name}` : ''}
              </p>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#101828] tracking-tight">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#101828] tabular-nums">
                ${effectivePrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-[#667085] line-through tabular-nums">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="bg-[#050B18] text-white text-xs font-semibold px-2 py-1 rounded-md tabular-nums">
                    Save {discountPct}%
                  </span>
                </>
              )}
              <span className="text-xs font-medium text-[#667085]">USD</span>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 text-sm font-medium">
              {outOfStock ? (
                <>
                  <XCircle className="w-4 h-4 text-[#D92D20]" />
                  <span className="text-[#B42318]">Currently Out of Stock</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#15803D]" />
                  <span className="text-[#166534] tabular-nums">
                    In Stock · {product.stock_quantity} available
                  </span>
                </>
              )}
            </div>

            <p className="text-sm sm:text-base text-[#475467] leading-relaxed">
              {product.description}
            </p>

            {/* Quantity & Add to Cart */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center border border-[#D0D5DD] rounded-lg h-12">
                  <button
                    type="button"
                    disabled={outOfStock || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-11 h-full flex items-center justify-center text-[#344054] hover:bg-[#F5F7FB] disabled:opacity-40 rounded-l-lg"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold tabular-nums text-[#101828]">
                    {outOfStock ? 0 : quantity}
                  </span>
                  <button
                    type="button"
                    disabled={outOfStock || quantity >= maxQty}
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="w-11 h-full flex items-center justify-center text-[#344054] hover:bg-[#F5F7FB] disabled:opacity-40 rounded-r-lg"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => addToCart(product, quantity, true)}
                  className="flex-1 h-12 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:bg-[#EAECF0] disabled:text-[#98A2B3] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{outOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>
              </div>
            </div>

            {/* COD Assurance */}
            <div className="rounded-xl bg-[#F5F7FB] border border-[#EAECF0] p-4 space-y-2.5 text-xs text-[#344054]">
              <div className="flex items-center gap-2.5 font-medium text-[#101828]">
                <Banknote className="w-4 h-4 text-[#155EEF] shrink-0" />
                <span>Cash on Delivery — Pay in cash when your order arrives</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#155EEF] shrink-0" />
                <span>
                  {settings.free_shipping_threshold
                    ? `Free delivery on orders over $${settings.free_shipping_threshold} in qualifying zones`
                    : 'Delivery fees calculated by active delivery zone at checkout'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#155EEF] shrink-0" />
                <span>1-year hardware warranty & hassle-free return support</span>
              </div>
            </div>

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="pt-4 border-t border-[#EAECF0]">
                <h2 className="text-sm font-semibold text-[#101828] mb-3">
                  Technical Specifications
                </h2>
                <dl className="divide-y divide-[#EAECF0] border border-[#EAECF0] rounded-xl overflow-hidden">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div
                      key={key}
                      className="px-4 py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm bg-white"
                    >
                      <dt className="font-medium text-[#667085]">{key}</dt>
                      <dd className="font-medium text-[#101828] text-right">{val}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-12 border-t border-[#EAECF0]">
            <h2 className="font-display text-2xl font-bold text-[#101828] mb-6">
              Related Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
