import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import {
  getCachedTestimonials,
  saveCachedTestimonials,
  type CachedTestimonial,
} from "@/lib/cms-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { logActivity } from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/testimonials")({
  component: TestimonialsPage,
});

type T = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number;
  is_visible: boolean;
  sort_order: number;
};

function TestimonialsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<T>>({});

  const { data = [] } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("testimonials")
            .select("*")
            .order("sort_order");
          if (!error && data) return data as T[];
        } catch {
          // fallback
        }
      }
      return getCachedTestimonials() as T[];
    },
    staleTime: 1_000,
  });

  const save = useMutation({
    mutationFn: async (t: Partial<T>) => {
      const cached = getCachedTestimonials();
      const targetId = t.id || `testi-${Date.now()}`;
      const newTesti: CachedTestimonial = {
        id: targetId,
        name: t.name?.trim() || "Customer",
        role: t.role?.trim() || null,
        quote: t.quote?.trim() || "",
        rating: Number(t.rating ?? 5),
        is_visible: t.is_visible !== undefined ? Boolean(t.is_visible) : true,
        sort_order: Number(t.sort_order ?? 0),
      };

      const existingIndex = cached.findIndex((item) => item.id === targetId);
      let updatedList: CachedTestimonial[];
      if (existingIndex >= 0) {
        updatedList = [...cached];
        updatedList[existingIndex] = { ...updatedList[existingIndex], ...newTesti };
      } else {
        updatedList = [...cached, newTesti];
      }

      saveCachedTestimonials(updatedList);

      if (isSupabaseConfigured()) {
        try {
          if (t.id) {
            await supabase
              .from("testimonials")
              .update(t as never)
              .eq("id", t.id);
            await logActivity("update", "testimonial", t.id);
          } else {
            const { data } = await supabase
              .from("testimonials")
              .insert(t as never)
              .select("id")
              .single();
            if (data?.id) await logActivity("create", "testimonial", data.id);
          }
        } catch (e: unknown) {
          console.warn("Supabase testimonial save error (saved to local cache):", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      setOpen(false);
      toast.success("Testimonial saved successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const cached = getCachedTestimonials();
      saveCachedTestimonials(cached.filter((item) => item.id !== id));

      qc.setQueryData(["admin-testimonials"], (old: T[] | undefined) =>
        (old || []).filter((t) => t.id !== id),
      );

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from("testimonials").delete().eq("id", id);
          if (error) {
            await supabase
              .from("testimonials")
              .update({ is_visible: false } as never)
              .eq("id", id);
          }
          await logActivity("delete", "testimonial", id);
        } catch (e: unknown) {
          console.warn("Supabase testimonial delete error (removed from local cache):", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Testimonial deleted successfully");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Testimonials</h1>
          <p className="text-sm text-muted-foreground">{data.length}</p>
        </div>
        <Button
          onClick={() => {
            setForm({ rating: 5, is_visible: true, sort_order: 0 });
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm">"{t.quote}"</p>
                  <p className="mt-2 text-xs font-semibold">
                    {t.name}
                    {t.role ? ` · ${t.role}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setForm(t);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      del.mutate(t.id);
                    }}
                    title="Delete testimonial"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit" : "New"} testimonial</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Author name</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Role / Company</Label>
              <Input
                value={form.role ?? ""}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
            <div>
              <Label>Quote</Label>
              <Textarea
                rows={4}
                value={form.quote ?? ""}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Rating (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.rating ?? 5}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Sort</Label>
                <Input
                  type="number"
                  value={form.sort_order ?? 0}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <label className="mt-6 flex items-center gap-2">
                <Switch
                  checked={!!form.is_visible}
                  onCheckedChange={(v) => setForm({ ...form, is_visible: v })}
                />
                Visible
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.name || !form.quote}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
