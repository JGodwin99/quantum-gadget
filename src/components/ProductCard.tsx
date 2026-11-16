import React from 'react';
import { Check, ShoppingCart, XCircle } from 'lucide-react';
import { getEffectivePrice, useStore } from '../context/StoreContext';
import type { Product } from '../types/store';
import { StudioImage } from './StudioImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, addToCart } = useStore();
  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = effectivePrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - effectivePrice) / product.price) * 100)
    : 0;
  const outOfStock = product.stock_quantity <= 0;
  const lowStock = !outOfStock && product.stock_quantity <= product.low_stock_threshold;

  return (
    <article className="group bg-white border border-[#EAECF0] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#D0D5DD]">
      {/* Product Image */}
      <a
        href={`/product/${product.slug}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/product/${product.slug}`);
        }}
        className="relative aspect-[4/3] bg-[#F5F7FB] overflow-hidden block"
      >
        <StudioImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-[#050B18] text-white text-xs font-semibold px-2 py-1 rounded-md tabular-nums">
            -{discountPct}%
          </span>
        )}
      </a>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="text-xs font-medium uppercase tracking-wider text-[#667085] truncate">
          {product.brand}
          {product.category_name ? ` · ${product.category_name}` : ''}
        </div>

        <a
          href={`/product/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/product/${product.slug}`);
          }}
          className="mt-1.5 text-base font-semibold text-[#101828] hover:text-[#155EEF] transition-colors line-clamp-2 leading-snug"
        >
          {product.name}
        </a>

        <div className="mt-3 flex items-baseline gap-2.5">
          <span className="text-lg font-bold text-[#101828] tabular-nums">
            ${effectivePrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-[#667085] line-through tabular-nums">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
          {outOfStock ? (
            <>
              <XCircle className="w-3.5 h-3.5 text-[#D92D20] shrink-0" />
              <span className="text-[#B42318]">Out of Stock</span>
            </>
          ) : lowStock ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span className="text-[#B45309] tabular-nums">
                Low Stock · {product.stock_quantity} left
              </span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
              <span className="text-[#166534]">In Stock</span>
            </>
          )}
        </div>

        <div className="mt-auto pt-4">
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => addToCart(product, 1, true)}
            className="w-full h-11 px-4 rounded-lg bg-[#155EEF] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#2563EB] disabled:bg-[#EAECF0] disabled:text-[#98A2B3] disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>{outOfStock ? 'Unavailable' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
