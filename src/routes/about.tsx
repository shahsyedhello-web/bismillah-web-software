import { createFileRoute } from "@tanstack/react-router";
import { Target, Compass, HeartHandshake, Sparkles } from "lucide-react";
import { SITE, CLIENTS } from "@/lib/site-data";
import { SectionHeading } from "@/components/section-heading";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About — ${SITE.name}` },
      {
        name: "description",
        content:
          "Learn about Bismillah Milk Corner — Karachi's trusted supplier of fresh dairy, khoya and bakery essentials to clubs, hotels and restaurants.",
      },
      { property: "og:title", content: `About — ${SITE.name}` },
      { property: "og:description", content: "Our story, mission and values." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const VALUES = [
  {
    icon: Target,
    title: "Vision",
    body: "To be Karachi's leading dairy supplier — the standard for freshness, quality and customer trust in the market.",
  },
  {
    icon: Compass,
    title: "Mission",
    body: "Consistently supply premium milk, yogurt and related items, ensuring every product meets strict quality controls and reaches customers at peak freshness.",
  },
  {
    icon: HeartHandshake,
    title: "Values",
    body: "Integrity, transparency and a deep dedication to customer satisfaction — building lasting relationships through reliable service and superior products.",
  },
  {
    icon: Sparkles,
    title: "Craft",
    body: "Meticulous sourcing, rigorous quality checks at every stage, and delivery systems designed to keep freshness and nutritional value intact.",
  },
];

function AboutPage() {
  return (
    <>
      <section className="container-page py-16 md:py-24">
        <SectionHeading
          as="h1"
          eyebrow="About us"
          title="Karachi's trusted name in fresh dairy."
          description={`${SITE.name} has spent years perfecting a simple promise: deliver premium dairy and bakery essentials, on time, every time. It's a promise that's earned us the trust of Karachi's most demanding kitchens.`}
        />
      </section>

      <section className="container-page pb-8">
        <div className="grid gap-8 rounded-3xl bg-card p-8 ring-1 ring-border md:grid-cols-2 md:p-12">
          <div>
            <p className="eyebrow">Our story</p>
            <h2 className="mt-3 font-display text-3xl text-foreground">
              A neighbourhood dairy that grew into a partner for the city's finest clubs.
            </h2>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              What began as a small dairy corner in DHA, Karachi has grown into a dependable
              supplier for restaurants, hotels and private clubs across the city. We've kept the
              same discipline that made us successful in the first place: meticulous sourcing,
              honest pricing, and personal service.
            </p>
            <p>
              Today, our clients include{" "}
              <span className="font-medium text-primary">{CLIENTS.join(", ")}</span>, and dozens of
              restaurants and bakeries that trust us with their daily supply.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-3xl bg-card p-8 ring-1 ring-border shadow-[var(--shadow-soft)]"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary">
                <v.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-6 font-display text-2xl text-foreground">{v.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="rounded-3xl bg-primary p-10 text-primary-foreground md:p-16">
          <p className="eyebrow text-gold">Our commitment</p>
          <h2 className="mt-4 max-w-3xl font-display text-3xl leading-tight md:text-4xl">
            Sourced with care. Checked at every stage. Delivered while it's still fresh.
          </h2>
          <p className="mt-5 max-w-2xl text-primary-foreground/80">
            Our raw materials come from trusted sources that adhere to the highest standards of
            hygiene. Every product — from milk and yogurt to everyday snacks — undergoes strict
            quality checks before it leaves us. And our logistics are designed to protect that
            freshness all the way to your kitchen.
          </p>
        </div>
      </section>
    </>
  );
}
