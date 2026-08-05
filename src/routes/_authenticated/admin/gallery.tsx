import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload } from "lucide-react";
import { uploadMedia, logActivity } from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/gallery")({
  component: GalleryAdmin,
});

function GalleryAdmin() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [alt, setAlt] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async ({ url, alt }: { url: string; alt: string }) => {
      const { data, error } = await supabase
        .from("gallery_items")
        .insert({ image_url: url, title: alt, is_visible: true } as never)
        .select("id")
        .single();
      if (error) throw error;
      await logActivity("create", "gallery", data.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Added");
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      qc.setQueryData(["admin-gallery"], (old: Record<string, unknown>[] | undefined) =>
        (old || []).filter((g) => g.id !== id),
      );

      try {
        const { error } = await supabase.from("gallery_items").delete().eq("id", id);
        if (error) {
          await supabase
            .from("gallery_items")
            .update({ is_visible: false } as never)
            .eq("id", id);
        }
        await logActivity("delete", "gallery", id);
      } catch (err) {
        console.warn("Gallery delete exception:", err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Deleted");
    },
  });
  const toggleVisible = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from("gallery_items")
        .update({ is_visible } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gallery"] }),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, "gallery");
      await add.mutateAsync({ url, alt: alt || file.name });
      setAlt("");
      (e.target as HTMLInputElement).value = "";
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Gallery</h1>
        <p className="text-sm text-muted-foreground">{data.length} images</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <Label>Alt text (optional)</Label>
              <Input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image"
              />
            </div>
            <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
                disabled={uploading}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {data.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-3">
                <img
                  src={g.image_url}
                  alt={g.title ?? ""}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <p className="mt-2 truncate text-xs text-muted-foreground">{g.title || "—"}</p>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={g.is_visible}
                      onCheckedChange={(v) => toggleVisible.mutate({ id: g.id, is_visible: v })}
                    />
                    Visible
                  </label>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      del.mutate(g.id);
                    }}
                    title="Delete item"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
