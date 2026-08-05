import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/context/shop-context";
import { catalogQueryOptions, formatPrice } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/site-data";
import { Search, X, ArrowRight, ShoppingBag, Eye, Tag } from "lucide-react";

export function ProductSearchModal() {
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    addToCart,
    setQuickViewProduct,
  } = useShop();
  const { data: catalog } = useQuery(catalogQueryOptions);
  const [localQ, setLocalQ] = useState(searchQuery);

  useEffect(() => {
    setLocalQ(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsSearchOpen]);

  const searchResults = useMemo(() => {
    const q = localQ.trim().toLowerCase();
    if (!q || !catalog?.products) return [];

    return catalog.products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      const matchBrand = p.brand.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
      const matchSku = p.sku.toLowerCase().includes(q);
      return matchName || matchCat || matchBrand || matchDesc || matchTags || matchSku;
    });
  }, [localQ, catalog]);

  const popularSearches = [
    "Fresh Milk",
    "Dahi",
    "Khoya",
    "Desi Butter",
    "Samosa",
    "Roll Patti",
    "Paneer",
    "Organic Ghee",
  ];

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsSearchOpen(false)}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Header Input */}
        <div className="flex items-center border-b border-border px-5 py-4 bg-background">
          <Search className="h-5 w-5 text-muted-foreground mr-3 shrink-0" />
          <input
            type="search"
            value={localQ}
            onChange={(e) => {
              setLocalQ(e.target.value);
              setSearchQuery(e.target.value);
            }}
            placeholder="Search products by name, category, brand, tag or SKU... (Press Esc)"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm font-medium focus:outline-none"
            autoFocus
          />
          {localQ && (
            <button
              onClick={() => {
                setLocalQ("");
                setSearchQuery("");
              }}
              className="p-1 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="ml-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-6">
          {!localQ ? (
            <div className="space-y-6">
              <div>
                <p className="eyebrow text-[10px] mb-3">Popular Searches</p>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setLocalQ(term);
                        setSearchQuery(term);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <Tag className="h-3 w-3 text-primary/70" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="eyebrow text-[10px] mb-3">Explore Categories</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setLocalQ(cat);
                        setSearchQuery(cat);
                      }}
                      className="text-left p-3 rounded-xl border border-border bg-muted/40 hover:bg-accent hover:border-primary/40 transition-all text-xs font-semibold text-foreground"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground space-y-2">
              <p className="font-display text-base text-foreground">No matching products found</p>
              <p className="text-xs">Try searching for "Milk", "Yogurt", "Samosa", or "Khoya"</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="eyebrow text-[10px]">
                Found {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
              </p>
              <div className="divide-y divide-border">
                {searchResults.map((p) => (
                  <div
                    key={p.id || p.slug}
                    className="flex items-center justify-between gap-4 py-3 group hover:bg-accent/40 rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                        {p.images[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                            BMC
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {p.category} · {p.brand}
                        </p>
                        <h4 className="font-display text-sm font-semibold text-foreground">
                          {p.name}
                        </h4>
                        <p className="text-xs text-primary font-bold">
                          {formatPrice(p.price)}{" "}
                          <span className="text-[10px] text-muted-foreground">({p.unit})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsSearchOpen(false);
                          setQuickViewProduct({
                            id: p.id,
                            slug: p.slug,
                            name: p.name,
                            category: p.category,
                            description: p.description,
                            price: p.price,
                            originalPrice: p.originalPrice || null,
                            unit: p.unit,
                            image: p.images[0] || null,
                            images: p.images,
                            brand: p.brand,
                            tags: p.tags,
                            stockStatus: p.stockStatus,
                            stockCount: p.stockCount,
                            sku: p.sku,
                            rating: p.rating,
                            reviewCount: p.reviewCount,
                            specifications: p.specifications,
                            frequentlyBoughtTogether: p.frequentlyBoughtTogether || [],
                            isNew: p.isNew,
                            isBestSeller: p.isBestSeller,
                            featured: true,
                            sortOrder: 0,
                          });
                        }}
                        className="p-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                        title="Quick View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => {
                          addToCart({
                            id: p.id,
                            slug: p.slug,
                            name: p.name,
                            category: p.category,
                            description: p.description,
                            price: p.price,
                            originalPrice: p.originalPrice || null,
                            unit: p.unit,
                            image: p.images[0] || null,
                            images: p.images,
                            brand: p.brand,
                            tags: p.tags,
                            stockStatus: p.stockStatus,
                            stockCount: p.stockCount,
                            sku: p.sku,
                            rating: p.rating,
                            reviewCount: p.reviewCount,
                            specifications: p.specifications,
                            frequentlyBoughtTogether: p.frequentlyBoughtTogether || [],
                            isNew: p.isNew,
                            isBestSeller: p.isBestSeller,
                            featured: true,
                            sortOrder: 0,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Tip: Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">
              Cmd
            </kbd>{" "}
            +{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">
              K
            </kbd>{" "}
            to search anytime
          </span>
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
          >
            Close <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
