import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SITE } from "@/lib/site-data";
import { catalogQueryOptions, formatPrice, type CatalogProduct } from "@/lib/catalog";
import { useShop } from "@/context/shop-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { ReviewSection } from "@/components/review-section";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import {
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
  ChevronRight,
  Truck,
  RotateCcw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Product Details — ${SITE.name}` },
      { property: "og:url", content: `/product/${params.slug}` },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions);
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { data: catalog } = useQuery(catalogQueryOptions);
  const { addToCart, toggleWishlist, isInWishlist, addRecentlyViewed } = useShop();
  const { getWhatsappOrderLink } = useSiteSettings();

  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);

  const product = useMemo(() => {
    if (!catalog?.products) return null;
    return (
      catalog.products.find((p) => p.slug === slug || p.id === slug || p.id === `prod-${slug}`) ||
      null
    );
  }, [catalog, slug]);

  const inWishlist = product ? isInWishlist(product.slug) : false;

  useEffect(() => {
    if (product) {
      addRecentlyViewed(product);
    }
  }, [product, addRecentlyViewed]);

  const images = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) return product.images;
    return product.image ? [product.image] : [];
  }, [product]);

  // Related products in same category
  const relatedProducts = useMemo(() => {
    if (!catalog?.products || !product) return [];
    return catalog.products
      .filter((p) => p.category === product.category && p.slug !== product.slug)
      .slice(0, 4);
  }, [catalog, product]);

  if (!product) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-foreground">Product Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The product you are looking for may have been removed or renamed.
        </p>
        <div className="mt-6">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Browse All Products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Frequently bought together lookup
  const frequentlyBought = (product.frequentlyBoughtTogether || [])
    .map((itemSlug) => (catalog?.products || []).find((p) => p.slug === itemSlug))
    .filter(Boolean) as CatalogProduct[];

  const renderStockBadge = () => {
    switch (product.stockStatus) {
      case "in_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
            <CheckCircle className="h-3.5 w-3.5" /> In Stock ({product.stockCount} available)
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" /> Low Stock (Only {product.stockCount}{" "}
            remaining)
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600">
            <XCircle className="h-3.5 w-3.5" /> Out of Stock
          </span>
        );
      case "available_soon":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600">
            <Clock className="h-3.5 w-3.5" /> Available Soon
          </span>
        );
    }
  };

  return (
    <>
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumbs"
        className="container-page pt-6 pb-2 text-xs text-muted-foreground"
      >
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li>
            <Link to="/products" className="hover:text-primary transition-colors">
              Products
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li>
            <span className="text-foreground font-medium">{product.category}</span>
          </li>
          <li>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="text-primary font-semibold line-clamp-1">{product.name}</li>
        </ol>
      </nav>

      {/* Product Hero Section */}
      <section className="container-page py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Gallery Column */}
          <div className="space-y-4">
            <div
              className="relative aspect-4/3 sm:aspect-square overflow-hidden rounded-3xl border border-border bg-card cursor-zoom-in shadow-md"
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
                  Image coming soon
                </div>
              )}
              <span className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-xs">
                {isZoomed ? "Click to reset" : "Click image to zoom"}
              </span>
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedImgIdx(idx);
                      setIsZoomed(false);
                    }}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                      selectedImgIdx === idx
                        ? "border-primary ring-2 ring-primary/20 scale-105"
                        : "border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="p-3 rounded-2xl border border-border bg-card text-center space-y-1">
                <Truck className="h-5 w-5 text-primary mx-auto" />
                <p className="text-[11px] font-semibold text-foreground">Same-Day Karachi</p>
                <p className="text-[10px] text-muted-foreground">Cold chain delivery</p>
              </div>

              <div className="p-3 rounded-2xl border border-border bg-card text-center space-y-1">
                <ShieldCheck className="h-5 w-5 text-primary mx-auto" />
                <p className="text-[11px] font-semibold text-foreground">100% Quality Tested</p>
                <p className="text-[10px] text-muted-foreground">Zero adulteration</p>
              </div>

              <div className="p-3 rounded-2xl border border-border bg-card text-center space-y-1">
                <RotateCcw className="h-5 w-5 text-primary mx-auto" />
                <p className="text-[11px] font-semibold text-foreground">Fresh Replacement</p>
                <p className="text-[10px] text-muted-foreground">Satisfaction guaranteed</p>
              </div>
            </div>
          </div>

          {/* Product Details Column */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow text-xs">
                  {product.category} · {product.brand}
                </span>
                {renderStockBadge()}
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                {product.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                SKU Code:{" "}
                <span className="font-mono text-foreground font-semibold">{product.sku}</span>
              </p>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-current" : "opacity-30"}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-foreground">{product.rating}</span>
                <span className="text-xs text-muted-foreground">
                  ({product.reviewCount} customer reviews)
                </span>
              </div>

              {/* Pricing */}
              <div className="flex flex-col gap-1.5 py-3 border-y border-border">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-3xl font-bold text-primary">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-base text-muted-foreground line-through font-medium">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-muted-foreground">
                    / {product.unit}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 w-fit px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Rate + Tax Included
                </span>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>

              {/* Specifications Table */}
              {Object.keys(product.specifications || {}).length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Technical Specifications
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(product.specifications).map(([key, val]) => (
                      <div key={key} className="rounded-xl border border-border bg-card p-3">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          {key}
                        </span>
                        <span className="font-semibold text-foreground text-xs">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Action CTA */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Quantity:
                  </span>
                  <div className="flex items-center border border-border rounded-full p-1 bg-background shadow-xs">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center font-bold text-sm text-foreground">
                      {quantity}
                    </span>
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
                    title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={() => addToCart(product, quantity)}
                    disabled={product.stockStatus === "out_of_stock"}
                    className="rounded-full bg-primary text-primary-foreground font-semibold py-6 text-sm shadow-md"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Add to Cart ({formatPrice(product.price * quantity)})
                  </Button>

                  <a
                    href={getWhatsappOrderLink(product.name, quantity)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#1da851]"
                  >
                    Order on WhatsApp
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <Link
                  to="/quote"
                  className="block text-center text-xs text-primary font-semibold hover:underline pt-1"
                >
                  Need bulk supply for restaurant, hotel, or catering? Request a commercial
                  quotation.
                </Link>
              </div>

              {/* Frequently Bought Together Bundle */}
              {frequentlyBought.length > 0 && (
                <div className="pt-6 border-t border-border space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" /> Frequently Bought Together
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {frequentlyBought.map(
                      (item) =>
                        item && (
                          <div
                            key={item.id || item.slug}
                            className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={item.images[0]}
                                alt=""
                                className="h-10 w-10 rounded-xl object-cover"
                              />
                              <div>
                                <p className="font-semibold text-foreground line-clamp-1">
                                  {item.name}
                                </p>
                                <p className="text-xs text-primary font-bold">
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
                              className="rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
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
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="container-page py-12">
        <ReviewSection productSlug={product.slug} productName={product.name} />
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="container-page py-12 border-t border-border">
          <SectionHeading
            eyebrow="Similar Staples"
            title="You Might Also Like"
            description={`Explore complementary items in ${product.category} from Bismillah Milk Corner.`}
          />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id || p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
