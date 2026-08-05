import { CATEGORIES } from "./site-data";
import { slugify } from "./admin";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export type CachedProduct = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  cost_price: number;
  sale_price: number | null;
  tax: number;
  unit: string | null;
  category_id: string | null;
  category: string;
  brand: string;
  thumbnail_url: string | null;
  images: string[];
  min_stock: number;
  reorder_level: number;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  supplier_id: string | null;
  is_featured: boolean;
  is_visible: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CachedCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
};

const PRODUCTS_KEY = "bmc_custom_products_cache";
const CATEGORIES_KEY = "bmc_custom_categories_cache";
const DELETED_PRODUCTS_KEY = "bmc_deleted_products_cache";

export const DUMMY_PRODUCT_SLUGS = new Set<string>();

export function getDeletedProductKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addDeletedProductKey(key: string) {
  if (typeof window === "undefined" || !key) return;
  try {
    const keys = getDeletedProductKeys();
    if (!keys.includes(key)) {
      keys.push(key);
      localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(keys));
    }
  } catch (e) {
    console.error("Failed adding deleted product key", e);
  }
}

export function removeDeletedProductKey(key: string) {
  if (typeof window === "undefined" || !key) return;
  try {
    const keys = getDeletedProductKeys();
    const filtered = keys.filter((k) => k !== key && !k.includes(key) && !key.includes(k));
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed removing deleted product key", e);
  }
}

export function isProductDeleted(product: { id: string; slug: string }): boolean {
  const deletedKeys = getDeletedProductKeys();
  if (!deletedKeys.length) return false;
  const targetSlug = product.slug || product.id.replace(/^(static|prod)-/, "");
  return deletedKeys.some(
    (k) =>
      k === product.id ||
      k === product.slug ||
      k === targetSlug ||
      product.id === `static-${k}` ||
      product.id === `prod-${k}` ||
      product.slug === k.replace(/^(static|prod)-/, ""),
  );
}

export const INITIAL_MASTER_PRODUCTS: CachedProduct[] = [];

export function getInitialDefaultProducts(): CachedProduct[] {
  return [];
}

export function getInitialDefaultCategories(): CachedCategory[] {
  return [];
}

const LEGACY_DEMO_KEYS = new Set([
  "prod-fresh-milk",
  "fresh-milk",
  "prod-artisanal-yogurt",
  "yogurt",
  "prod-authentic-khoya",
  "authentic-khoya",
  "prod-desi-butter",
  "desi-butter",
  "prod-fresh-paneer",
  "fresh-paneer",
  "prod-fresh-malai-cream",
  "fresh-malai-cream",
  "prod-roll-patti",
  "roll-patti",
  "prod-crunchy-papri",
  "crunchy-papri",
  "prod-organic-desi-ghee",
  "organic-desi-ghee",
  "prod-farm-eggs",
  "farm-eggs",
]);

export function getCachedProducts(includeArchived = false): CachedProduct[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    let list: CachedProduct[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    }

    // Filter out legacy demo items and deleted products
    const filteredList = list.filter((p) => {
      if (!p || typeof p !== "object") return false;
      const idKey = p.id || "";
      const slugKey = p.slug || "";
      if (LEGACY_DEMO_KEYS.has(idKey) || LEGACY_DEMO_KEYS.has(slugKey)) return false;
      if (isProductDeleted(p)) return false;
      return true;
    });

    // Ensure all products have standardized master fields
    const sanitized = filteredList.map((p, idx) => {
      const stock = Number(
        (p as Record<string, unknown>).stock_quantity ?? (p as Record<string, unknown>).stock ?? 50,
      );
      const cost = Number(p.cost_price ?? Math.round(Number(p.price || 0) * 0.75));
      const skuVal = p.sku || `BMC-SKU-${idx + 1}`;
      const barcodeVal = p.barcode || p.id || `8964000${1000 + idx}`;
      return {
        ...p,
        sku: skuVal,
        barcode: barcodeVal,
        cost_price: cost,
        stock_quantity: stock,
        available_stock: Math.max(0, stock - (p.reserved_stock || 0)),
        is_archived: Boolean(p.is_archived),
        is_visible: p.is_visible !== undefined ? Boolean(p.is_visible) : true,
        is_featured: p.is_featured !== undefined ? Boolean(p.is_featured) : false,
      };
    });

    // Deduplicate list by ID and Slug strictly
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();
    const uniqueList: CachedProduct[] = [];

    for (const p of sanitized) {
      const idKey = p.id;
      const slugKey = p.slug || p.id;
      if (!seenIds.has(idKey) && !seenSlugs.has(slugKey)) {
        seenIds.add(idKey);
        seenSlugs.add(slugKey);
        uniqueList.push(p);
      }
    }

    const finalFiltered = uniqueList.filter((p) => {
      if (DUMMY_PRODUCT_SLUGS.has(p.slug) || DUMMY_PRODUCT_SLUGS.has(p.id)) return false;
      if (isProductDeleted(p)) return false;
      if (!includeArchived && p.is_archived) return false;
      return true;
    });

    // Clean up localStorage if legacy items or duplicate items existed
    if (uniqueList.length !== list.length) {
      try {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(uniqueList));
      } catch {
        // ignore
      }
    }

    return finalFiltered;
  } catch {
    return [];
  }
}

