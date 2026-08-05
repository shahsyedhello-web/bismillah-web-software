import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getLocalCachedSettings, saveLocalCachedSettings } from "@/context/site-settings-context";
import { SITE } from "@/lib/site-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logActivity } from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

type Settings = {
  id?: string;
  shop_name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  google_maps_url: string | null;
  footer_text: string | null;
};

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("site_settings")
            .select("*")
            .limit(1)
            .maybeSingle();
          if (!error && data) {
            saveLocalCachedSettings(data as Record<string, unknown>);
            return data as Settings;
          }
        } catch (e) {
          console.warn("Exception fetching site_settings:", e);
        }
      }
      return getLocalCachedSettings() as unknown as Settings | null;
    },
  });

  const [form, setForm] = useState<Partial<Settings>>(() => {
    const cached = getLocalCachedSettings();
    if (cached && Object.keys(cached).length > 0) {
      return {
        shop_name: cached.shop_name || SITE.name,
        phone: cached.phone || SITE.phones.join(" / "),
        whatsapp: cached.whatsapp || SITE.whatsapp,
        email: cached.email || SITE.email,
        address: cached.address || SITE.address,
        google_maps_url: cached.google_maps_url || SITE.mapEmbed,
        footer_text: cached.footer_text || "",
      };
    }
    return {
      shop_name: SITE.name,
      phone: SITE.phones.join(" / "),
      whatsapp: SITE.whatsapp,
      email: SITE.email,
      address: SITE.address,
      google_maps_url: SITE.mapEmbed,
      footer_text: "",
    };
  });

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setForm(data as unknown as Settings);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      // 1. Save to local storage cache and notify subscribers immediately
      saveLocalCachedSettings(form);

      // 2. Persist to Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const existingId = form.id || data?.id;
          if (existingId) {
            const { error } = await supabase
              .from("site_settings")
              .update({ ...form, id: existingId } as never)
              .eq("id", existingId);
            if (error) throw error;
          } else {
            const { data: existingRow } = await supabase
              .from("site_settings")
              .select("id")
              .limit(1)
              .maybeSingle();

            if (existingRow?.id) {
              const { error } = await supabase
                .from("site_settings")
                .update({ ...form, id: existingRow.id } as never)
                .eq("id", existingRow.id);
              if (error) throw error;
              setForm((prev) => ({ ...prev, id: existingRow.id }));
            } else {
              const { data: inserted, error } = await supabase
                .from("site_settings")
                .insert([form as never])
                .select("id")
                .single();
              if (error) throw error;
              if (inserted?.id) {
                setForm((prev) => ({ ...prev, id: inserted.id }));
              }
            }
          }
        } catch (e: unknown) {
          console.warn("Supabase save error (saved to local cache):", e);
        }
      }
      await logActivity("update", "site_settings");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fields: { key: keyof Settings; label: string; type?: "text" | "textarea" }[] = [
    { key: "shop_name", label: "Shop name" },
    { key: "phone", label: "Phone" },
    { key: "whatsapp", label: "WhatsApp (international)" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "google_maps_url", label: "Google Maps URL" },
    { key: "footer_text", label: "Footer text", type: "textarea" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl">Site Settings</h1>
        <p className="text-sm text-muted-foreground">Business info shown across the website</p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  rows={3}
                  value={(form[f.key] as string) ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  value={(form[f.key] as string) ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <Button onClick={() => save.mutate()}>Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
