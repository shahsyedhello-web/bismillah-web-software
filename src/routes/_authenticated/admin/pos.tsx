import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Barcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Star,
  Zap,
  Clock,
  Printer,
  FileText,
  DollarSign,
  Tag,
  RotateCcw,
  CheckCircle2,
  Percent,
  Edit3,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Filter,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getCachedProducts,
  getCachedCategories,
  fetchMasterProductsList,
} from "@/lib/catalog-cache";
import {
  getStoredCustomers,
  DEFAULT_WALK_IN_CUSTOMER,
  getFavoriteProductIds,
  toggleFavoriteProductId,
  getStoredSales,
} from "@/lib/pos-service";
import type { CatalogProduct } from "@/lib/catalog";
import type { POSCustomer, POSItem, POSSale } from "@/types/pos";
import { CustomerModal } from "@/components/pos/customer-modal";
import { BarcodeModal } from "@/components/pos/barcode-modal";
import { PaymentModal } from "@/components/pos/payment-modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pos")({
  component: POSTerminalPage,
});

function POSTerminalPage() {
  const qc = useQueryClient();

  // --- POS STATE ---
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [tabFilter, setTabFilter] = useState<"all" | "quick" | "favorites" | "recent">("all");

  // Cart & Line Items
  const [cart, setCart] = useState<POSItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer>(DEFAULT_WALK_IN_CUSTOMER);

  // Bill level discount & tax
  const [billDiscountType, setBillDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0); // Default 0%
  const [billNotes, setBillNotes] = useState<string>("");

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<POSSale | null>(null);

  // Edit Line Item Modal
  const [editingItem, setEditingItem] = useState<POSItem | null>(null);

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [salesHistory, setSalesHistory] = useState<POSSale[]>([]);

  // Load products & categories from master catalog query
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const cached = await fetchMasterProductsList(false); // Only non-archived master products
      const visibleForPOS = cached.filter((p) => p.is_visible);
      return visibleForPOS.map((p, idx) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category || "General",
        description: p.description || p.short_description || "",
        price: Number(p.price) || 0,
        costPrice: Number(p.cost_price) || Math.round((Number(p.price) || 0) * 0.75),
        originalPrice: p.sale_price ? Number(p.price) : null,
        unit: p.unit || "per unit",
        image: p.thumbnail_url || (p.images && p.images[0]) || null,
        images: p.images || [],
        brand: p.brand || "BMC Pure Dairy",
        tags: [p.category ? p.category.toLowerCase() : "dairy"],
        stockStatus: (p.stock_quantity ?? 0) > 0 ? "in_stock" : "out_of_stock",
        stockCount: p.stock_quantity ?? 0,
        sku: p.sku || `BMC-SKU-${idx + 1}`,
        barcode: p.barcode || p.id,
        rating: 4.8,
        reviewCount: 24,
        specifications: {},
        frequentlyBoughtTogether: [],
        featured: p.is_featured ?? false,
        sortOrder: p.sort_order ?? idx,
      })) as CatalogProduct[];
    },
    staleTime: 1_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["pos-categories"],
    queryFn: async () => {
      return getCachedCategories();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    setFavoriteIds(getFavoriteProductIds());
    setSalesHistory(getStoredSales());
  }, []);

  // Live real-time catalog sync listener across open tabs & modules
  useEffect(() => {
    const handleUpdate = () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["pos-categories"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    };
    window.addEventListener("catalog_updated", handleUpdate);
    return () => window.removeEventListener("catalog_updated", handleUpdate);
  }, [qc]);

  // Handle adding scanned barcode to cart
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const cleanCode = code.trim().toLowerCase();
      const matched = products.find(
        (p) =>
          p.id.toLowerCase() === cleanCode ||
          p.slug.toLowerCase() === cleanCode ||
          (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
          (p.sku && p.sku.toLowerCase() === cleanCode) ||
          p.name.toLowerCase().includes(cleanCode),
      );

      if (matched) {
        addToCart(matched);
        toast.success(`Scanned: ${matched.name} added to cart`);
      } else {
        toast.error(`No product found matching barcode "${code}"`);
      }
    },
    [products],
  );

  // USB Barcode Scanner Listener:
  // Hardware scanners simulate rapid keypresses ending with "Enter"
  const scanBufferRef = useRef<string>("");
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input element
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "Enter") {
        if (scanBufferRef.current.length >= 3) {
          const code = scanBufferRef.current;
          scanBufferRef.current = "";
          handleBarcodeScanned(code);
        }
      } else if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = setTimeout(() => {
          scanBufferRef.current = "";
        }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, handleBarcodeScanned]);

  // Toggle favorite
  const handleToggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleFavoriteProductId(productId);
    setFavoriteIds(updated);
  };

  // Filtered Products Calculation
  const filteredProducts = useMemo(() => {
    let list = products;

    // Category Filter
    if (selectedCategory !== "all") {
      list = list.filter(
        (p) =>
          (p as Record<string, unknown>).category_id === selectedCategory ||
          p.category === selectedCategory,
      );
    }

    // Search Query (Name, Barcode, SKU, Category)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)),
      );
    }

    // Tabs filter
    if (tabFilter === "quick") {
      list = list.slice(0, 8); // Top 8 items
    } else if (tabFilter === "favorites") {
      list = list.filter((p) => favoriteIds.includes(p.id));
    } else if (tabFilter === "recent") {
      list = [...list].reverse().slice(0, 10);
    }

    return list;
  }, [products, selectedCategory, search, tabFilter, favoriteIds]);

  // Cart Handlers
  const addToCart = (product: CatalogProduct) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((i) => i.product_id === product.id);
      const stock =
        (product as Record<string, unknown>).stock_quantity ??
        (product as Record<string, unknown>).stock ??
        50;

      if (existingIdx >= 0) {
        const updated = [...prevCart];
        updated[existingIdx].quantity += 1;
        return updated;
      }

      const newItem: POSItem = {
        product_id: product.id,
        slug: product.slug,
        product_name: product.name,
        sku: product.slug.slice(0, 8).toUpperCase(),
        barcode: product.id,
        unit_price: product.price,
        quantity: 1,
        discount: 0,
        discount_type: "fixed",
        notes: "",
        thumbnail_url: product.image || product.thumbnail_url || "",
        stock: Number(stock),
      };

      return [...prevCart, newItem];
    });
  };

  const updateItemQty = (productId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.product_id === productId) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as POSItem[],
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setBillDiscountValue(0);
    setTaxRate(0);
    setBillNotes("");
    setSelectedCustomer(DEFAULT_WALK_IN_CUSTOMER);
    toast.info("POS Cart cleared");
  };

  // Subtotal & Grand Total Calculation
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const priceAfterItemDiscount = Math.max(0, item.unit_price - item.discount);
      return acc + priceAfterItemDiscount * item.quantity;
    }, 0);
  }, [cart]);

  const billDiscountAmount = useMemo(() => {
    if (billDiscountType === "percentage") {
      return (subtotal * Math.min(100, billDiscountValue)) / 100;
    }
    return Math.min(subtotal, billDiscountValue);
  }, [subtotal, billDiscountType, billDiscountValue]);

  const afterDiscountSubtotal = Math.max(0, subtotal - billDiscountAmount);

  const taxAmount = useMemo(() => {
    return (afterDiscountSubtotal * taxRate) / 100;
  }, [afterDiscountSubtotal, taxRate]);

  const grandTotal = Math.round(afterDiscountSubtotal + taxAmount);

  const handleSaleFinished = (sale: POSSale) => {
    setCompletedSale(sale);
    setShowReceiptModal(true);
    setCart([]);
    setBillDiscountValue(0);
    setTaxRate(0);
    setBillNotes("");
    setSelectedCustomer(DEFAULT_WALK_IN_CUSTOMER);
    setSalesHistory(getStoredSales());

    // Invalidate queries so admin & homepage sync
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
    qc.invalidateQueries({ queryKey: ["catalog-products"] });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-100 dark:bg-slate-950 p-3 sm:p-4 gap-4">
      {/* TOP POS HEADER / QUICK CONTROL BAR */}
      <div className="bg-card border rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              POS Terminal
            </h1>
            <p className="text-xs text-muted-foreground">Touch-Friendly Retail Point of Sale</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Product Name, Barcode, SKU or Category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm bg-background pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBarcodeModal(true)}
            className="gap-1.5 text-xs h-9"
          >
            <Barcode className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Scanner & Barcodes</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomerModal(true)}
            className="gap-1.5 text-xs h-9 bg-primary/5 border-primary/20"
          >
            <User className="h-4 w-4 text-primary" />
            <span className="font-semibold">{selectedCustomer.name}</span>
            {selectedCustomer.outstanding_balance > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1 ml-1">
                Due: Rs {selectedCustomer.outstanding_balance}
              </Badge>
            )}
          </Button>

          {salesHistory.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCompletedSale(salesHistory[0]);
                setShowReceiptModal(true);
              }}
              className="gap-1 text-xs h-9"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Last Receipt</span>
            </Button>
          )}

          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-red-500 hover:text-red-600 h-9 px-2"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* MAIN POS GRID & CART LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* LEFT COLUMN: PRODUCTS CATALOG & FILTERS */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          {/* Quick Filter Tabs & Categories */}
          <div className="bg-card border rounded-xl p-3 shadow-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1">
                {[
                  { id: "all", label: "All Products", icon: Tag },
                  { id: "quick", label: "Quick Top items", icon: Zap },
                  { id: "favorites", label: "Starred", icon: Star },
                  { id: "recent", label: "Recent", icon: Clock },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = tabFilter === t.id;
                  return (
                    <Button
                      key={t.id}
                      size="sm"
                      variant={active ? "default" : "ghost"}
                      onClick={() => setTabFilter(t.id as "all" | "quick" | "favorites" | "recent")}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Icon className={`h-3.5 w-3.5 ${active ? "" : "text-muted-foreground"}`} />
                      {t.label}
                    </Button>
                  );
                })}
              </div>

              <span className="text-xs text-muted-foreground font-medium">
                {filteredProducts.length} items found
              </span>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
            {filteredProducts.length === 0 ? (
              <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground space-y-2">
                <Filter className="h-8 w-8 mx-auto text-slate-400" />
                <p className="font-medium text-sm">No products found for this search/filter.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setTabFilter("all");
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isFav = favoriteIds.includes(product.id);
                  const inCartItem = cart.find((i) => i.product_id === product.id);
                  const stock = Number(
                    (product as Record<string, unknown>).stock_quantity ??
                      (product as Record<string, unknown>).stock ??
                      50,
                  );

                  return (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="group bg-card border rounded-xl p-2.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative hover:border-primary/50"
                    >
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(product.id, e)}
                        className={`absolute top-2 right-2 p-1.5 rounded-full z-10 transition-all ${
                          isFav
                            ? "text-amber-500 bg-amber-50 dark:bg-amber-950/50"
                            : "text-slate-400 hover:text-amber-500 bg-background/80"
                        }`}
                      >
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </button>

                      <div>
                        {/* Thumbnail */}
                        <div className="w-full h-24 sm:h-28 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 mb-2 relative flex items-center justify-center">
                          {product.image || product.thumbnail_url ? (
                            <img
                              src={product.image || product.thumbnail_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-1 p-2">
                              <ImageOff className="h-6 w-6 opacity-60" />
                              <span className="text-[10px] font-medium text-center">No Image</span>
                            </div>
                          )}
                          {inCartItem && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5 rounded-full shadow-md">
                              x{inCartItem.quantity}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                          {product.name}
                        </h3>
                      </div>

                      <div className="mt-2 pt-2 border-t flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-950 dark:text-slate-50">
                            Rs {product.price}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Stock:{" "}
                            {stock > 0 ? (
                              <span className="text-emerald-600 font-semibold">{stock}</span>
                            ) : (
                              <span className="text-red-500">Out</span>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS CART & CHECKOUT PANEL */}
        <div className="lg:col-span-5 xl:col-span-4 bg-card border rounded-xl p-4 shadow-xs flex flex-col justify-between">
          {/* Cart Header */}
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">POS Cart</h2>
                <Badge variant="secondary" className="text-xs">
                  {cart.reduce((a, b) => a + b.quantity, 0)} items
                </Badge>
              </div>

              {/* Customer summary pill */}
              <button
                onClick={() => setShowCustomerModal(true)}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
              >
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate">{selectedCustomer.name}</span>
              </button>
            </div>

            {/* Cart Items List */}
            <div className="max-h-[calc(100vh-28rem)] overflow-y-auto space-y-2 pr-1 min-h-[160px]">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
                  <ShoppingCart className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p>Cart is currently empty.</p>
                  <p className="text-[11px] text-slate-400">
                    Click products or use USB barcode scanner to add items.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const lineTotal = (item.unit_price - item.discount) * item.quantity;
                  return (
                    <div
                      key={item.product_id}
                      className="p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt={item.product_name}
                            className="w-10 h-10 rounded-md object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border shrink-0 text-muted-foreground">
                            <ImageOff className="h-4 w-4 opacity-60" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {item.product_name}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span>Rs {item.unit_price}</span>
                            {item.discount > 0 && (
                              <span className="text-emerald-600 font-semibold">
                                (-Rs {item.discount})
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <div className="text-[10px] text-slate-500 italic truncate">
                              "{item.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateItemQty(item.product_id, -1)}
                          className="w-6 h-6 rounded bg-background border flex items-center justify-center hover:bg-muted text-xs font-bold"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <span className="font-bold text-xs w-6 text-center font-mono">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => updateItemQty(item.product_id, 1)}
                          className="w-6 h-6 rounded bg-background border flex items-center justify-center hover:bg-muted text-xs font-bold"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Line Total & Item Edit/Remove */}
                      <div className="text-right pl-2">
                        <div className="font-bold text-xs text-slate-950 dark:text-slate-50 font-mono">
                          Rs {lineTotal}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-muted-foreground hover:text-primary p-0.5"
                            title="Edit Item discount or notes"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="text-muted-foreground hover:text-red-500 p-0.5"
                            title="Remove item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cart Summary & Checkout Actions */}
          <div className="border-t pt-3 mt-3 space-y-3">
            {/* Bill Level Controls: Discount & Tax */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Bill Discount:
                </label>
                <div className="flex gap-1 mt-0.5">
                  <Input
                    type="number"
                    min={0}
                    value={billDiscountValue || ""}
                    onChange={(e) => setBillDiscountValue(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="text-xs h-7"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      setBillDiscountType(billDiscountType === "fixed" ? "percentage" : "fixed")
                    }
                  >
                    {billDiscountType === "fixed" ? "Rs" : "%"}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Tax (% Rate):
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={taxRate || ""}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  placeholder="0%"
                  className="text-xs h-7 mt-0.5"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-muted/30 p-2.5 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>Rs {subtotal.toLocaleString()}</span>
              </div>
              {billDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>
                    Bill Discount (
                    {billDiscountType === "percentage" ? `${billDiscountValue}%` : "Fixed"}):
                  </span>
                  <span>-Rs {billDiscountAmount.toLocaleString()}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxRate}%):</span>
                  <span>+Rs {taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base text-slate-950 dark:text-slate-50 border-t pt-1 mt-1">
                <span>Grand Total:</span>
                <span className="text-primary font-mono text-lg">
                  Rs {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Trigger Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="h-11 font-semibold text-xs border-primary text-primary hover:bg-primary/10 gap-1.5"
              >
                <Banknote className="h-4 w-4" /> Cash / Split Pay
              </Button>

              <Button
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="h-11 font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1.5"
              >
                <CheckCircle2 className="h-5 w-5" /> PAY RS {grandTotal.toLocaleString()}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Customer Modal */}
      <CustomerModal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
        salesHistory={salesHistory}
      />

      {/* 2. Barcode & Scanner Modal */}
      <BarcodeModal
        open={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        products={products}
        onScanCode={handleBarcodeScanned}
      />

      {/* 3. Payment Checkout Modal */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        customer={selectedCustomer}
        items={cart}
        subtotal={subtotal}
        discountType={billDiscountType}
        discountValue={billDiscountValue}
        discountAmount={billDiscountAmount}
        taxRate={taxRate}
        taxAmount={taxAmount}
        grandTotal={grandTotal}
        billNotes={billNotes}
        onSaleComplete={handleSaleFinished}
      />

      {/* 4. Thermal & A4 Receipt Modal */}
      <ReceiptModal
        sale={completedSale}
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
      />

      {/* 5. Line Item Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-base font-bold">
              Edit Item: {editingItem?.product_name}
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground">
                  Per Item Discount (PKR):
                </label>
                <Input
                  type="number"
                  min={0}
                  value={editingItem.discount}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setCart((prev) =>
                      prev.map((i) =>
                        i.product_id === editingItem.product_id ? { ...i, discount: val } : i,
                      ),
                    );
                    setEditingItem({ ...editingItem, discount: val });
                  }}
                  className="mt-1 text-sm font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground">Line Item Notes:</label>
                <Input
                  placeholder="e.g. Special packing, extra warranty, note..."
                  value={editingItem.notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCart((prev) =>
                      prev.map((i) =>
                        i.product_id === editingItem.product_id ? { ...i, notes: val } : i,
                      ),
                    );
                    setEditingItem({ ...editingItem, notes: val });
                  }}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setEditingItem(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
