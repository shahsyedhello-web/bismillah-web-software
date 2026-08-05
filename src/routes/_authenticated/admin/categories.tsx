import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import {
  getCachedCategories,
  saveCachedCategories,
  notifyCatalogUpdated,
  type CachedCategory,
} from "@/lib/catalog-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { slugify, logActivity } from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

type Cat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

function CategoriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [form, setForm] = useState<Partial<Cat>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-categories-full"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("categories")
            .select("*")
            .order("sort_order")
            .order("name");
          if (!error && data && data.length > 0) {
            return data as Cat[];
          }
        } catch {
          // fallback to local
        }
      }
      const cached = getCachedCategories();
      return cached.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        sort_order: c.sort_order,
      }));
    },
    staleTime: 1_000,
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Cat>) => {
      const cached = getCachedCategories();
      const targetId = c.id || `cat-${Date.now()}`;
      const slug = c.slug || slugify(c.name || `category-${Date.now()}`);

      const newCat: CachedCategory = {
        id: targetId,
        name: c.name?.trim() || "New Category",
        slug,
        description: c.description?.trim() || null,
        sort_order: Number(c.sort_order ?? 0),
        is_visible: true,
      };

      const existingIndex = cached.findIndex((item) => item.id === targetId || item.slug === slug);
      let updatedList: CachedCategory[];
      if (existingIndex >= 0) {
        updatedList = [...cached];
        updatedList[existingIndex] = { ...updatedList[existingIndex], ...newCat };
      } else {
        updatedList = [...cached, newCat];
      }

      saveCachedCategories(updatedList);

      if (isSupabaseConfigured()) {
        try {
          const payload = {
            name: newCat.name,
            slug: newCat.slug,
            description: newCat.description,
            sort_order: newCat.sort_order,
            is_visible: true,
          };
          if (c.id) {
            await supabase
              .from("categories")
              .update(payload as never)
              .eq("id", c.id);
            await logActivity("update", "category", c.id);
          } else {
            const { data } = await supabase
              .from("categories")
              .insert(payload as never)
              .select("id")
              .single();
            if (data?.id) await logActivity("create", "category", data.id);
          }
        } catch (e: unknown) {
          console.warn("Supabase category save error (saved to local cache):", e);
        }
      }
    },
    onSuccess: async () => {
      notifyCatalogUpdated();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-categories-full"] }),
        qc.invalidateQueries({ queryKey: ["admin-categories"] }),
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      setOpen(false);
      toast.success("Category saved successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const cached = getCachedCategories();
      const target = data.find((c) => c.id === id);
      const targetSlug = target?.slug || id.replace(/^cat-/, "");

      const updatedList = cached.filter(
        (item) => item.id !== id && item.slug !== targetSlug && item.id !== `cat-${targetSlug}`,
      );
      saveCachedCategories(updatedList);

      qc.setQueryData(["admin-categories-full"], (old: Cat[] | undefined) =>
        (old || []).filter((c) => c.id !== id && c.slug !== targetSlug),
      );

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from("categories").delete().eq("id", id);
          if (error) {
            await supabase
              .from("categories")
              .update({ is_visible: false } as never)
              .eq("id", id);
          }
          await logActivity("delete", "category", id);
        } catch (e: unknown) {
          console.warn("Supabase category delete error (removed from local cache):", e);
        }
      }
    },
    onSuccess: async () => {
      notifyCatalogUpdated();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-categories-full"] }),
        qc.invalidateQueries({ queryKey: ["admin-categories"] }),
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      toast.success("Category deleted successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setForm({ name: "", description: "", sort_order: 0 });
    setOpen(true);
  }
  function openEdit(c: Cat) {
    setEditing(c);
    setForm(c);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Categories</h1>
          <p className="text-sm text-muted-foreground">{data.length} total</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          New category
        </Button>
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">/{c.slug}</p>
                    {c.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        del.mutate(c.id);
                      }}
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.name}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
