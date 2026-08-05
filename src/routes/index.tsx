import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldCheck,
  Truck,
  BadgeCheck,
  Star,
  Download,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from "lucide-react";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getCachedBanners, getCachedTestimonials } from "@/lib/cms-cache";
import { SITE, HERO_IMAGE, STATS, CLIENTS, GALLERY } from "@/lib/site-data";
import { catalogQueryOptions } from "@/lib/catalog";
import { SectionHeading } from "@/components/section-heading";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE.name} — Fresh Dairy & Bakery Supplier in Karachi` },
      {
        name: "description",
        content:
          "Premium fresh milk, yogurt, khoya, roll patti and samosas — reliably supplied to Karachi's leading clubs, hotels and restaurants. Request a quote today.",
      },
      { property: "og:title", content: `${SITE.name} — ${SITE.tagline}` },
      { property: "og:description", content: SITE.description },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions);
  },
  component: HomePage,
});

const WHY = [
  {
    icon: ShieldCheck,
    title: "Uncompromising quality",
    body: "Every batch is inspected at multiple stages — from sourcing to delivery.",
  },
  {
    icon: Truck,
    title: "Reliable daily delivery",
    body: "Consistent supply and flexible schedules for high-volume kitchens.",
  },
  {
    icon: BadgeCheck,
    title: "Trusted by top clubs",
    body: "Serving Beach View Club, Creek Club and Marina Club, day in and day out.",
  },
  {
    icon: Sparkles,
    title: "Fair, transparent pricing",
    body: "Clear per-unit rates with no hidden fees — quoted upfront.",
  },
];

const INDUSTRIES = [
  "Hotels & Restaurants",
  "Private Clubs",
  "Bakeries & Sweet Shops",
  "Catering Services",
  "Cafés & Tea Houses",
  "Institutional Kitchens",
];

function HomePage() {
  const qc = useQueryClient();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions);
  const displayProducts = catalog.products;

  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Banners query
  const { data: banners = [] } = useQuery({
    queryKey: ["homepage-banners"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("banners")
            .select("*")
            .eq("is_visible", true)
            .order("sort_order");
          if (!error && data && data.length > 0) return data;
        } catch (e) {
          console.warn("Supabase banners query error:", e);
        }
      }
      return getCachedBanners().filter((b) => b.is_visible);
    },
  });

  // Testimonials query
  const { data: testimonials = [] } = useQuery({
    queryKey: ["homepage-testimonials"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("testimonials")
            .select("*")
            .eq("is_visible", true)
            .order("sort_order");
          if (!error && data && data.length > 0) return data;
        } catch (e) {
          console.warn("Supabase testimonials query error:", e);
        }
      }
      return getCachedTestimonials().filter((t) => t.is_visible);
    },
  });

  useEffect(() => {
    const handleBannersUpdate = () => qc.invalidateQueries({ queryKey: ["homepage-banners"] });
    const handleTestisUpdate = () => qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });

    window.addEventListener("banners_updated", handleBannersUpdate);
    window.addEventListener("testimonials_updated", handleTestisUpdate);
    return () => {
      window.removeEventListener("banners_updated", handleBannersUpdate);
      window.removeEventListener("testimonials_updated", handleTestisUpdate);
    };
  }, [qc]);

  const currentBanner = banners.length > 0 ? banners[activeBannerIdx % banners.length] : null;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.94_0.04_100)_0%,transparent_70%)]" />
        <div className="container-page grid gap-12 py-16 md:py-24 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            <p className="eyebrow">Karachi · Since day one</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] text-foreground sm:text-5xl md:text-6xl lg:text-[4.5rem]">
              Fresh dairy, delivered with <span className="text-primary">integrity.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Bismillah Milk Corner is Karachi's trusted supplier of fresh milk, yogurt, khoya and
              everyday kitchen essentials — chosen by the city's most demanding clubs and
              restaurants.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/quote"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5"
              >
                Request a Quotation
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-accent"
              >
                View products
              </Link>
            </div>
            <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </dt>
                  <dd className="mt-1 font-display text-3xl text-primary">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/15 to-gold/20 blur-2xl" />
            <img
              src={HERO_IMAGE}
              alt="Fresh milk being poured into a glass, symbolising Bismillah Milk Corner's commitment to freshness"
              width={1600}
              height={1200}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-[var(--shadow-elegant)] ring-1 ring-border"
            />
            <div className="absolute -bottom-6 left-6 rounded-2xl bg-card px-5 py-4 shadow-[var(--shadow-elegant)] ring-1 ring-border">
              <div className="flex items-center gap-2 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">
                Trusted supplier to elite clubs
              </p>
              <p className="text-xs text-muted-foreground">Beach View · Creek · Marina</p>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Banners Carousel / Showcase */}
      {banners.length > 0 && currentBanner && (
        <section className="container-page py-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/90 to-primary text-primary-foreground p-8 md:p-12 shadow-[var(--shadow-elegant)] ring-1 ring-border">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3.5 py-1 text-xs font-semibold text-gold">
                  <Megaphone className="h-3.5 w-3.5" />
                  Special Announcement
                </div>
                <h2 className="font-display text-3xl md:text-4xl text-primary-foreground">
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p className="text-sm md:text-base text-primary-foreground/90 leading-relaxed max-w-xl">
                    {currentBanner.subtitle}
                  </p>
                )}
                {currentBanner.cta_label && (
                  <div className="pt-2">
                    <Link
                      to={currentBanner.cta_href || "/products"}
                      className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground shadow-md transition-transform hover:-translate-y-0.5"
                    >
                      {currentBanner.cta_label} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>

              {currentBanner.image_url && (
                <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/20 shadow-xl max-h-72">
                  <img
                    src={currentBanner.image_url}
                    alt={currentBanner.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {banners.length > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-primary-foreground/15 pt-4">
                <div className="flex gap-1.5">
                  {banners.map((b, idx) => (
                    <button
                      key={b.id}
                      onClick={() => setActiveBannerIdx(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === activeBannerIdx % banners.length
                          ? "w-8 bg-gold"
                          : "w-2 bg-primary-foreground/30 hover:bg-primary-foreground/50"
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setActiveBannerIdx((prev) => (prev - 1 + banners.length) % banners.length)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
                    aria-label="Previous banner"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setActiveBannerIdx((prev) => (prev + 1) % banners.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
                    aria-label="Next banner"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Intro */}
      <section className="container-page py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-2 md:items-end">
          <SectionHeading
            eyebrow="Who we are"
            title="A dairy partner Karachi's kitchens actually rely on."
          />
          <p className="text-base leading-relaxed text-muted-foreground md:pl-6">
            From the first delivery of the morning to the last of the evening, Bismillah Milk Corner
            supplies premium milk, yogurt, khoya and bakery essentials with the same care we give
            our own kitchen. We're a small team obsessed with freshness, consistency, and honest
            service.
          </p>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container-page pb-16 md:pb-24">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Products"
            title="Our dairy & gourmet selection"
            description="Our full line-up supplied to Karachi's commercial and household kitchens."
          />
          <Link
            to="/products"
            className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            View all products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {displayProducts.length ? (
            displayProducts.map((p) => <ProductCard key={p.id || p.slug} product={p} />)
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
              No products are available right now. Browse the full catalog for the latest
              availability.
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-page py-20 md:py-28">
          <SectionHeading
            eyebrow="Why choose us"
            title={
              <>
                Built on quality,
                <br />
                delivered with care.
              </>
            }
          />
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <div
                key={w.title}
                className="rounded-3xl bg-primary-foreground/5 p-7 ring-1 ring-primary-foreground/10"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/20 text-gold">
                  <w.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-6 font-display text-xl text-primary-foreground">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="container-page py-20 md:py-28">
        <SectionHeading
          eyebrow="Industries we serve"
          title="From private clubs to neighbourhood bakeries."
        />
        <div className="mt-10 flex flex-wrap gap-3">
          {INDUSTRIES.map((i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground"
            >
              {i}
            </span>
          ))}
        </div>
        <div className="mt-14 rounded-3xl bg-accent p-8 ring-1 ring-border md:p-12">
          <p className="eyebrow text-accent-foreground/70">Proud to serve</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-4">
            {CLIENTS.map((c) => (
              <p key={c} className="font-display text-2xl text-primary md:text-3xl">
                {c}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="container-page pb-20 md:pb-28">
        <SectionHeading
          eyebrow="Watch"
          title="A closer look at Bismillah Milk Corner"
          description="A short film about our commitment to freshness, quality control and long-term partnerships."
        />
        <div className="mt-10 overflow-hidden rounded-3xl bg-black shadow-[var(--shadow-elegant)] ring-1 ring-border">
          <video
            controls
            autoPlay
            muted
            loop
            preload="auto"
            playsInline
            poster={HERO_IMAGE}
            className="aspect-video w-full object-cover"
          >
            <source src="/bmc-video.mp4" type="video/mp4" />
            <source src="/hero-video.mp4" type="video/mp4" />
            <source src={SITE.video} type="video/mp4" />
            <track kind="captions" />
          </video>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="container-page pb-20 md:pb-28">
        <div className="rounded-3xl bg-card p-8 shadow-[var(--shadow-soft)] ring-1 ring-border md:p-12">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Customer reviews</p>
              <h2 className="mt-3 font-display text-3xl text-foreground md:text-4xl">
                Rated by our partners
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                We're proud of the long-standing relationships we've built with Karachi's clubs,
                hotels and restaurants.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 md:items-end">
              <div className="flex items-center gap-1 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-current" aria-hidden="true" />
                ))}
              </div>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
              >
                Ask for references
              </Link>
            </div>
          </div>

          {/* Testimonials List */}
          {testimonials.length > 0 && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 border-t border-border pt-8">
              {testimonials.map((t) => (
                <div key={t.id} className="rounded-2xl bg-muted/40 p-6 ring-1 ring-border/60">
                  <div className="flex items-center gap-1 text-gold mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 italic leading-relaxed">"{t.quote}"</p>
                  <div className="mt-4 pt-3 border-t border-border/40">
                    <p className="font-semibold text-sm text-foreground">{t.name}</p>
                    {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Company profile + Video CTA */}
      <section className="container-page pb-20 md:pb-28">
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            to="/company-profile"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/90 p-8 text-primary-foreground shadow-[var(--shadow-elegant)] md:p-10"
          >
            <div>
              <p className="eyebrow text-gold">Company profile</p>
              <h3 className="mt-3 font-display text-2xl md:text-3xl">
                Everything about who we are, what we supply, and how we work.
              </h3>
            </div>
            <span className="mt-8 inline-flex items-center gap-2 self-start rounded-full bg-primary-foreground/10 px-5 py-3 text-sm font-semibold ring-1 ring-primary-foreground/20 transition-transform group-hover:-translate-y-0.5">
              <Download className="h-4 w-4" /> View & download
            </span>
          </Link>
          <Link
            to="/quote"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gold p-8 text-gold-foreground shadow-[var(--shadow-elegant)] md:p-10"
          >
            <div>
              <p className="eyebrow text-primary">Get started</p>
              <h3 className="mt-3 font-display text-2xl text-primary md:text-3xl">
                Ready to switch to a supplier your kitchen can trust?
              </h3>
            </div>
            <span className="mt-8 inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform group-hover:-translate-y-0.5">
              Request a quotation <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* Gallery preview */}
      <section className="container-page pb-24 md:pb-32">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading eyebrow="Gallery" title="From our kitchen to yours" />
          <Link
            to="/gallery"
            className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            See full gallery <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {GALLERY.map((g) => (
            <img
              key={g.src}
              src={g.src}
              alt={g.alt}
              width={800}
              height={800}
              loading="lazy"
              className="aspect-square w-full rounded-2xl object-cover ring-1 ring-border"
            />
          ))}
        </div>
      </section>
    </>
  );
}
