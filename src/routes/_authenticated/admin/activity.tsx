import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Activity Log</h1>
        <p className="text-sm text-muted-foreground">Last 200 events</p>
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <Card>
          <CardContent className="p-2">
            <div className="grid gap-1">
              {data.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{a.action}</span> ·{" "}
                    <span className="text-muted-foreground">{a.entity}</span>
                    {a.entity_id && (
                      <span className="ml-2 text-xs text-muted-foreground font-mono">
                        {a.entity_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {new Date(a.created_at).toLocaleString()}
                  </Badge>
                </div>
              ))}
              {data.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
