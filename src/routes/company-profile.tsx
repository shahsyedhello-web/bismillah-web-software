import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle, ArrowRight, Phone, MapPin, Clock } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SITE, HERO_IMAGE, CLIENTS } from "@/lib/site-data";
import { useSiteSettings } from "@/context/site-settings-context";
import { catalogQueryOptions, formatPrice } from "@/lib/catalog";
import { SectionHeading } from "@/components/section-heading";

export const Route = createFileRoute("/company-profile")({
  head: () => ({
    meta: [
      { title: `Company Profile — ${SITE.name}` },
      {
        name: "description",
        content:
          "The complete Bismillah Milk Corner company profile — mission, vision, products, rates and clientele.",
      },
      { property: "og:title", content: `Company Profile — ${SITE.name}` },
      { property: "og:description", content: "Who we are and what we supply." },
      { property: "og:url", content: "/company-profile" },
    ],
    links: [{ rel: "canonical", href: "/company-profile" }],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions);
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions);
  const { phones, address, hours } = useSiteSettings();
  return (
    <>
      <section className="container-page py-16 md:py-24">
        <SectionHeading
          as="h1"
          eyebrow="Company profile"
          title={`${SITE.name}: Your Trusted Dairy Partner`}
          description="An at-a-glance overview of who we are, what we supply, and why Karachi's leading clubs and restaurants rely on us daily."
        />
      </section>

      <section className="container-page pb-8">
        <div className="overflow-hidden rounded-3xl bg-black shadow-[var(--shadow-elegant)] ring-1 ring-border">
          <video
            src={SITE.video}
            controls
            autoPlay
            muted
            loop
            preload="auto"
            playsInline
            poster={HERO_IMAGE}
            className="aspect-video w-full"
          >
            <track kind="captions" />
          </video>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Promotional overview video — quality, products and partnerships.
          </p>
          <a
            href={SITE.video}
            download="Bismillah-Milk-Corner.mp4"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            <PlayCircle className="h-4 w-4" /> Download video
          </a>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <ProfileCard title="Introduction">
            <p>
              Bismillah Milk Corner is a Karachi-based dairy supplier delivering premium fresh milk,
              yogurt, khoya, roll patti, samosa, papri and eggs to restaurants, hotels, clubs and
              confectioners across the city.
            </p>
          </ProfileCard>
          <ProfileCard title="Our commitment">
            <ul className="space-y-2 list-disc pl-5">
              <li>Meticulous sourcing from trusted suppliers</li>
              <li>Rigorous multi-stage quality control</li>
              <li>Cold-chain logistics that protect freshness</li>
              <li>Transparent pricing with no hidden fees</li>
            </ul>
          </ProfileCard>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="rounded-3xl bg-card p-8 shadow-[var(--shadow-soft)] ring-1 ring-border md:p-12">
          <p className="eyebrow">Price & Rate List (Rate + Tax)</p>
          <h2 className="mt-3 font-display text-3xl text-foreground">
            Transparent, competitive pricing
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            All rates are in PKR (Rate + Tax included). Prices reflect our commitment to quality and
            can be finalised in a written quotation.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-3 pr-4 font-semibold">Product</th>
                  <th className="py-3 pr-4 font-semibold">Category</th>
                  <th className="py-3 pr-4 font-semibold">Price (Rate + Tax)</th>
                  <th className="py-3 pr-4 font-semibold">Unit</th>
                </tr>
              </thead>
              <tbody>
                {catalog.products
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((p) => (
                    <tr key={p.id || p.slug} className="border-b border-border/70 last:border-0">
                      <td className="py-4 pr-4 font-medium text-foreground">{p.name}</td>
                      <td className="py-4 pr-4 text-muted-foreground">{p.category}</td>
                      <td className="py-4 pr-4 font-display text-lg text-primary">
                        {formatPrice(p.price)}
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">{p.unit}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="rounded-3xl bg-primary p-10 text-primary-foreground md:p-14">
          <p className="eyebrow text-gold">Trusted by</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl">
            Serving Karachi's premier establishments
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4">
            {CLIENTS.map((c) => (
              <p key={c} className="font-display text-2xl md:text-3xl text-gold">
                {c}
              </p>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-primary-foreground/85">
            A proven track record of consistent, on-time delivery for high-standard clients — and a
            supply chain built to match.
          </p>
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl bg-card p-8 ring-1 ring-border md:p-10">
            <p className="eyebrow">Contact</p>
            <h2 className="mt-3 font-display text-2xl text-foreground">
              Ready to partner with us?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Reach out for a customised quotation or to discuss your establishment's needs.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  {phones.map((p, i) => (
                    <span key={p}>
                      <a href={`tel:${p.replace(/[^0-9+]/g, "")}`} className="hover:text-primary">
                        {p}
                      </a>
                      {i < phones.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <span>{address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-primary" />
                <span>{hours}</span>
              </li>
            </ul>
          </div>
          <Link
            to="/quote"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gold p-8 text-gold-foreground shadow-[var(--shadow-elegant)] md:p-10"
          >
            <div>
              <p className="eyebrow text-primary">Start here</p>
              <h3 className="mt-3 font-display text-2xl text-primary">
                Request a written quotation
              </h3>
            </div>
            <span className="mt-8 inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform group-hover:-translate-y-0.5">
              Open quotation form <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}

function ProfileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-8 ring-1 ring-border shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-2xl text-primary">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
