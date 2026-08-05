import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getCachedBanners, saveCachedBanners, type CachedBanner } from "@/lib/cms-cache";
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
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { uploadMedia, logActivity } from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: BannersPage,
});

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
};

function BannersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Banner>>({});
  const [uploading, setUploading] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from("banners").select("*").order("sort_order");
          if (!error && data) return data as Banner[];
        } catch {
          // fallback
        }
      }
      return getCachedBanners() as Banner[];
    },
    staleTime: 1_000,
  });

  const save = useMutation({
    mutationFn: async (b: Partial<Banner>) => {
      const cached = getCachedBanners();
      const targetId = b.id || `banner-${Date.now()}`;
      const newBanner: CachedBanner = {
        id: targetId,
        title: b.title?.trim() || "New Banner",
        subtitle: b.subtitle?.trim() || null,
        cta_label: b.cta_label?.trim() || null,
        cta_href: b.cta_href?.trim() || null,
        image_url: b.image_url || null,
        is_visible: b.is_visible !== undefined ? Boolean(b.is_visible) : true,
        sort_order: Number(b.sort_order ?? 0),
      };

      const existingIndex = cached.findIndex((item) => item.id === targetId);
      let updatedList: CachedBanner[];
      if (existingIndex >= 0) {
        updatedList = [...cached];
        updatedList[existingIndex] = { ...updatedList[existingIndex], ...newBanner };
      } else {
        updatedList = [...cached, newBanner];
      }

      saveCachedBanners(updatedList);

      if (isSupabaseConfigured()) {
        try {
          if (b.id) {
            await supabase
              .from("banners")
              .update(b as never)
              .eq("id", b.id);
            await logActivity("update", "banner", b.id);
          } else {
            const { data } = await supabase
              .from("banners")
              .insert(b as never)
              .select("id")
              .single();
            if (data?.id) await logActivity("create", "banner", data.id);
          }
        } catch (e: unknown) {
          console.warn("Supabase banner save error (saved to local cache):", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      setOpen(false);
      toast.success("Banner saved successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const cached = getCachedBanners();
      saveCachedBanners(cached.filter((item) => item.id !== id));

      qc.setQueryData(["admin-banners"], (old: Banner[] | undefined) =>
        (old || []).filter((b) => b.id !== id),
      );

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from("banners").delete().eq("id", id);
          if (error) {
            await supabase
              .from("banners")
              .update({ is_visible: false } as never)
              .eq("id", id);
          }
          await logActivity("delete", "banner", id);
        } catch (e: unknown) {
          console.warn("Supabase banner delete error (removed from local cache):", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner deleted successfully");
    },
  });

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadMedia(f, "banners");
      setForm((s) => ({ ...s, image_url: url }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Banners</h1>
          <p className="text-sm text-muted-foreground">{data.length} banners</p>
        </div>
        <Button
          onClick={() => {
            setForm({ is_visible: true, sort_order: 0 });
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New banner
        </Button>
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                {b.image_url && (
                  <img
                    src={b.image_url}
                    alt={b.title}
                    className="mb-3 aspect-[16/6] w-full rounded-lg object-cover"
                  />
                )}
                <p className="font-semibold">{b.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{b.subtitle}</p>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setForm(b);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      del.mutate(b.id);
                    }}
                    title="Delete banner"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit banner" : "New banner"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Textarea
                value={form.subtitle ?? ""}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CTA Label</Label>
                <Input
                  value={form.cta_label ?? ""}
                  onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
                />
              </div>
              <div>
                <Label>CTA URL</Label>
                <Input
                  value={form.cta_href ?? ""}
                  onChange={(e) => setForm({ ...form, cta_href: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                {form.image_url && (
                  <img src={form.image_url} alt="" className="h-16 w-24 rounded object-cover" />
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={onImage} />
                </label>
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <Switch
                  checked={!!form.is_visible}
                  onCheckedChange={(v) => setForm({ ...form, is_visible: v })}
                />
                Visible
              </label>
              <div>
                <Label>Sort</Label>
                <Input
                  type="number"
                  value={form.sort_order ?? 0}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-20"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.title}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
