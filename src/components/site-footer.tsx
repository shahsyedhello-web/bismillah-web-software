import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { SITE } from "@/lib/site-data";
import { useSiteSettings } from "@/context/site-settings-context";
import { getCachedCategories } from "@/lib/catalog-cache";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export function SiteFooter() {
  const qc = useQueryClient();
  const { shopName, whatsappLink, phones, email, address, hours, footerText } = useSiteSettings();

  const { data: categories = [] } = useQuery({
    queryKey: ["footer-categories"],
    queryFn: async () => {
      let catList: { id: string; name: string; slug: string }[] = [];
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("categories")
            .select("id, name, slug")
            .order("sort_order");
          if (!error && data && data.length > 0) catList = data;
        } catch (e) {
          console.warn("Footer categories Supabase error:", e);
        }
      }
      if (catList.length === 0) {
        catList = getCachedCategories().map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
      }
      return catList;
    },
  });

  useEffect(() => {
    const handleSync = () => qc.invalidateQueries({ queryKey: ["footer-categories"] });
    window.addEventListener("catalog_updated", handleSync);
    return () => window.removeEventListener("catalog_updated", handleSync);
  }, [qc]);

  return (
    <footer className="mt-24 border-t border-border/70 bg-primary text-primary-foreground">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={SITE.logo}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-primary-foreground/20"
            />
            <div>
              <p className="font-display text-xl">{shopName}</p>
              <p className="text-xs uppercase tracking-widest text-primary-foreground/70">
                {SITE.tagline}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-primary-foreground/80 leading-relaxed">
            {footerText ||
              "Premium fresh dairy, bakery ingredients and everyday staples, delivered reliably to restaurants, hotels and clubs across Karachi."}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-gold">Explore</h4>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              { to: "/about", label: "About Us" },
              { to: "/products", label: "Our Products" },
              { to: "/gallery", label: "Gallery" },
              { to: "/company-profile", label: "Company Profile" },
              { to: "/quote", label: "Request Quotation" },
            ].map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-primary-foreground/85 transition-colors hover:text-gold"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-gold">Categories</h4>
          <ul className="mt-5 space-y-2.5 text-sm">
            {(categories.length > 0
              ? categories.slice(0, 6)
              : [
                  { name: "Fresh Milk & Dairy", slug: "fresh-milk-dairy" },
                  { name: "Khoya & Sweets Base", slug: "khoya-sweets-base" },
                  { name: "Dahi & Yogurt", slug: "dahi-yogurt" },
                  { name: "Desi Ghee & Butter", slug: "desi-ghee-butter" },
                  { name: "Roll Patti & Bakery", slug: "roll-patti-bakery" },
                ]
            ).map((cat) => (
              <li key={cat.slug || cat.name}>
                <Link
                  to="/products"
                  search={{ category: cat.name }}
                  className="text-primary-foreground/85 transition-colors duration-150 hover:text-gold"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-gold">Contact</h4>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span className="text-primary-foreground/85">{address}</span>
            </li>
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span className="flex flex-col gap-0.5">
                {phones.map((p) => (
                  <a
                    key={p}
                    href={`tel:${p.replace(/[^0-9+]/g, "")}`}
                    className="text-primary-foreground/85 hover:text-gold"
                  >
                    {p}
                  </a>
                ))}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <a
                href={`mailto:${email}`}
                className="text-primary-foreground/85 hover:text-gold break-all"
              >
                {email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span className="text-primary-foreground/85">{hours}</span>
            </li>
          </ul>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground transition-transform hover:-translate-y-0.5"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs text-primary-foreground/70 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {shopName}. All rights reserved.
          </p>
          <p>Karachi · Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
