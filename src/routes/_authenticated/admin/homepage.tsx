import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import {
  getCachedHomepageSections,
  saveCachedHomepageSections,
  type CachedSection,
} from "@/lib/cms-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logActivity } from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: HomepageCMS,
});

type Section = {
  id: string;
  key: string;
  heading: string | null;
  subheading: string | null;
  body: string | null;
  image_url: string | null;
  is_visible: boolean;
};

const DEFAULT_SECTIONS: Section[] = [
  {
    id: "sec-hero",
    key: "hero",
    heading: "Fresh dairy, delivered with integrity.",
    subheading: "Karachi · Since day one",
    body: "Bismillah Milk Corner is Karachi's trusted supplier of fresh milk, yogurt, khoya and everyday kitchen essentials.",
    image_url: null,
    is_visible: true,
  },
  {
    id: "sec-about",
    key: "about_intro",
    heading: "A dairy partner Karachi's kitchens actually rely on.",
    subheading: "Who we are",
    body: "From the first delivery of the morning to the last of the evening, Bismillah Milk Corner supplies premium milk, yogurt, khoya and bakery essentials.",
    image_url: null,
    is_visible: true,
  },
  {
    id: "sec-featured",
    key: "featured_products",
    heading: "Our best-selling products",
    subheading: "Featured",
    body: "A snapshot of what our commercial and household customers order every week.",
    image_url: null,
    is_visible: true,
  },
];

function HomepageCMS() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-homepage"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("homepage_sections")
            .select("id, key, heading, subheading, body, image_url, is_visible")
            .order("key");
          if (!error && data && data.length > 0) {
            return data as Section[];
          }
        } catch {
          // fallback
        }
      }
      const cached = getCachedHomepageSections();
      if (cached.length > 0) return cached as Section[];
      return DEFAULT_SECTIONS;
    },
    staleTime: 1_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Homepage Content</h1>
        <p className="text-sm text-muted-foreground">Edit each section shown on the homepage</p>
      </div>
      <div className="grid gap-4">
        {data.map((s) => (
          <SectionEditor
            key={s.id || s.key}
            section={s}
            onSaved={() => qc.invalidateQueries({ queryKey: ["admin-homepage"] })}
          />
        ))}
      </div>
    </div>
  );
}

function SectionEditor({ section, onSaved }: { section: Section; onSaved: () => void }) {
  const [form, setForm] = useState(section);
  useEffect(() => setForm(section), [section]);

  const save = useMutation({
    mutationFn: async () => {
      const cached = getCachedHomepageSections();
      const targetId = section.id || `sec-${section.key}`;
      const newSec: CachedSection = {
        id: targetId,
        key: section.key,
        heading: form.heading ?? null,
        subheading: form.subheading ?? null,
        body: form.body ?? null,
        image_url: form.image_url ?? null,
        is_visible: form.is_visible !== undefined ? Boolean(form.is_visible) : true,
      };

      const existingIdx = cached.findIndex(
        (item) => item.key === section.key || item.id === targetId,
      );
      let updatedList: CachedSection[];
      if (existingIdx >= 0) {
        updatedList = [...cached];
        updatedList[existingIdx] = newSec;
      } else {
        updatedList = [...cached, newSec];
      }

      saveCachedHomepageSections(updatedList);

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from("homepage_sections")
            .update({
              heading: form.heading,
              subheading: form.subheading,
              body: form.body,
              image_url: form.image_url,
              is_visible: form.is_visible,
            } as never)
            .eq("id", section.id);
          await logActivity("update", "homepage_section", section.id, { key: section.key });
        } catch (e: unknown) {
          console.warn("Supabase section update error (saved to local cache):", e);
        }
      }
    },
    onSuccess: () => {
      toast.success(`${section.key} saved successfully`);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {section.key}
          </p>
          <Button size="sm" onClick={() => save.mutate()}>
            Save
          </Button>
        </div>
        <div>
          <Label>Heading</Label>
          <Input
            value={form.heading ?? ""}
            onChange={(e) => setForm({ ...form, heading: e.target.value })}
          />
        </div>
        <div>
          <Label>Subheading</Label>
          <Input
            value={form.subheading ?? ""}
            onChange={(e) => setForm({ ...form, subheading: e.target.value })}
          />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea
            rows={3}
            value={form.body ?? ""}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
