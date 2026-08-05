import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site-data";
import { whatsappOrderLink, whatsappCartOrderLink, type CatalogProduct } from "@/lib/catalog";

export function cleanWhatsappNumber(raw?: string | null): string {
  if (!raw) return SITE.whatsapp;
  // Strip out everything except digits
  let clean = raw.replace(/[^0-9]/g, "");
  if (!clean) return SITE.whatsapp;
  // If user entered local Pakistani format like 03132025005 (11 digits starting with 03)
  if (clean.length === 11 && clean.startsWith("03")) {
    clean = "92" + clean.slice(1);
  }
  // If user entered 3132025005 (10 digits starting with 3)
  if (clean.length === 10 && clean.startsWith("3")) {
    clean = "92" + clean;
  }
  return clean;
}

export function getLocalCachedSettings(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("bmc_site_settings_cache");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalCachedSettings(settings: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("bmc_site_settings_cache", JSON.stringify(settings));
    window.dispatchEvent(new Event("site_settings_updated"));
  } catch (e) {
    console.error("Failed to save local cached settings:", e);
  }
}

export type SiteSettingsData = {
  shopName: string;
  phone: string;
  phones: string[];
  whatsapp: string;
  cleanWhatsapp: string;
  whatsappLink: string;
  phoneLink: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  footerText: string;
  hours: string;
};

export type SiteSettingsObject = {
  shop_name: string;
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  google_maps_url: string;
  footer_text: string;
};

type SiteSettingsContextType = SiteSettingsData & {
  settings: SiteSettingsObject;
  isLoading: boolean;
  getWhatsappOrderLink: (productName: string, quantity?: number) => string;
  getWhatsappCartOrderLink: (
    items: { product: CatalogProduct; quantity: number }[],
    total: number,
  ) => string;
  getWhatsappCustomLink: (message: string) => string;
  getWhatsAppUrl: (message: string) => string;
};

const SiteSettingsContext = createContext<SiteSettingsContextType | null>(null);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [cached, setCached] = useState<Record<string, string> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("site_settings")
            .select("*")
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            saveLocalCachedSettings(data as Record<string, unknown>);
            return data as Record<string, string>;
          }
        } catch (err) {
          console.warn("[site_settings] Fetch exception:", err);
        }
      }
      return getLocalCachedSettings();
    },
    staleTime: 5_000,
  });

  // Realtime subscription & local storage event updates
  useEffect(() => {
    setCached(getLocalCachedSettings());

    const handleUpdate = () => {
      setCached(getLocalCachedSettings());
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("site_settings_updated", handleUpdate);
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel("public:site_settings")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "site_settings" },
          handleUpdate,
        )
        .subscribe();
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("site_settings_updated", handleUpdate);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  const activeSettings = data || cached;

  const shopName = activeSettings?.shop_name || SITE.name;
  const rawWhatsapp = activeSettings?.whatsapp || SITE.whatsapp;
  const cleanWhatsapp = cleanWhatsappNumber(rawWhatsapp);
  const whatsappLink = `https://wa.me/${cleanWhatsapp}`;

  const rawPhone = activeSettings?.phone;
  const phones = rawPhone
    ? rawPhone
        .split(/[,;\n/]/)
        .map((p) => p.trim())
        .filter(Boolean)
    : SITE.phones;
  const phone = phones[0] || SITE.phones[0];
  const phoneDigits = phone.replace(/[^0-9+]/g, "");
  const phoneLink = `tel:${phoneDigits}`;

  const email = activeSettings?.email || SITE.email;
  const address = activeSettings?.address || SITE.address;
  const googleMapsUrl = activeSettings?.google_maps_url || SITE.mapEmbed;
  const footerText = activeSettings?.footer_text || "";

  const settings: SiteSettingsObject = {
    shop_name: shopName,
    phone,
    email,
    address,
    whatsapp: rawWhatsapp,
    google_maps_url: googleMapsUrl,
    footer_text: footerText,
  };

  const value: SiteSettingsContextType = {
    shopName,
    phone,
    phones,
    whatsapp: rawWhatsapp,
    cleanWhatsapp,
    whatsappLink,
    phoneLink,
    email,
    address,
    googleMapsUrl,
    footerText,
    hours: SITE.hours,
    settings,
    isLoading,
    getWhatsappOrderLink: (productName: string, quantity = 1) =>
      whatsappOrderLink(productName, quantity, cleanWhatsapp),
    getWhatsappCartOrderLink: (items, total) => whatsappCartOrderLink(items, total, cleanWhatsapp),
    getWhatsappCustomLink: (message: string) =>
      `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(message)}`,
    getWhatsAppUrl: (message: string) =>
      `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(message)}`,
  };

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettingsContextType {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    const rawWhatsapp = SITE.whatsapp;
    const cleanWhatsapp = cleanWhatsappNumber(rawWhatsapp);
    const phones = SITE.phones;
    const phone = phones[0];

    const fallbackSettings: SiteSettingsObject = {
      shop_name: SITE.name,
      phone,
      email: SITE.email,
      address: SITE.address,
      whatsapp: rawWhatsapp,
      google_maps_url: SITE.mapEmbed,
      footer_text: "",
    };

    return {
      shopName: SITE.name,
      phone,
      phones,
      whatsapp: rawWhatsapp,
      cleanWhatsapp,
      whatsappLink: `https://wa.me/${cleanWhatsapp}`,
      phoneLink: `tel:${phone.replace(/[^0-9+]/g, "")}`,
      email: SITE.email,
      address: SITE.address,
      googleMapsUrl: SITE.mapEmbed,
      footerText: "",
      hours: SITE.hours,
      settings: fallbackSettings,
      isLoading: false,
      getWhatsappOrderLink: (productName: string, quantity = 1) =>
        whatsappOrderLink(productName, quantity, cleanWhatsapp),
      getWhatsappCartOrderLink: (items, total) =>
        whatsappCartOrderLink(items, total, cleanWhatsapp),
      getWhatsappCustomLink: (message: string) =>
        `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(message)}`,
      getWhatsAppUrl: (message: string) =>
        `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(message)}`,
    };
  }
  return context;
}
