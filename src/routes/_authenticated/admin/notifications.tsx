import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCheck, Trash2, BellOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-notifications-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id?: string) => {
      const q = supabase.from("notifications").update({ is_read: true } as never);
      const { error } = id ? await q.eq("id", id) : await q.eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      toast.success("Marked as read");
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id?: string) => {
      if (id) {
        const { error } = await supabase.from("notifications").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      }
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["admin-notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      toast.success(id ? "Notification deleted" : "All notifications cleared");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.filter((n) => !n.is_read).length} unread alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => markRead.mutate(undefined)}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to clear all notifications?")) {
                deleteNotification.mutate(undefined);
              }
            }}
          >
            <BellOff className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notifications…</p>
      ) : (
        <div className="grid gap-3">
          {data.length === 0 && (
            <div className="rounded-2xl bg-card p-12 text-center text-muted-foreground ring-1 ring-border shadow-sm">
              <p className="font-semibold text-foreground">You're all caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No pending notifications.</p>
            </div>
          )}
          {data.map((n) => (
            <Card
              key={n.id}
              className={n.is_read ? "opacity-75 bg-card/60" : "border-primary/30 shadow-sm"}
            >
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{n.title}</p>
                    {!n.is_read && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">New</Badge>
                    )}
                  </div>
                  {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                    {new Date(n.created_at).toLocaleString("en-PK", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!n.is_read && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Mark as read"
                      onClick={() => markRead.mutate(n.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    title="Delete notification"
                    onClick={() => deleteNotification.mutate(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
