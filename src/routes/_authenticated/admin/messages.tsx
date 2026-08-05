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

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: MessagesPage,
});

const STATUSES = ["new", "read", "replied", "archived"];

function MessagesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      let sbMessages: Record<string, unknown>[] = [];
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("contact_messages")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) sbMessages = data as Record<string, unknown>[];
        } catch (e) {
          console.warn("Supabase messages query error:", e);
        }
      }

      let localMessages: Record<string, unknown>[] = [];
      try {
        const raw = localStorage.getItem("bmc_messages");
        if (raw) localMessages = JSON.parse(raw);
      } catch (e) {
        console.warn("Local bmc_messages parse error:", e);
      }

      const map = new Map<string, Record<string, unknown>>();
      for (const m of localMessages) {
        if (m && m.id) map.set(m.id as string, m);
      }
      for (const m of sbMessages) {
        if (m && m.id) map.set(m.id as string, m);
      }

      return Array.from(map.values()).sort(
        (a, b) =>
          new Date((b.created_at as string) || 0).getTime() -
          new Date((a.created_at as string) || 0).getTime(),
      );
    },
  });

  const upd = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      try {
        const raw = localStorage.getItem("bmc_messages");
        if (raw) {
          const list = JSON.parse(raw);
          const idx = list.findIndex((m: Record<string, unknown>) => m.id === id);
          if (idx !== -1) {
            list[idx].status = status;
            localStorage.setItem("bmc_messages", JSON.stringify(list));
          }
        }
      } catch (e) {
        console.warn("Error updating local bmc_messages:", e);
      }

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
          if (!error) await logActivity("update_status", "message", id, { status });
        } catch (e) {
          console.warn("Error updating message status on Supabase:", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-messages"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      try {
        const raw = localStorage.getItem("bmc_messages");
        if (raw) {
          const list = JSON.parse(raw).filter((m: Record<string, unknown>) => m.id !== id);
          localStorage.setItem("bmc_messages", JSON.stringify(list));
        }
      } catch (e) {
        console.warn("Error deleting from local bmc_messages:", e);
      }

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from("contact_messages").delete().eq("id", id);
          if (!error) await logActivity("delete", "message", id);
        } catch (e) {
          console.warn("Error deleting message from Supabase:", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-messages"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Deleted");
    },
  });

  const filtered = data.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.subject ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Messages</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {data.length}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => downloadCSV(`messages-${Date.now()}.csv`, toCSV(filtered as never))}
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name, email, subject…"
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
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
          No messages match.
        </p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl">{m.subject || "(no subject)"}</p>
                    <p className="text-sm text-muted-foreground">
                      {m.name} ·{" "}
                      <a href={`mailto:${m.email}`} className="hover:text-primary">
                        {m.email}
                      </a>
                      {m.phone && <> · {m.phone}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{m.status}</Badge>
                    <Select
                      value={m.status}
                      onValueChange={(v) => upd.mutate({ id: m.id, status: v })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        del.mutate(m.id);
                      }}
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm">{m.message}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
