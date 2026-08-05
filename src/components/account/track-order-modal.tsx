import React, { useEffect, useState } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  CheckCheck,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site-data";
import { toast } from "sonner";

import type { DbOrder } from "@/types/checkout";

interface TrackOrderModalProps {
  order: DbOrder | null;
  onClose: () => void;
}

const STAGES = [
  {
    id: "pending",
    label: "Pending",
    desc: "Order received & awaiting store verification",
    icon: Clock,
  },
  {
    id: "confirmed",
    label: "Confirmed",
    desc: "Order confirmed by Bismillah Milk Corner",
    icon: CheckCircle2,
  },
  {
    id: "preparing",
    label: "Preparing",
    desc: "Fresh dairy items selected & checked for quality",
    icon: Package,
  },
  {
    id: "packed",
    label: "Packed",
    desc: "Sealed securely in insulated temperature-controlled packs",
    icon: Package,
  },
  {
    id: "out_for_delivery",
    label: "Out For Delivery",
    desc: "Rider is en route to your address",
    icon: Truck,
  },
  { id: "delivered", label: "Delivered", desc: "Handed over safely to customer", icon: CheckCheck },
];

export function TrackOrderModal({ order: initialOrder, onClose }: TrackOrderModalProps) {
  const [order, setOrder] = useState<DbOrder | null>(initialOrder);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    setOrder(initialOrder);
    if (!initialOrder?.id) return;

    // Supabase Realtime Subscription on orders table
    const channel = supabase
      .channel(`order-track-${initialOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${initialOrder.id}`,
        },
        (payload) => {
          if (payload.new) {
            setOrder(payload.new as DbOrder);
            toast.info(`Order status updated to: ${(payload.new as DbOrder).status}`);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsRealtimeConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialOrder]);

  if (!order) return null;

  const currentStatus = order.status || "pending";
  const isCancelled = currentStatus === "cancelled";

  // Determine stage index
  const getStageIndex = (status: string) => {
    const idx = STAGES.findIndex((s) => s.id === status);
    return idx === -1 ? 0 : idx;
  };

  const currentStageIdx = getStageIndex(currentStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card p-6 sm:p-8 shadow-2xl ring-1 ring-border">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Realtime Order Tracker
              </span>
              {isRealtimeConnected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Live
                  Sync
                </span>
              )}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-0.5">
              Order #{order.order_number || order.id.slice(0, 8)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-8">
          {/* Cancelled Banner */}
          {isCancelled ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-center text-rose-800">
              <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
              <h3 className="font-bold text-base">This Order Was Cancelled</h3>
              <p className="text-xs mt-1 text-rose-700">
                If you have any questions or need a refund verification, please contact our support
                team.
              </p>
            </div>
          ) : (
            /* Vertical Timeline */
            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-[15px] sm:before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;

                return (
                  <div key={stage.id} className="relative flex items-start gap-4">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-[24px] sm:-left-[28px] top-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full ring-4 ring-card font-bold text-xs transition-all ${
                        isPassed
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                            ? "bg-amber-500 text-slate-950 ring-amber-300/50 scale-110 shadow-md"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="ml-4 sm:ml-6 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-bold ${
                            isCurrent
                              ? "text-primary text-base"
                              : isPassed
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {stage.label}
                        </h4>
                        {isCurrent && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Current Status
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delivery Details Card */}
          <div className="rounded-2xl border border-border bg-accent/30 p-4 space-y-2 text-xs">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" /> Delivery Destination
            </h4>
            <p className="text-muted-foreground">
              {typeof order.address === "string"
                ? order.address
                : order.address
                  ? `${order.address.house || ""} ${order.address.street || ""}, ${order.address.area || ""}, ${order.address.city || "Karachi"}`
                  : "Defence Phase 2 Store Pickup"}
            </p>
            <p className="text-muted-foreground font-semibold">
              Customer: {order.customer_name || "Valued Customer"} ({order.customer_phone || "N/A"})
            </p>
          </div>

          {/* Contact Store */}
          <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
            <span className="text-muted-foreground">Questions about your order delivery?</span>
            <a
              href={`https://wa.me/${SITE.phones[0].replace(/\D/g, "")}?text=Hi%20Bismillah%20Milk%20Corner,%20I'm%20checking%20status%20for%20order%20%23${order.order_number || order.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
            >
              <PhoneCall className="h-3.5 w-3.5" /> WhatsApp Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
