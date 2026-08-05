export type CachedBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
};

export type CachedTestimonial = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number;
  is_visible: boolean;
  sort_order: number;
};

export type CachedSection = {
  id: string;
  key: string;
  heading: string | null;
  subheading: string | null;
  body: string | null;
  image_url: string | null;
  is_visible: boolean;
};

const BANNERS_KEY = "bmc_custom_banners_cache";
const TESTIMONIALS_KEY = "bmc_custom_testimonials_cache";
const HOMEPAGE_KEY = "bmc_custom_homepage_cache";

export function getCachedBanners(): CachedBanner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BANNERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedBanners(banners: CachedBanner[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BANNERS_KEY, JSON.stringify(banners));
    window.dispatchEvent(new Event("banners_updated"));
  } catch (e) {
    console.error("Failed saving cached banners", e);
  }
}

export function getCachedTestimonials(): CachedTestimonial[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TESTIMONIALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedTestimonials(testimonials: CachedTestimonial[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TESTIMONIALS_KEY, JSON.stringify(testimonials));
    window.dispatchEvent(new Event("testimonials_updated"));
  } catch (e) {
    console.error("Failed saving cached testimonials", e);
  }
}

export function getCachedHomepageSections(): CachedSection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HOMEPAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedHomepageSections(sections: CachedSection[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HOMEPAGE_KEY, JSON.stringify(sections));
    window.dispatchEvent(new Event("homepage_updated"));
  } catch (e) {
    console.error("Failed saving cached homepage sections", e);
  }
}
