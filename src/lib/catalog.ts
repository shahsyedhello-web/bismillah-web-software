import { queryOptions } from "@tanstack/react-query";
import { getCatalog } from "./catalog.functions";
import { SITE, CATEGORIES, type StockStatus } from "./site-data";
import {
  getCachedProducts,
  getCachedCategories,
  isProductDeleted,
  DUMMY_PRODUCT_SLUGS,
  fetchMasterProductsList,
  type CachedProduct,
} from "./catalog-cache";

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  costPrice?: number;
  originalPrice: number | null;
  unit: string;
  image: string | null;
  images: string[];
  brand: string;
  tags: string[];
  stockStatus: StockStatus;
  stockCount: number;
  sku: string;
  barcode?: string;
  rating: number;
  reviewCount: number;
  specifications: Record<string, string>;
  frequentlyBoughtTogether: string[];
  isNew?: boolean;
  isBestSeller?: boolean;
  featured: boolean;
  sortOrder: number;
};

export type Product = CatalogProduct;

export type Catalog = {
  products: CatalogProduct[];
  categories: string[];
};

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalog"],
  queryFn: async (): Promise<Catalog> => {
    const allMasterList = await fetchMasterProductsList(false);

    // Filter to only visible and non-archived products for public website view
    const visibleFiltered = allMasterList.filter(
      (p) =>
        p.is_visible && !p.is_archived && !isProductDeleted(p) && !DUMMY_PRODUCT_SLUGS.has(p.slug),
    );

    // Deduplicate visible list strictly by ID and Slug
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();
    const visibleCached: CachedProduct[] = [];

    for (const p of visibleFiltered) {
      const idKey = p.id;
      const slugKey = p.slug || p.id;
      if (!seenIds.has(idKey) && !seenSlugs.has(slugKey)) {
        seenIds.add(idKey);
        seenSlugs.add(slugKey);
        visibleCached.push(p);
      }
    }

    const mappedCached: CatalogProduct[] = visibleCached.map((p, idx) => {
      const mainImage = p.thumbnail_url || null;
      const images = mainImage ? [mainImage] : [];
      const stockVal = Number(p.stock_quantity ?? 50);

      return {
        id: p.id || `prod-${p.slug}`,
        slug: p.slug,
        name: p.name,
        category: p.category || "General",
        description: p.description || p.short_description || "",
        price: Number(p.price) || 0,
        costPrice: Number(p.cost_price) || Math.round((Number(p.price) || 0) * 0.75),
        originalPrice: p.sale_price ? Number(p.price) : null,
        unit: p.unit || "per unit",
        image: mainImage,
        images,
        brand: p.brand || "BMC Pure Dairy",
        tags: [p.category ? p.category.toLowerCase() : "dairy"],
        stockStatus: stockVal > 0 ? "in_stock" : "out_of_stock",
        stockCount: stockVal,
        sku: p.sku || `BMC-SKU-${idx + 1}`,
        barcode: p.barcode || p.id,
        rating: 4.8,
        reviewCount: 24,
        specifications: {},
        frequentlyBoughtTogether: [],
        isNew: false,
        isBestSeller: false,
        featured: p.is_featured ?? true,
        sortOrder: p.sort_order ?? idx,
      };
    });

    const cachedCats = getCachedCategories();
    const categoriesList = cachedCats.filter((c) => c.is_visible).map((c) => c.name);

    return {
      categories: categoriesList,
      products: mappedCached,
    };
  },
  staleTime: 0,
  gcTime: 5 * 60_000,
});

export function formatPrice(price: number) {
  return price > 0 ? `Rs. ${price.toLocaleString("en-PK")}` : "Rs. 0 (Rate + Tax)";
}

export function whatsappOrderLink(productName: string, quantity = 1, whatsappNum?: string) {
  const clean = whatsappNum ? whatsappNum.replace(/[^0-9]/g, "") : SITE.whatsapp;
  const message = `Assalam-o-Alaikum Bismillah Milk Corner,\n\nI want to order:\n• ${productName} (Qty: ${quantity})\n\nPlease share current price and delivery confirmation. Thank you!`;
  return `https://wa.me/${clean || SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function whatsappCartOrderLink(
  items: { product: CatalogProduct; quantity: number }[],
  total: number,
  whatsappNum?: string,
) {
  const clean = whatsappNum ? whatsappNum.replace(/[^0-9]/g, "") : SITE.whatsapp;
  const itemsText = items
    .map(
      (item, i) =>
        `${i + 1}. ${item.product.name} — Qty: ${item.quantity} (${formatPrice(item.product.price * item.quantity)})`,
    )
    .join("\n");

  const message = `Assalam-o-Alaikum Bismillah Milk Corner,\n\nI would like to place an order from my website cart:\n\n${itemsText}\n\n*Estimated Total: ${formatPrice(total)}*\n\nPlease confirm availability and delivery slot.`;
  return `https://wa.me/${clean || SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}
