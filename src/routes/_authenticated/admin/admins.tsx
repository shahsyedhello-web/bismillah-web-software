import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logActivity } from "@/lib/admin";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminsPage,
});

const ROLES = ["super_admin", "admin", "staff", "user"] as const;

function AdminsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upd = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role } as never)
        .eq("id", id);
      if (error) throw error;
      await logActivity("update_role", "user_roles", id, { role });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
      await logActivity("delete", "user_roles", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-user-roles"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Admin Users</h1>
        <p className="text-sm text-muted-foreground">
          Grant an existing signed-up user a role. New users must sign up at /auth first.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            To promote a new user: have them sign up, then paste their user id in the SQL editor or
            extend this UI to accept an email lookup (requires an admin RPC — out of scope for this
            phase).
          </p>
          <div className="grid gap-2">
            {data.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-mono">{r.user_id}</p>
                  <Badge variant="secondary" className="mt-1">
                    {r.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={r.role} onValueChange={(v) => upd.mutate({ id: r.id, role: v })}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Revoke role?")) del.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