export function saveCachedProducts(products: CachedProduct[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event("catalog_updated"));
    window.dispatchEvent(new Event("inventory_updated"));
    window.dispatchEvent(new Event("stock_updated"));
  } catch (e) {
    console.error("Failed saving cached products", e);
  }
}

export function getCachedCategories(): CachedCategory[] {
  let saved: CachedCategory[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CATEGORIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) saved = parsed;
      }
    } catch {
      // ignore
    }
  }

  // Auto-derive categories from active master products
  const products = getCachedProducts(true);
  const derivedNames = new Set<string>();
  products.forEach((p) => {
    if (p.category && p.category.trim() && !p.is_archived) {
      derivedNames.add(p.category.trim());
    }
  });

  const savedMap = new Map(saved.map((c) => [c.name.toLowerCase().trim(), c]));
  const combined: CachedCategory[] = [...saved];

  let idx = combined.length;
  derivedNames.forEach((catName) => {
    const key = catName.toLowerCase().trim();
    if (!savedMap.has(key)) {
      combined.push({
        id: `cat-${slugify(catName)}`,
        name: catName,
        slug: slugify(catName),
        description: null,
        sort_order: idx++,
        is_visible: true,
      });
    }
  });

  return combined;
}

export function saveCachedCategories(categories: CachedCategory[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event("catalog_updated"));
    window.dispatchEvent(new Event("inventory_updated"));
    window.dispatchEvent(new Event("stock_updated"));
  } catch (e) {
    console.error("Failed saving cached categories", e);
  }
}

export function notifyCatalogUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("catalog_updated"));
  window.dispatchEvent(new Event("inventory_updated"));
  window.dispatchEvent(new Event("stock_updated"));
}

export async function fetchMasterProductsList(includeArchived = true): Promise<CachedProduct[]> {
  let remoteProducts: CachedProduct[] = [];
  let hasRemote = false;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, description, short_description, price, sale_price, unit, category_id, thumbnail_url, is_featured, is_visible, is_archived, sort_order",
        )
        .order("sort_order")
        .order("name");
      if (!error && data) {
        remoteProducts = data as unknown as CachedProduct[];
        hasRemote = true;
      }
    } catch (err) {
      console.warn("[catalog-cache] Supabase query failed, falling back to local master repo", err);
    }
  }

  const cached = getCachedProducts(true);
  const cachedBySlug = new Map(cached.map((c) => [c.slug, c]));
  const cachedById = new Map(cached.map((c) => [c.id, c]));

  if (hasRemote) {
    const mergedRemote = remoteProducts
      .filter((p) => !isProductDeleted(p))
      .map((p) => {
        const targetSlug = p.slug || p.id.replace(/^(static|prod)-/, "");
        const local =
          cachedBySlug.get(p.slug) || cachedBySlug.get(targetSlug) || cachedById.get(p.id);
        if (local) {
          const isArchived = Boolean(p.is_archived || local.is_archived);
          const isVisible = isArchived
            ? false
            : local.is_visible !== undefined
              ? local.is_visible
              : p.is_visible;
          return {
            ...p,
            is_archived: isArchived,
            is_visible: isVisible,
            is_featured: local.is_featured ?? p.is_featured,
          };
        }
        return p;
      });

    const remoteSlugs = new Set(remoteProducts.map((r) => r.slug));
    const remoteIds = new Set(remoteProducts.map((r) => r.id));

    const extraLocal = cached.filter(
      (c) =>
        !remoteSlugs.has(c.slug) &&
        !remoteIds.has(c.id) &&
        !isProductDeleted(c) &&
        !DUMMY_PRODUCT_SLUGS.has(c.slug) &&
        !DUMMY_PRODUCT_SLUGS.has(c.id),
    );

    const rawCombined = [...mergedRemote, ...extraLocal];
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();
    const deduped: CachedProduct[] = [];
    for (const p of rawCombined) {
      const idKey = p.id;
      const slugKey = p.slug || p.id;
      if (!seenIds.has(idKey) && !seenSlugs.has(slugKey)) {
        seenIds.add(idKey);
        seenSlugs.add(slugKey);
        deduped.push(p);
      }
    }
    return includeArchived ? deduped : deduped.filter((p) => !p.is_archived);
  }

  const rawCached = cached.filter((p) => !isProductDeleted(p));
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const deduped: CachedProduct[] = [];
  for (const p of rawCached) {
    const idKey = p.id;
    const slugKey = p.slug || p.id;
    if (!seenIds.has(idKey) && !seenSlugs.has(slugKey)) {
      seenIds.add(idKey);
      seenSlugs.add(slugKey);
      deduped.push(p);
    }
  }

  return includeArchived ? deduped : deduped.filter((p) => !p.is_archived);
}
