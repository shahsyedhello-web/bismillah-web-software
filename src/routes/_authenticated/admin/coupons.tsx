import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { Coupon } from "@/types/checkout";
import { Ticket, Plus, Trash2, Check, X, RefreshCw, Tag, Percent, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: AdminCouponsPage,
});

function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrder, setMinOrder] = useState<number | undefined>(500);
  const [maxDiscount, setMaxDiscount] = useState<number | undefined>(undefined);
  const [usageLimit, setUsageLimit] = useState<number | undefined>(undefined);
  const [endsAt, setEndsAt] = useState<string>("");

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const fetched = (data as unknown as Coupon[]) || [];
      setCoupons(fetched);
      if (typeof window !== "undefined") {
        localStorage.setItem("bmc_coupons", JSON.stringify(fetched));
      }
    } catch (e) {
      const err = e as Error;
      console.error("Error fetching coupons:", e);
      if (typeof window !== "undefined") {
        try {
          const cached = JSON.parse(localStorage.getItem("bmc_coupons") || "[]");
          setCoupons(cached);
        } catch (_) {
          console.warn("Failed parsing cached coupons");
        }
      }
      toast.error(err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order: minOrder ? Number(minOrder) : null,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        usage_limit: usageLimit ? Number(usageLimit) : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_active: true,
      };

      const { data, error } = await supabase.from("coupons").insert([payload]).select().single();
      if (error) throw error;

      toast.success(`Coupon "${code.toUpperCase()}" created successfully!`);
      setCoupons((prev) => [data as unknown as Coupon, ...prev]);
      setIsModalOpen(false);
      resetForm();
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Failed to create coupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;

      toast.success(`Coupon "${coupon.code}" ${!coupon.is_active ? "activated" : "deactivated"}`);
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !coupon.is_active } : c)),
      );
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    toast.success("Coupon deleted.");

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("coupons").delete().eq("id", id);
      } catch (e) {
        console.warn("Coupon deletion warning:", e);
      }
    }
  };

  const resetForm = () => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue(10);
    setMinOrder(500);
    setMaxDiscount(undefined);
    setUsageLimit(undefined);
    setEndsAt("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Coupons & Discounts
          </h1>
          <p className="text-sm text-slate-500">
            Create promotional discount codes for percentage or fixed price price reductions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCoupons} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Coupon
          </Button>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Ticket className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No custom coupons found</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Coupon" to create your first promotional discount code.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Code</TableHead>
                <TableHead className="font-bold">Type & Value</TableHead>
                <TableHead className="font-bold">Min Order</TableHead>
                <TableHead className="font-bold">Usage</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold text-slate-900 tracking-wider font-mono text-sm">
                    {c.code}
                  </TableCell>

                  <TableCell>
                    <div className="font-semibold text-slate-800">
                      {c.discount_type === "percentage"
                        ? `${c.discount_value}% OFF`
                        : `PKR ${c.discount_value} OFF`}
                    </div>
                    {c.max_discount && (
                      <div className="text-[11px] text-slate-400">
                        Max Cap: PKR {c.max_discount}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    {c.min_order ? `PKR ${c.min_order}` : "None"}
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    {c.used_count || 0} {c.usage_limit ? `/ ${c.usage_limit}` : "used"}
                  </TableCell>

                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(c)}
                      className="inline-flex items-center gap-1 cursor-pointer"
                    >
                      {c.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400">
                          Inactive
                        </Badge>
                      )}
                    </button>
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCoupon(c.id)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Coupon Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">Create Coupon</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="code" className="text-xs font-semibold">
                Coupon Code *
              </Label>
              <Input
                id="code"
                placeholder="e.g. WELCOME10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="uppercase mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Discount Type</Label>
                <Select
                  value={discountType}
                  onValueChange={(val: "percentage" | "fixed") => setDiscountType(val)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (PKR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discountValue" className="text-xs font-semibold">
                  Value *
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  placeholder="10 or 500"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="minOrder" className="text-xs font-semibold">
                  Min Order (PKR)
                </Label>
                <Input
                  id="minOrder"
                  type="number"
                  placeholder="500"
                  value={minOrder || ""}
                  onChange={(e) => setMinOrder(e.target.value ? Number(e.target.value) : undefined)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="maxDiscount" className="text-xs font-semibold">
                  Max Cap (PKR)
                </Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  placeholder="Optional"
                  value={maxDiscount || ""}
                  onChange={(e) =>
                    setMaxDiscount(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="usageLimit" className="text-xs font-semibold">
                  Usage Limit
                </Label>
                <Input
                  id="usageLimit"
                  type="number"
                  placeholder="e.g. 100"
                  value={usageLimit || ""}
                  onChange={(e) =>
                    setUsageLimit(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="endsAt" className="text-xs font-semibold">
                  Expiry Date
                </Label>
                <Input
                  id="endsAt"
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Save Coupon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
