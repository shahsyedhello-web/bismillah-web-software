import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ImageOff,
  Star,
  Heart,
  Eye,
  ShoppingBag,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { formatPrice, type CatalogProduct } from "@/lib/catalog";
import { useShop } from "@/context/shop-context";
import { useSiteSettings } from "@/context/site-settings-context";

type ProductCardProps = {
  product: CatalogProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useShop();
  const { getWhatsappOrderLink } = useSiteSettings();
  const [imageFailed, setImageFailed] = useState(false);

  const inWishlist = isInWishlist(product.slug);
  const description =
    product.description?.trim() || "Fresh quality product supplied daily by Bismillah Milk Corner.";
  const priceLabel = product.price > 0 ? formatPrice(product.price) : "Rs. 0 (Rate + Tax)";
  const originalPriceLabel =
    product.originalPrice && product.originalPrice > product.price
      ? formatPrice(product.originalPrice)
      : null;

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const renderStockBadge = () => {
    switch (product.stockStatus) {
      case "in_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-white">
            <CheckCircle className="h-3 w-3" /> In Stock
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-white">
            <AlertTriangle className="h-3 w-3" /> Low Stock
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-white">
            <XCircle className="h-3 w-3" /> Out of Stock
          </span>
        );
      case "available_soon":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-white">
            <Clock className="h-3 w-3" /> Soon
          </span>
        );
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card/90 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/60">
        {product.image && !imageFailed ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-accent text-muted-foreground">
            <div className="flex flex-col items-center gap-2 text-center">
              <ImageOff className="h-8 w-8" aria-hidden="true" />
              <span className="text-xs font-medium">Bismillah Milk Corner</span>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1 items-start z-10">
          {product.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              <Star className="h-3 w-3 fill-current" /> Featured
            </span>
          )}
          {discountPercent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 z-10">{renderStockBadge()}</div>

        {/* Quick Action Overlay Buttons */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button
            onClick={() => toggleWishlist(product)}
            className={`p-2.5 rounded-full backdrop-blur-md shadow-md transition-transform active:scale-95 ${
              inWishlist
                ? "bg-rose-500 text-white"
                : "bg-background/90 text-foreground hover:bg-background"
            }`}
            title={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
            aria-label="Wishlist toggle"
          >
            <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={() => setQuickViewProduct(product)}
            className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-2 text-xs font-semibold text-foreground backdrop-blur-md shadow-md hover:bg-background transition-transform active:scale-95"
            aria-label="Quick view product details"
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
            Quick View
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
              {product.category} · {product.brand}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-foreground line-clamp-1">
              <Link
                to="/product/$slug"
                params={{ slug: product.slug }}
                className="hover:text-primary transition-colors"
              >
                {product.name}
              </Link>
            </h3>
          </div>
        </div>

        {/* Rating */}
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <div className="flex items-center text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="font-semibold text-foreground text-xs">{product.rating}</span>
          <span className="text-muted-foreground text-[10px]">({product.reviewCount})</span>
        </div>

        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>

        {/* Price & Unit */}
        <div className="mt-4 pt-3 border-t border-border/60">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
            Price (Rate + Tax)
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <p className="font-display text-lg font-bold text-primary">{priceLabel}</p>
            {originalPriceLabel && (
              <p className="text-xs text-muted-foreground line-through font-medium">
                {originalPriceLabel}
              </p>
            )}
            <span className="text-[11px] text-muted-foreground font-medium">/ {product.unit}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => addToCart(product, 1)}
            disabled={product.stockStatus === "out_of_stock"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="h-4 w-4" />
            {product.stockStatus === "out_of_stock" ? "Out of Stock" : "Add to Cart"}
          </button>

          <a
            href={getWhatsappOrderLink(product.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Order via WhatsApp
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
