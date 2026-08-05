import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SITE, CATEGORY_DESCRIPTIONS, type CategoryName } from "@/lib/site-data";
import { catalogQueryOptions, type CatalogProduct } from "@/lib/catalog";
import { SectionHeading } from "@/components/section-heading";
import { ProductCard } from "@/components/product-card";
import { useShop } from "@/context/shop-context";
import { useSiteSettings } from "@/context/site-settings-context";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: `Products Catalog — ${SITE.name}` },
      {
        name: "description",
        content:
          "Explore our full catalog: fresh milk, set dahi, authentic khoya, desi butter, paneer, spring roll patti, samosas, papri, organic honey, dry fruits, and commercial bakery ingredients.",
      },
      { property: "og:title", content: `Products Catalog — ${SITE.name}` },
      {
        property: "og:description",
        content: "Fresh dairy, sweets, snacks, organic products, and bakery essentials.",
      },
      { property: "og:url", content: "/products" },
    ],
    links: [{ rel: "canonical", href: "/products" }],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions);
  },
  component: ProductsPage,
});

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "bestseller" | "newest";

function ProductsPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions);
  const { searchQuery, setSearchQuery, recentlyViewed } = useShop();
  const { getWhatsappCustomLink } = useSiteSettings();

  const [q, setQ] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(4000);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const categories = useMemo(() => {
    const used = new Set(catalog.products.map((p) => p.category));
    return catalog.categories.filter((c) => used.has(c));
  }, [catalog]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    catalog.products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [catalog]);

  // Filtering & Sorting pipeline
  const filteredProducts = useMemo(() => {
    const query = (q || searchQuery).trim().toLowerCase();

    return catalog.products
      .filter((p) => {
        const matchCat = selectedCategory === "All" || p.category === selectedCategory;
        const matchStock =
          !inStockOnly || p.stockStatus === "in_stock" || p.stockStatus === "low_stock";
        const matchPrice = p.price <= maxPrice || p.price === 0;

        const matchQuery =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query));

        return matchCat && matchStock && matchPrice && matchQuery;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "bestseller") return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
        if (sortBy === "newest") return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        return a.sortOrder - b.sortOrder;
      });
  }, [catalog, q, searchQuery, selectedCategory, inStockOnly, maxPrice, sortBy]);

  const resetFilters = () => {
    setQ("");
    setSearchQuery("");
    setSelectedCategory("All");
    setInStockOnly(false);
    setMaxPrice(4000);
    setSortBy("featured");
  };

  return (
    <>
      {/* Hero Heading */}
      <section className="container-page pt-12 pb-8 md:pt-16 md:pb-12">
        <SectionHeading
          as="h1"
          eyebrow="Gourmet Catalog"
          title="Pure, fresh, and temperature-controlled daily."
          description="Sourced directly from verified farms and processed in food-grade hygienic facilities across Karachi. Delivered fresh 365 days a year."
        />
      </section>

      {/* Category Visual Cards */}
      <section className="container-page pb-12">
        <div className="flex items-center justify-between mb-4">
          <p className="eyebrow text-xs">Explore Product Categories</p>
          <span className="text-xs text-muted-foreground">
            {categories.length} categories available
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`flex flex-col justify-between p-4 rounded-2xl border text-left transition-all ${
              selectedCategory === "All"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                : "border-border bg-card hover:bg-accent"
            }`}
          >
            <div>
              <span className="font-display font-semibold text-sm block text-foreground">
                All Products
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                {catalog.products.length} Items
              </span>
            </div>
            <Sparkles className="h-4 w-4 text-primary mt-3" />
          </button>

          {categories.map((cat) => {
            const active = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            const desc = CATEGORY_DESCRIPTIONS[cat as CategoryName] || "Fresh quality guaranteed.";

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex flex-col justify-between p-4 rounded-2xl border text-left transition-all ${
                  active
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                    : "border-border bg-card hover:bg-accent hover:border-border/80"
                }`}
              >
                <div>
                  <span className="font-display font-semibold text-sm block text-foreground line-clamp-1">
                    {cat}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {count} {count === 1 ? "Item" : "Items"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-2">{desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Search and Filter Toolbar */}
      <section className="container-page sticky top-16 z-30 py-3 bg-background/90 backdrop-blur-md border-y border-border/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="Search products by name, tag, category..."
              className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {q && (
              <button
                onClick={() => {
                  setQ("");
                  setSearchQuery("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="featured">Sort: Featured</option>
              <option value="bestseller">Sort: Best Sellers</option>
              <option value="newest">Sort: Newest First</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            {/* In-Stock Toggle */}
            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                inStockOnly
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              In-Stock Only
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-full border border-border bg-card p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-full transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-full transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="inline-flex md:hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>
        </div>

        {/* Mobile Filters Drawer Bar */}
        {showFiltersMobile && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-primary"
                />
                In Stock Only
              </label>

              <div className="flex items-center gap-1.5">
                <span>Max Price:</span>
                <span className="font-bold text-primary">Rs. {maxPrice}</span>
                <input
                  type="range"
                  min={100}
                  max={4000}
                  step={100}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-24 accent-primary"
                />
              </div>
            </div>

            <button
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground underline text-[11px]"
            >
              Reset All
            </button>
          </div>
        )}
      </section>

      {/* Main Catalog Grid / List */}
      <section className="container-page py-10">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredProducts.length}</strong> of{" "}
            {catalog.products.length} products
          </span>

          {(selectedCategory !== "All" || q || inStockOnly || sortBy !== "featured") && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <RefreshCw className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
            <p className="font-display text-lg text-foreground font-semibold">No products found</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We couldn't find any products matching your search criteria. Try clearing filters or
              adjusting your search term.
            </p>
            <button
              onClick={resetFilters}
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id || p.slug} product={p as CatalogProduct} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id || p.slug} product={p as CatalogProduct} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Viewed Carousel */}
      {recentlyViewed.length > 0 && (
        <section className="container-page py-12 border-t border-border">
          <SectionHeading
            eyebrow="Your Browsing History"
            title="Recently Viewed Items"
            description="Quickly re-access items you checked out earlier in this session."
          />
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentlyViewed.map((p, idx) => (
              <ProductCard key={p.id || p.slug || `rv-${idx}`} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Quality Banner */}
      <section className="container-page pb-20">
        <div className="rounded-3xl bg-primary text-primary-foreground p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              <ShieldCheck className="h-4 w-4" /> B2B & Commercial Kitchen Wholesale
            </span>
            <h3 className="font-display text-2xl md:text-3xl font-bold">
              Need Wholesale Milk, Khoya, or Dahi Supplies?
            </h3>
            <p className="text-sm opacity-90 max-w-xl">
              We provide dedicated daily delivery slots for restaurants, hotels, clubs, and sweet
              confectioners across Karachi with custom billing.
            </p>
          </div>

          <a
            href={getWhatsappCustomLink(
              "Assalam-o-Alaikum BMC Team, I want to inquire about commercial wholesale supply.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-primary transition-transform hover:scale-105 shrink-0"
          >
            Contact Wholesale Manager
          </a>
        </div>
      </section>
    </>
  );
}
