import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCSV, toCSV, logActivity } from "@/lib/admin";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/quotations")({
  component: QuotationsPage,
});

const STATUSES = ["new", "in_progress", "quoted", "closed"];

function QuotationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-quotations"],
    queryFn: async () => {
      let sbQuotations: Record<string, unknown>[] = [];
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("quotations")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) sbQuotations = data as Record<string, unknown>[];
        } catch (e) {
          console.warn("Supabase query failed, falling back to local storage:", e);
        }
      }

      let localQuotations: Record<string, unknown>[] = [];
      try {
        const raw = localStorage.getItem("bmc_quotations");
        if (raw) localQuotations = JSON.parse(raw);
      } catch (e) {
        console.warn("Failed reading local bmc_quotations:", e);
      }

      const map = new Map<string, Record<string, unknown>>();
      for (const item of localQuotations) {
        if (item && item.id) map.set(item.id as string, item);
      }
      for (const item of sbQuotations) {
        if (item && item.id) map.set(item.id as string, item);
      }

      return Array.from(map.values()).sort(
        (a, b) =>
          new Date((b.created_at as string) || 0).getTime() -
          new Date((a.created_at as string) || 0).getTime(),
      );
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Update local storage
      try {
        const raw = localStorage.getItem("bmc_quotations");
        if (raw) {
          const list = JSON.parse(raw);
          const idx = list.findIndex((q: Record<string, unknown>) => q.id === id);
          if (idx !== -1) {
            list[idx].status = status;
            localStorage.setItem("bmc_quotations", JSON.stringify(list));
          }
        }
      } catch (e) {
        console.warn("Error updating local bmc_quotations:", e);
      }

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
          if (!error) await logActivity("update_status", "quotation", id, { status });
        } catch (e) {
          console.warn("Error updating status on Supabase:", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quotations"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      // Delete from local storage
      try {
        const raw = localStorage.getItem("bmc_quotations");
        if (raw) {
          const list = JSON.parse(raw).filter((q: Record<string, unknown>) => q.id !== id);
          localStorage.setItem("bmc_quotations", JSON.stringify(list));
        }
      } catch (e) {
        console.warn("Error deleting from local bmc_quotations:", e);
      }

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from("quotations").delete().eq("id", id);
          if (!error) await logActivity("delete", "quotation", id);
        } catch (e) {
          console.warn("Error deleting from Supabase:", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quotations"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = data.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.company_name.toLowerCase().includes(q) ||
      r.contact_person.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Quotations</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {data.length} requests
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => downloadCSV(`quotations-${Date.now()}.csv`, toCSV(filtered as never))}
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
          No quotations match.
        </p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl">{q.company_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {q.contact_person} · {q.business_type ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={q.status}
                      onValueChange={(v) => updateStatus.mutate({ id: q.id, status: v })}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        del.mutate(q.id);
                      }}
                      title="Delete quotation"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Row label="Phone">
                    <a href={`tel:${q.phone}`} className="hover:text-primary">
                      {q.phone}
                    </a>
                  </Row>
                  <Row label="Email">
                    <a href={`mailto:${q.email}`} className="hover:text-primary">
                      {q.email}
                    </a>
                  </Row>
                  <Row label="WhatsApp">{q.whatsapp || "—"}</Row>
                  <Row label="Required by">{q.required_date || "—"}</Row>
                  <Row label="Products" full>
                    {q.products_required}
                  </Row>
                  <Row label="Quantity">{q.quantity || "—"}</Row>
                  <Row label="Delivery city">{q.delivery_city || "—"}</Row>
                  <Row label="Delivery address" full>
                    {q.delivery_address || "—"}
                  </Row>
                  {q.special_requirements && (
                    <Row label="Special requirements" full>
                      {q.special_requirements}
                    </Row>
                  )}
                  <Row label="Received">{new Date(q.created_at).toLocaleString()}</Row>
                  <Row label="Status">
                    <Badge>{q.status}</Badge>
                  </Row>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{children}</dd>
    </div>
  );
}
