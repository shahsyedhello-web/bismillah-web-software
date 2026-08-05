import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/context/shop-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { catalogQueryOptions, formatPrice } from "@/lib/catalog";
import { Link } from "@tanstack/react-router";
import {
  X,
  Star,
  Heart,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductQuickView() {
  const { getWhatsappOrderLink } = useSiteSettings();
  const { quickViewProduct, setQuickViewProduct, addToCart, toggleWishlist, isInWishlist } =
    useShop();
  const { data: catalog } = useQuery(catalogQueryOptions);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const inWishlist = isInWishlist(product.slug);
  const images =
    product.images && product.images.length > 0 ? product.images : [product.image || ""];

  // Frequently bought together lookup
  const frequentlyBought = (product.frequentlyBoughtTogether || [])
    .map((slug) => catalog?.products?.find((p) => p.slug === slug))
    .filter(Boolean);

  const getStockBadge = () => {
    switch (product.stockStatus) {
      case "in_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            <CheckCircle className="h-3.5 w-3.5" />
            In Stock ({product.stockCount} available)
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Low Stock (Only {product.stockCount} left)
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600">
            <XCircle className="h-3.5 w-3.5" />
            Out of Stock
          </span>
        );
      case "available_soon":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600">
            <Clock className="h-3.5 w-3.5" />
            Available Soon
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setQuickViewProduct(null)}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-2 text-foreground backdrop-blur-xs hover:bg-accent transition-colors shadow-md"
          aria-label="Close product view"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery Section */}
          <div className="p-6 bg-muted/30 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div
                className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card cursor-zoom-in"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                {images[selectedImgIdx] ? (
                  <img
                    src={images[selectedImgIdx]}
                    alt={product.name}
                    className={`h-full w-full object-cover transition-transform duration-500 ${
                      isZoomed ? "scale-150" : "hover:scale-105"
                    }`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                    No image available
                  </div>
                )}
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-xs">
                  {isZoomed ? "Click to reset" : "Click to zoom"}
                </span>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedImgIdx(idx);
                        setIsZoomed(false);
                      }}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        selectedImgIdx === idx
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Guarantees */}
            <div className="rounded-2xl border border-border bg-card/80 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Bismillah Milk Corner Freshness Guarantee</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Tested daily for fat content, purity, and temperature control before delivery to
                clubs, kitchens, and households.
              </p>
            </div>
          </div>

          {/* Product Info Section */}
          <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow text-[10px]">
                    {product.category} · {product.brand}
                  </span>
                  {getStockBadge()}
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
                  {product.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  SKU: <span className="font-mono text-foreground">{product.sku}</span>
                </p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-current" : "opacity-30"}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-foreground">{product.rating}</span>
                <span className="text-xs text-muted-foreground">
                  ({product.reviewCount} customer reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex flex-col gap-1 pt-1 border-t border-border">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl font-bold text-primary">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-muted-foreground line-through font-medium">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-muted-foreground">
                    / {product.unit}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 w-fit px-2 py-0.5 rounded border border-emerald-200">
                  Rate + Tax Included
                </span>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>

              {/* Specifications */}
              {Object.keys(product.specifications || {}).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Specifications
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(product.specifications).map(([key, val]) => (
                      <div key={key} className="rounded-lg bg-muted/50 p-2">
                        <span className="text-muted-foreground block text-[10px]">{key}</span>
                        <span className="font-medium text-foreground">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector & Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border rounded-full p-1 bg-background">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-semibold text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`p-3 rounded-full border transition-all ${
                      inWishlist
                        ? "border-rose-500 bg-rose-50 text-rose-500 dark:bg-rose-950/30"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                    aria-label="Save to wishlist"
                  >
                    <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    onClick={() => addToCart(product, quantity)}
                    disabled={product.stockStatus === "out_of_stock"}
                    className="rounded-full bg-primary text-primary-foreground font-semibold py-6 text-sm"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Add to Cart ({formatPrice(product.price * quantity)})
                  </Button>

                  <a
                    href={getWhatsappOrderLink(product.name, quantity)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1da851]"
                  >
                    WhatsApp Order
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Frequently Bought Together */}
              {frequentlyBought.length > 0 && (
                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Frequently Bought Together
                  </p>
                  <div className="space-y-2">
                    {frequentlyBought.map(
                      (item) =>
                        item && (
                          <div
                            key={item.slug}
                            className="flex items-center justify-between p-2 rounded-xl bg-accent/40 border border-border/60 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={item.images[0]}
                                alt=""
                                className="h-8 w-8 rounded-lg object-cover"
                              />
                              <div>
                                <p className="font-semibold text-foreground">{item.name}</p>
                                <p className="text-[10px] text-primary">
                                  {formatPrice(item.price)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                addToCart(
                                  {
                                    id: item.id,
                                    slug: item.slug,
                                    name: item.name,
                                    category: item.category,
                                    description: item.description,
                                    price: item.price,
                                    originalPrice: item.originalPrice || null,
                                    unit: item.unit,
                                    image: item.images[0] || null,
                                    images: item.images,
                                    brand: item.brand,
                                    tags: item.tags,
                                    stockStatus: item.stockStatus,
                                    stockCount: item.stockCount,
                                    sku: item.sku,
                                    rating: item.rating,
                                    reviewCount: item.reviewCount,
                                    specifications: item.specifications,
                                    frequentlyBoughtTogether: item.frequentlyBoughtTogether || [],
                                    isNew: item.isNew,
                                    isBestSeller: item.isBestSeller,
                                    featured: true,
                                    sortOrder: 0,
                                  },
                                  1,
                                )
                              }
                              className="rounded-full bg-card border border-border px-3 py-1 font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              + Add
                            </button>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 text-center">
              <Link
                to="/product/$slug"
                params={{ slug: product.slug }}
                onClick={() => setQuickViewProduct(null)}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                View Full Product Details & Reviews <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
