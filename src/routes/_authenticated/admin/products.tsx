import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect, type ChangeEvent } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import {
  getCachedProducts,
  saveCachedProducts,
  getCachedCategories,
  notifyCatalogUpdated,
  addDeletedProductKey,
  removeDeletedProductKey,
  isProductDeleted,
  DUMMY_PRODUCT_SLUGS,
  fetchMasterProductsList,
  type CachedProduct,
} from "@/lib/catalog-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Upload,
  Copy,
  RotateCcw,
  Archive,
} from "lucide-react";
import { slugify, uploadMedia, logActivity } from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  unit: string | null;
  category_id: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  is_visible: boolean;
  is_archived: boolean;
  sort_order: number;
};

function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "featured" | "hidden" | "archived">("active");
  const [productToTrash, setProductToTrash] = useState<Product | null>(null);
  const [productToPermanentDelete, setProductToPermanentDelete] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const masterList = await fetchMasterProductsList(true);
      return masterList as unknown as Product[];
    },
    staleTime: 1_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("categories")
            .select("id, name")
            .order("sort_order")
            .order("name");
          if (!error && data && data.length > 0) {
            return data;
          }
        } catch {
          // fallback
        }
      }
      const cached = getCachedCategories();
      return cached.map((c) => ({ id: c.id, name: c.name }));
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Product>) => {
      const cached = getCachedProducts(true);
      const catObj = categories.find((c) => c.id === p.category_id);
      const categoryName = catObj?.name || "General";

      const targetId = p.id || `prod-${Date.now()}`;
      const slug = p.slug || slugify(p.name || `product-${Date.now()}`);
      const rec = p as Record<string, unknown>;
      const sku =
        (rec.sku as string) ||
        `BMC-${slug
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 8)}`;
      const barcode =
        (rec.barcode as string) || `8964000${Math.floor(1000 + Math.random() * 9000)}`;
      const stockVal = Number(rec.stock_quantity ?? rec.stock ?? 50);

      removeDeletedProductKey(targetId);
      removeDeletedProductKey(slug);

      const newProd: CachedProduct = {
        id: targetId,
        sku,
        barcode,
        slug,
        name: p.name?.trim() || "Untitled Product",
        description: p.description?.trim() || null,
        short_description: p.short_description?.trim() || null,
        price: Number(p.price ?? 0),
        cost_price: Number(rec.cost_price ?? Math.round(Number(p.price ?? 0) * 0.75)),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
        tax: Number(rec.tax ?? 0),
        unit: p.unit?.trim() || "1 Litre",
        category_id: p.category_id || null,
        category: categoryName,
        brand: (rec.brand as string) || "BMC Pure Dairy",
        thumbnail_url: p.thumbnail_url || null,
        images: p.thumbnail_url ? [p.thumbnail_url] : [],
        min_stock: Number(rec.min_stock ?? 10),
        reorder_level: Number(rec.reorder_level ?? 20),
        stock_quantity: stockVal,
        reserved_stock: 0,
        available_stock: stockVal,
        supplier_id: (rec.supplier_id as string) || null,
        is_featured: Boolean(p.is_featured),
        is_visible: p.is_visible !== undefined ? Boolean(p.is_visible) : true,
        is_archived: Boolean(p.is_archived),
        sort_order: Number(p.sort_order ?? 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const existingIndex = cached.findIndex((item) => item.id === targetId || item.slug === slug);
      let updatedList: CachedProduct[];
      if (existingIndex >= 0) {
        updatedList = [...cached];
        updatedList[existingIndex] = { ...updatedList[existingIndex], ...newProd };
      } else {
        updatedList = [newProd, ...cached];
      }

      // 1. Save locally & dispatch event immediately
      saveCachedProducts(updatedList);

      // 2. Persist to Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const payload = {
            slug: newProd.slug,
            name: newProd.name,
            description: newProd.description,
            short_description: newProd.short_description,
            price: newProd.price,
            sale_price: newProd.sale_price,
            unit: newProd.unit,
            category_id: newProd.category_id,
            thumbnail_url: newProd.thumbnail_url,
            is_featured: newProd.is_featured,
            is_visible: newProd.is_visible,
            is_archived: newProd.is_archived,
            sort_order: newProd.sort_order,
          };
          if (
            p.id &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)
          ) {
            await supabase
              .from("products")
              .update(payload as never)
              .eq("id", p.id);
            await logActivity("update", "product", p.id);
          } else if (slug) {
            const { data } = await supabase
              .from("products")
              .select("id")
              .eq("slug", slug)
              .maybeSingle();

            if (data?.id) {
              await supabase
                .from("products")
                .update(payload as never)
                .eq("id", data.id);
              await logActivity("update", "product", data.id);
            } else {
              const { data: inserted } = await supabase
                .from("products")
                .insert({ ...payload, slug } as never)
                .select("id")
                .single();
              if (inserted?.id) await logActivity("create", "product", inserted.id);
            }
          }
        } catch (e: unknown) {
          console.warn("Supabase product save error (saved to local cache):", e);
        }
      }
    },
    onSuccess: async () => {
      notifyCatalogUpdated();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-products"] }),
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      setOpen(false);
      toast.success("Product saved successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Helper to validate UUIDs for Supabase queries
  const isUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  // Soft Delete (Move to Trash / Archive)
  const del = useMutation({
    mutationFn: async (id: string) => {
      const targetProd = products.find((item) => item.id === id);
      const targetSlug = targetProd?.slug || id.replace(/^(static|prod)-/, "");

      // 1. Soft archive in local cache
      const cached = getCachedProducts(true);
      let foundInCached = false;
      const updatedList = cached.map((item) => {
        if (
          item.id === id ||
          item.slug === targetSlug ||
          item.id === `static-${targetSlug}` ||
          item.id === `prod-${targetSlug}`
        ) {
          foundInCached = true;
          return { ...item, is_archived: true, is_visible: false };
        }
        return item;
      });

      if (!foundInCached && targetProd) {
        updatedList.push({
          id: targetProd.id,
          slug: targetProd.slug || targetSlug,
          name: targetProd.name,
          description: targetProd.description,
          short_description: targetProd.short_description,
          price: targetProd.price,
          sale_price: targetProd.sale_price,
          unit: targetProd.unit,
          category_id: targetProd.category_id,
          category: "General",
          thumbnail_url: targetProd.thumbnail_url,
          is_featured: targetProd.is_featured,
          is_visible: false,
          is_archived: true,
          sort_order: targetProd.sort_order,
        });
      }

      saveCachedProducts(updatedList);

      // 2. Perform Supabase soft archive update
      if (isSupabaseConfigured()) {
        try {
          if (isUuid(id)) {
            const { error } = await supabase
              .from("products")
              .update({ is_archived: true, is_visible: false } as never)
              .eq("id", id);
            if (error && targetSlug) {
              await supabase
                .from("products")
                .update({ is_archived: true, is_visible: false } as never)
                .eq("slug", targetSlug);
            }
          } else if (targetSlug) {
            await supabase
              .from("products")
              .update({ is_archived: true, is_visible: false } as never)
              .eq("slug", targetSlug);
          }
          await logActivity("delete", "product", id);
        } catch (e: unknown) {
          console.warn("Supabase product delete exception (archived locally):", e);
        }
      }
    },
    onSuccess: async () => {
      notifyCatalogUpdated();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-products"] }),
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      toast.success("Product moved to Trash / Archived. You can restore it anytime!");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete product"),
  });

  // Restore Product from Trash
  const restoreProduct = useMutation({
    mutationFn: async (id: string) => {
      const targetProd = products.find((item) => item.id === id);
      const targetSlug = targetProd?.slug || id.replace(/^(static|prod)-/, "");

      removeDeletedProductKey(id);
      if (targetSlug) removeDeletedProductKey(targetSlug);
      removeDeletedProductKey(`static-${targetSlug}`);
      removeDeletedProductKey(`prod-${targetSlug}`);

      // 1. Restore in local cache
      const cached = getCachedProducts(true);
      let foundInCached = false;
      const updatedList = cached.map((item) => {
        if (
          item.id === id ||
          item.slug === targetSlug ||
          item.id === `static-${targetSlug}` ||
          item.id === `prod-${targetSlug}`
        ) {
          foundInCached = true;
          return { ...item, is_archived: false, is_visible: true };
        }
        return item;
      });

      if (!foundInCached && targetProd) {
        updatedList.push({
          id: targetProd.id,
          slug: targetProd.slug || targetSlug,
          name: targetProd.name,
          description: targetProd.description,
          short_description: targetProd.short_description,
          price: targetProd.price,
          sale_price: targetProd.sale_price,
          unit: targetProd.unit,
          category_id: targetProd.category_id,
          category: "General",
          thumbnail_url: targetProd.thumbnail_url,
          is_featured: targetProd.is_featured,
          is_visible: true,
          is_archived: false,
          sort_order: targetProd.sort_order,
        });
      }

      saveCachedProducts(updatedList);

      // 2. Restore in Supabase
      if (isSupabaseConfigured()) {
        try {
          if (isUuid(id)) {
            const { error } = await supabase
              .from("products")
              .update({ is_archived: false, is_visible: true } as never)
              .eq("id", id);
            if (error && targetSlug) {
              await supabase
                .from("products")
                .update({ is_archived: false, is_visible: true } as never)
                .eq("slug", targetSlug);
            }
          } else if (targetSlug) {
            await supabase
              .from("products")
              .update({ is_archived: false, is_visible: true } as never)
              .eq("slug", targetSlug);
          }
          await logActivity("restore", "product", id);
        } catch (e: unknown) {
          console.warn("Supabase product restore exception:", e);
        }
      }
    },
    onSuccess: async () => {
      notifyCatalogUpdated();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-products"] }),
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      toast.success("Product restored to active catalog!");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to restore product"),
  });

  // Permanent Delete
  const permanentDelete = useMutation({
    mutationFn: async (id: string) => {
      const targetProd = products.find((item) => item.id === id);
      const targetSlug = targetProd?.slug || id.replace(/^(static|prod)-/, "");

      addDeletedProductKey(id);
      if (targetSlug) addDeletedProductKey(targetSlug);
      addDeletedProductKey(`static-${targetSlug}`);
      addDeletedProductKey(`prod-${targetSlug}`);

      // 1. Remove completely from local cache
      const cached = getCachedProducts();
      const updatedList = cached.filter(
        (item) =>
          item.id !== id &&
          item.slug !== targetSlug &&
          item.id !== `static-${targetSlug}` &&
          item.id !== `prod-${targetSlug}`,
      );
      saveCachedProducts(updatedList);

      // 2. Perform hard delete in Supabase
      if (isSupabaseConfigured()) {
        try {
          if (isUuid(id)) {
            const { error } = await supabase.from("products").delete().eq("id", id);
            if (error && targetSlug) {
              await supabase.from("products").delete().eq("slug", targetSlug);
            }
          } else if (targetSlug) {
            await supabase.from("products").delete().eq("slug", targetSlug);
          }
          await logActivity("permanent_delete", "product", id);
        } catch (e: unknown) {
          console.warn("Supabase permanent delete exception:", e);
        }
      }
    },
    onSuccess: async () => {
      notifyCatalogUpdated();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-products"] }),
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      toast.success("Product permanently deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to permanently delete product"),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const cached = getCachedProducts(true);
      const updated = cached.map((p) => (p.id === id ? { ...p, is_featured } : p));
      saveCachedProducts(updated);

      if (isSupabaseConfigured()) {
        try {
          if (isUuid(id)) {
            await supabase
              .from("products")
              .update({ is_featured } as never)
              .eq("id", id);
          } else {
            const targetProd = products.find((item) => item.id === id);
            const targetSlug = targetProd?.slug || id.replace(/^(static|prod)-/, "");
            if (targetSlug) {
              await supabase
                .from("products")
                .update({ is_featured } as never)
                .eq("slug", targetSlug);
            }
          }
        } catch (e) {
          console.warn("Featured toggle warning:", e);
        }
      }
    },
    onSuccess: async () => {
      notifyCatalogUpdated();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-products"] }),
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      toast.success("Featured status updated");
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const cached = getCachedProducts(true);
      const updated = cached.map((p) => (p.id === id ? { ...p, is_visible } : p));
      saveCachedProducts(updated);

      if (isSupabaseConfigured()) {
        try {
          if (isUuid(id)) {
            await supabase
              .from("products")
              .update({ is_visible } as never)
              .eq("id", id);
          } else {
            const targetProd = products.find((item) => item.id === id);
            const targetSlug = targetProd?.slug || id.replace(/^(static|prod)-/, "");
            if (targetSlug) {
              await supabase
                .from("products")
                .update({ is_visible } as never)
                .eq("slug", targetSlug);
            }
          }
        } catch (e) {
          console.warn("Visibility toggle warning:", e);
        }
      }
    },
    onSuccess: async () => {
      notifyCatalogUpdated();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-products"] }),
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      toast.success("Product visibility updated");
    },
  });

  const activeCount = products.filter((p) => !p.is_archived).length;
  const featuredCount = products.filter((p) => !p.is_archived && p.is_featured).length;
  const hiddenCount = products.filter((p) => !p.is_archived && !p.is_visible).length;
  const archivedCount = products.filter((p) => p.is_archived).length;

  const filtered = products.filter((p) => {
    if (tab === "active" && p.is_archived) return false;
    if (tab === "featured" && (p.is_archived || !p.is_featured)) return false;
    if (tab === "hidden" && (p.is_archived || p.is_visible)) return false;
    if (tab === "archived" && !p.is_archived) return false;

    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [p.name, p.description, p.short_description]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Products</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active products ({archivedCount} in trash)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New product
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
              tab === "active"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setTab("featured")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
              tab === "featured"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            Featured ({featuredCount})
          </button>
          <button
            type="button"
            onClick={() => setTab("hidden")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
              tab === "hidden"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            Hidden ({hiddenCount})
          </button>
          <button
            type="button"
            onClick={() => setTab("archived")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
              tab === "archived"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            Trash / Archived ({archivedCount})
          </button>
        </div>

        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          <p className="text-sm">
            {tab === "archived"
              ? "Trash is empty. Deleted items will appear here."
              : "No products found matching your search or filters."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className={
                p.is_archived ? "border-amber-200 bg-amber-50/20 dark:bg-amber-950/10" : ""
              }
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {p.thumbnail_url ? (
                    <img
                      src={p.thumbnail_url}
                      alt={p.name}
                      className="h-20 w-20 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold truncate">{p.name}</p>
                      {!p.is_archived && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              toggleFeatured.mutate({ id: p.id, is_featured: !p.is_featured })
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title={p.is_featured ? "Unfeature product" : "Feature product"}
                          >
                            <Star
                              className={`h-4 w-4 ${p.is_featured ? "fill-primary text-primary" : ""}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleVisibility.mutate({ id: p.id, is_visible: !p.is_visible })
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title={p.is_visible ? "Hide product" : "Show product"}
                          >
                            {p.is_visible ? (
                              <Eye className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground opacity-50" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {p.short_description || p.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">
                        Rs. {p.sale_price ?? p.price}
                        {p.unit ? ` / ${p.unit}` : ""}
                      </Badge>
                      {p.is_archived && (
                        <Badge
                          variant="outline"
                          className="text-xs text-amber-700 border-amber-300"
                        >
                          Archived / Deleted
                        </Badge>
                      )}
                      {p.sale_price !== null && p.sale_price !== undefined && !p.is_archived && (
                        <Badge
                          variant="outline"
                          className="text-xs text-emerald-600 border-emerald-300"
                        >
                          Sale
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {p.is_archived ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => restoreProduct.mutate(p.id)}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Restore Product
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setProductToPermanentDelete(p)}
                        title="Permanently delete from database"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setProductToTrash(p)}
                        title="Delete product (move to trash)"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductDialog
        open={open}
        onClose={() => setOpen(false)}
        product={editing}
        categories={categories as { id: string; name: string }[]}
        onSave={(p) => save.mutate(p)}
      />

      {/* Confirmation Dialog: Move to Trash */}
      <AlertDialog
        open={!!productToTrash}
        onOpenChange={(isOpen) => !isOpen && setProductToTrash(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move this product to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move "{productToTrash?.name}" to Trash? It will be removed
              from your active store, but you can restore it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (productToTrash) {
                  del.mutate(productToTrash.id);
                  setProductToTrash(null);
                }
              }}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Permanent Delete */}
      <AlertDialog
        open={!!productToPermanentDelete}
        onOpenChange={(isOpen) => !isOpen && setProductToPermanentDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{productToPermanentDelete?.name}"? This
              action cannot be undone and will permanently remove it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (productToPermanentDelete) {
                  permanentDelete.mutate(productToPermanentDelete.id);
                  setProductToPermanentDelete(null);
                }
              }}
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDialog({
  open,
  onClose,
  product,
  categories,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories: { id: string; name: string }[];
  onSave: (p: Partial<Product>) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Product>>({});
  const [priceInput, setPriceInput] = useState<string>("0");
  const [salePriceInput, setSalePriceInput] = useState<string>("");
  const [sortOrderInput, setSortOrderInput] = useState<string>("0");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (product) {
      setForm({ ...product });
      setPriceInput(
        product.price !== undefined && product.price !== null ? String(product.price) : "0",
      );
      setSalePriceInput(
        product.sale_price !== null && product.sale_price !== undefined
          ? String(product.sale_price)
          : "",
      );
      setSortOrderInput(
        product.sort_order !== undefined && product.sort_order !== null
          ? String(product.sort_order)
          : "0",
      );
    } else {
      setForm({
        name: "",
        description: "",
        short_description: "",
        price: 0,
        sale_price: null,
        unit: "kg",
        category_id: null,
        thumbnail_url: null,
        is_visible: true,
        is_featured: false,
        is_archived: false,
        sort_order: 0,
      });
      setPriceInput("0");
      setSalePriceInput("");
      setSortOrderInput("0");
    }
  }, [product, open]);

  async function onImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const url = await uploadMedia(file, "products", {
        currentUrl: form.thumbnail_url ?? null,
        onProgress: (percent) => setUploadProgress(percent),
      });

      setForm((current) => ({ ...current, thumbnail_url: url }));

      if (product?.id) {
        // Update local cache first
        const cached = getCachedProducts();
        const updatedList = cached.map((item) =>
          item.id === product.id ? { ...item, thumbnail_url: url } : item,
        );
        saveCachedProducts(updatedList);

        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from("products")
              .update({ thumbnail_url: url } as never)
              .eq("id", product.id);
          } catch (e) {
            console.warn("Supabase image update warning:", e);
          }
        }
        notifyCatalogUpdated();
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["admin-products"] }),
          qc.invalidateQueries({ queryKey: ["catalog"] }),
        ]);
      }

      toast.success("Image uploaded and saved");
    } catch (err) {
      console.error("[admin/products] image upload failed", err);
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Short description</Label>
            <Textarea
              rows={2}
              value={form.short_description ?? ""}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (Rs.)</Label>
              <Input
                type="text"
                placeholder="e.g. 250 or Market Rate"
                value={priceInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setPriceInput(val);
                  const match = val.match(/[\d.]+/);
                  const num = match ? parseFloat(match[0]) : 0;
                  setForm((f) => ({ ...f, price: isNaN(num) ? 0 : num }));
                }}
              />
            </div>
            <div>
              <Label>Sale price (Rs.)</Label>
              <Input
                type="text"
                placeholder="Optional sale price"
                value={salePriceInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSalePriceInput(val);
                  if (!val.trim()) {
                    setForm((f) => ({ ...f, sale_price: null }));
                  } else {
                    const match = val.match(/[\d.]+/);
                    const num = match ? parseFloat(match[0]) : null;
                    setForm((f) => ({ ...f, sale_price: num && !isNaN(num) ? num : null }));
                  }
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit</Label>
              <Input
                value={form.unit ?? ""}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="text"
                value={sortOrderInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSortOrderInput(val);
                  const match = val.match(/\d+/);
                  const num = match ? parseInt(match[0], 10) : 0;
                  setForm((f) => ({ ...f, sort_order: isNaN(num) ? 0 : num }));
                }}
              />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.category_id ?? "none"}
              onValueChange={(value) =>
                setForm({ ...form, category_id: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorised</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Thumbnail</Label>
            <div className="flex items-center gap-3">
              {form.thumbnail_url ? (
                <img
                  src={form.thumbnail_url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                  No image
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? `Uploading… ${uploadProgress}%` : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onImage}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <Switch
                checked={!!form.is_visible}
                onCheckedChange={(value) => setForm({ ...form, is_visible: value })}
              />{" "}
              Visible
            </label>
            <label className="flex items-center gap-2">
              <Switch
                checked={!!form.is_featured}
                onCheckedChange={(value) => setForm({ ...form, is_featured: value })}
              />{" "}
              Featured
            </label>
            <label className="flex items-center gap-2">
              <Switch
                checked={!!form.is_archived}
                onCheckedChange={(value) => setForm({ ...form, is_archived: value })}
              />{" "}
              Archived
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
