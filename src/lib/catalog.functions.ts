import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CATEGORIES } from "@/lib/site-data";

function getFallbackCatalog() {
  return null;
}

function getSupabaseRuntimeConfig() {
  const url = [import.meta.env?.VITE_SUPABASE_URL, process.env.SUPABASE_URL].find(
    (value): value is string => Boolean(value && value.trim()),
  );
  const key = [
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY,
    import.meta.env?.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
  ].find((value): value is string => Boolean(value && value.trim()));

  if (!url || !key) {
    return null;
  }

  if (
    url.includes("your-supabase-project") ||
    url.includes("placeholder") ||
    url.includes("example") ||
    key.includes("placeholder") ||
    key.includes("your-")
  ) {
    return null;
  }

  return { url, key };
}

function publicClient() {
  const config = getSupabaseRuntimeConfig();
  if (!config) return null;
  const { url, key } = config;
  console.info("[catalog] initializing public Supabase client", {
    url,
    publishableKeyPrefix: key.slice(0, 12),
  });

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "";
}

async function getProductImageMap(supabase: ReturnType<typeof publicClient>, productIds: string[]) {
  if (!supabase || !productIds.length) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("product_images")
    .select("product_id,url")
    .in("product_id", productIds);

  if (error) {
    console.warn("[catalog] product_images lookup failed", error);
    return new Map<string, string>();
  }

  const imageMap = new Map<string, string>();
  for (const item of (data ?? []) as Array<{ product_id: string | null; url: string | null }>) {
    const productId = normalizeText(item.product_id ?? undefined);
    const imageUrl = normalizeText(item.url ?? undefined);

    if (productId && imageUrl && !imageMap.has(productId)) {
      imageMap.set(productId, imageUrl);
    }
  }

  return imageMap;
}

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = publicClient();
    if (!supabase) {
      console.warn("[catalog] Supabase not configured; returning fallback catalog.");
      return getFallbackCatalog();
    }

    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, slug, description, short_description, price, sale_price, unit, thumbnail_url, is_featured, sort_order, category_id",
        )
        .eq("is_visible", true)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, slug, sort_order")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (productsResult.error) {
      console.warn("[catalog] products query failed, using fallback", productsResult.error);
      return getFallbackCatalog();
    }

    if (categoriesResult.error) {
      console.warn("[catalog] categories query failed, using fallback", categoriesResult.error);
      return getFallbackCatalog();
    }

    const categoryMap = new Map(
      (categoriesResult.data ?? []).map((category) => [category.id, category.name as string]),
    );

    const productIds = (productsResult.data ?? []).map((product) => product.id as string);
    const productImageMap = await getProductImageMap(supabase, productIds);

    return {
      categories: (categoriesResult.data ?? []).map((category) => category.name as string),
      products: (productsResult.data ?? []).map((product) => {
        const description =
          normalizeText(product.description as string | null | undefined) ||
          normalizeText(product.short_description as string | null | undefined) ||
          "Description coming soon.";

        const basePrice = Number(product.price ?? 0);
        const salePrice = Number(product.sale_price ?? 0);
        const effectivePrice = salePrice > 0 ? salePrice : basePrice;
        const originalPrice =
          basePrice > 0 && salePrice > 0 && salePrice < basePrice ? basePrice : null;
        const imageCandidates = [
          normalizeText(product.thumbnail_url as string | null),
          productImageMap.get(product.id as string) ?? "",
        ];
        const image = imageCandidates.find(Boolean) || null;

        return {
          id: product.id as string,
          slug: product.slug as string,
          name: product.name as string,
          category:
            (product.category_id ? categoryMap.get(product.category_id) : null) ?? "General",
          description,
          price: effectivePrice,
          originalPrice,
          unit: normalizeText(product.unit as string | null),
          image,
          featured: Boolean(product.is_featured),
          sortOrder: Number(product.sort_order ?? 0),
        };
      }),
    };
  } catch (error) {
    console.warn("[catalog] getCatalog failed, returning fallback catalog", error);
    return getFallbackCatalog();
  }
});
