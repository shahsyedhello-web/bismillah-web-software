import React, { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, ShoppingBag, CheckCheck, Info } from "lucide-react";

export function CustomerNotificationsTab() {
  const {
    notifications,
    unreadNotificationsCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
  } = useAuth();

  useEffect(() => {
    if (unreadNotificationsCount > 0) {
      const timer = setTimeout(() => {
        markAllNotificationsAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadNotificationsCount, markAllNotificationsAsRead]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            My Notifications & Alerts
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time delivery status, order updates, and promotional announcements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadNotificationsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllNotificationsAsRead()}
              className="rounded-full text-xs"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Mark all read
            </Button>
          )}
          <Badge variant="outline" className="px-3 py-1 text-xs">
            {notifications.length} Total Alerts
          </Badge>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="border-border rounded-3xl p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="font-display font-semibold text-foreground">No notifications yet</h3>
          <p className="text-xs text-muted-foreground mt-1">
            When you place an order or receive special offers, they will appear right here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isOrder = String(n.title).toLowerCase().includes("order");
            return (
              <Card
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markNotificationAsRead(n.id);
                }}
                className={`border-border rounded-2xl transition-all hover:border-primary/40 shadow-sm overflow-hidden cursor-pointer ${
                  !n.is_read ? "bg-accent/30 ring-1 ring-primary/20" : ""
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isOrder ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {isOrder ? <ShoppingBag className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {n.title}
                        </h4>
                        {!n.is_read && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {n.created_at
                          ? new Date(n.created_at).toLocaleString("en-PK", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
