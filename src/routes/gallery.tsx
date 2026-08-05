import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { SITE, GALLERY } from "@/lib/site-data";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { SectionHeading } from "@/components/section-heading";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: `Gallery — ${SITE.name}` },
      {
        name: "description",
        content:
          "A visual look at Bismillah Milk Corner — our products, deliveries and the kitchens we serve across Karachi.",
      },
      { property: "og:title", content: `Gallery — ${SITE.name}` },
      { property: "og:description", content: "Photos from Bismillah Milk Corner." },
      { property: "og:url", content: "/gallery" },
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const { data: dbGallery = [] } = useQuery({
    queryKey: ["public-gallery"],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return [];
      try {
        const { data, error } = await supabase
          .from("gallery_items")
          .select("id, image_url, title")
          .eq("is_visible", true)
          .order("sort_order")
          .order("created_at", { ascending: false });
        if (!error && data) {
          return data.map((item) => ({
            src: item.image_url,
            alt: item.title || "Bismillah Milk Corner Gallery",
          }));
        }
      } catch (e) {
        console.warn("Public gallery fetch error:", e);
      }
      return [];
    },
  });

  const combinedGallery = [...dbGallery, ...GALLERY];

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIdx(null);
      if (e.key === "ArrowRight")
        setOpenIdx((i) => (i === null ? 0 : (i + 1) % combinedGallery.length));
      if (e.key === "ArrowLeft")
        setOpenIdx((i) =>
          i === null ? 0 : (i - 1 + combinedGallery.length) % combinedGallery.length,
        );
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openIdx, combinedGallery.length]);

  return (
    <>
      <section className="container-page py-16 md:py-24">
        <SectionHeading
          as="h1"
          eyebrow="Gallery"
          title="A closer look at what we do."
          description="Fresh product photography, everyday deliveries, and moments from the kitchens we're proud to supply."
        />
      </section>

      <section className="container-page pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combinedGallery.map((g, idx) => (
            <button
              key={`${g.src}-${idx}`}
              type="button"
              onClick={() => setOpenIdx(idx)}
              className="group overflow-hidden rounded-3xl bg-card ring-1 ring-border transition-transform hover:-translate-y-1"
            >
              <img
                src={g.src}
                alt={g.alt}
                width={1200}
                height={1200}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      </section>

      {openIdx !== null && combinedGallery[openIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image"
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4"
          onClick={() => setOpenIdx(null)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
            onClick={() => setOpenIdx(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute left-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIdx((i) =>
                i === null ? 0 : (i - 1 + combinedGallery.length) % combinedGallery.length,
              );
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIdx((i) => (i === null ? 0 : (i + 1) % combinedGallery.length));
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <img
            src={combinedGallery[openIdx].src}
            alt={combinedGallery[openIdx].alt}
            className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
