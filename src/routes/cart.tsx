import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useShop } from "@/context/shop-context";
import { validateCoupon } from "@/lib/checkout-service";
import {
  Trash2,
  BookmarkPlus,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Tag,
  Check,
  X,
  Truck,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    saveForLater,
    savedForLater,
    moveToCartFromSaved,
    removeFromSaved,
    cartSubtotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useShop();

  const [couponInput, setCouponInput] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const estimatedDeliveryFee = cartSubtotal >= 3000 || cart.length === 0 ? 0 : 150;
  const grandTotal = Math.max(0, cartSubtotal - discountAmount + estimatedDeliveryFee);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    const result = await validateCoupon(couponInput, cartSubtotal);
    setIsValidatingCoupon(false);

    if (result.success && result.coupon) {
      applyCoupon(result.coupon);
      setCouponInput("");
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 lg:py-12">
      <div className="container-page max-w-7xl">
        {/* Header Breadcrumb */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Shopping Cart
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review your fresh dairy items, apply discount coupons, or save items for later.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline gap-1.5"
          >
            ← Continue Shopping
          </Link>
        </div>

        {cart.length === 0 && savedForLater.length === 0 ? (
          <Card className="border-dashed py-16 text-center shadow-none bg-white">
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <h2 className="font-display text-xl font-bold text-slate-800">
                Your cart is currently empty
              </h2>
              <p className="max-w-md text-sm text-slate-500">
                Explore our authentic fresh milk, matka dahi, khoya, pure desi ghee, and premium
                paneer.
              </p>
              <Button asChild size="lg" className="mt-2 rounded-full px-8">
                <Link to="/products">
                  Explore Products <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Items Column */}
            <div className="space-y-8 lg:col-span-8">
              {/* Active Cart Items */}
              {cart.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Cart Items ({cart.length})
                    </h2>
                    <span className="text-xs font-medium text-slate-500">
                      Guaranteed Fresh & Hygienic
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {cart.map((item) => {
                      const linePrice = item.product.price * item.quantity;
                      return (
                        <div
                          key={item.product.id || item.product.slug}
                          className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          {/* Image & Title */}
                          <div className="flex gap-4 items-start sm:items-center">
                            <img
                              src={item.product.image || item.product.images[0] || SITE.logo}
                              alt={item.product.name}
                              className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                {item.product.category}
                              </span>
                              <h3 className="font-display text-base font-bold text-slate-900">
                                <Link
                                  to="/product/$slug"
                                  params={{ slug: item.product.slug }}
                                  className="hover:text-primary transition-colors"
                                >
                                  {item.product.name}
                                </Link>
                              </h3>
                              <p className="text-xs text-slate-500">
                                SKU: {item.product.sku || item.product.id || "BMC-DAIRY"} | Unit:{" "}
                                {item.product.unit}
                              </p>
                              <div className="flex items-center gap-2 pt-0.5">
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-50 text-emerald-700 text-[10px] border-emerald-200"
                                >
                                  <Check className="mr-1 h-3 w-3" /> In Stock
                                </Badge>
                                <span className="text-xs text-slate-400">|</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Truck className="h-3 w-3 text-slate-400" /> Express 24h
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Controls & Price */}
                          <div className="flex items-center justify-between gap-6 sm:justify-end">
                            {/* Qty Selector */}
                            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.slug, item.quantity - 1)}
                                className="flex h-7 w-7 items-center justify-center rounded bg-white text-slate-600 shadow-xs hover:bg-slate-100"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-slate-800">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.slug, item.quantity + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded bg-white text-slate-600 shadow-xs hover:bg-slate-100"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Price */}
                            <div className="text-right min-w-[90px]">
                              <p className="font-display text-base font-bold text-slate-900">
                                Rs. {linePrice.toLocaleString()}
                              </p>
                              {item.quantity > 1 && (
                                <p className="text-[11px] text-slate-400">
                                  Rs. {item.product.price}/unit
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => saveForLater(item.product.slug)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary transition-colors"
                                title="Save for Later"
                              >
                                <BookmarkPlus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.slug)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Remove Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Saved For Later Section */}
              {savedForLater.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                      <BookmarkPlus className="h-5 w-5 text-primary" />
                      Saved For Later ({savedForLater.length})
                    </h2>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {savedForLater.map((item) => (
                      <div
                        key={item.product.id || item.product.slug}
                        className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex gap-4 items-center">
                          <img
                            src={item.product.image || item.product.images[0] || SITE.logo}
                            alt={item.product.name}
                            className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div>
                            <h3 className="font-display text-sm font-bold text-slate-900">
                              {item.product.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Rs. {item.product.price} / {item.product.unit}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveToCartFromSaved(item.product.slug)}
                            className="rounded-full text-xs font-semibold border-primary text-primary hover:bg-primary hover:text-white"
                          >
                            Move to Cart
                          </Button>
                          <button
                            type="button"
                            onClick={() => removeFromSaved(item.product.slug)}
                            className="text-xs text-slate-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guarantees bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">100% Pure Dairy</h4>
                    <p className="text-[11px] text-slate-500">Zero water & adulteration</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Fast Express Delivery</h4>
                    <p className="text-[11px] text-slate-500">Chilled transport in Karachi</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Freshness Guaranteed</h4>
                    <p className="text-[11px] text-slate-500">Daily morning batches</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Summary Column */}
            <div className="space-y-6 lg:col-span-4">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <h2 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Order Summary
                </h2>

                {/* Coupon Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" /> Apply Coupon Code
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                      <div>
                        <span className="font-bold">{appliedCoupon.code}</span>
                        <p className="text-[11px] text-emerald-600">
                          Saving PKR {appliedCoupon.discountAmount.toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="rounded-full p-1 hover:bg-emerald-100 text-emerald-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <Input
                        placeholder="e.g. WELCOME10"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="uppercase text-xs"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={isValidatingCoupon || !couponInput.trim()}
                        className="shrink-0 text-xs font-semibold"
                      >
                        {isValidatingCoupon ? "Checking..." : "Apply"}
                      </Button>
                    </form>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Try code <strong className="text-slate-600">WELCOME10</strong> for 10% off
                  </p>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 text-sm text-slate-600 border-t border-slate-100 pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">
                      Rs. {cartSubtotal.toLocaleString()}
                    </span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span>- Rs. {discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      Delivery Charges
                      {cartSubtotal >= 3000 && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 text-[10px]"
                        >
                          Free
                        </Badge>
                      )}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {estimatedDeliveryFee === 0 ? "FREE" : `Rs. ${estimatedDeliveryFee}`}
                    </span>
                  </div>

                  {cartSubtotal < 3000 && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg">
                      Add PKR {(3000 - cartSubtotal).toLocaleString()} more to qualify for Free
                      Delivery!
                    </p>
                  )}

                  <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                    <span>Grand Total</span>
                    <span className="font-display text-xl text-primary">
                      Rs. {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={() => navigate({ to: "/checkout" })}
                  disabled={cart.length === 0}
                  size="lg"
                  className="w-full rounded-full py-6 font-semibold text-sm shadow-md"
                >
                  Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Safe & Secure Checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
