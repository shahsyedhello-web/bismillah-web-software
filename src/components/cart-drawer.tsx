import { useShop } from "@/context/shop-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { formatPrice } from "@/lib/catalog";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  X,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const { getWhatsappCartOrderLink } = useSiteSettings();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartSubtotal,
    cartCount,
    isCartOpen,
    setIsCartOpen,
  } = useShop();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-background shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="relative p-2 rounded-full bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Your Shopping Cart
                </h2>
                <p className="text-xs text-muted-foreground">
                  {cartCount} {cartCount === 1 ? "item" : "items"} selected
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-muted text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-medium text-foreground">
                    Your cart is empty
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                    Explore our fresh dairy, authentic khoya, and gourmet ingredients to build your
                    order.
                  </p>
                </div>
                <Button
                  onClick={() => setIsCartOpen(false)}
                  asChild
                  className="rounded-full bg-primary text-primary-foreground px-6 mt-2"
                >
                  <Link to="/products">Browse Catalog</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(({ product, quantity }) => (
                  <div
                    key={product.id || product.slug}
                    className="flex gap-4 p-4 rounded-2xl border border-border bg-card hover:shadow-xs transition-shadow"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/50 border border-border">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                            {product.category}
                          </p>
                          <h4 className="font-display text-sm font-semibold text-foreground line-clamp-1">
                            {product.name}
                          </h4>
                          <p className="text-xs text-primary font-medium mt-0.5">
                            {formatPrice(product.price)}{" "}
                            <span className="text-[10px] text-muted-foreground">
                              ({product.unit})
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(product.slug)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-1 border border-border rounded-full p-0.5 bg-background">
                          <button
                            onClick={() => updateQuantity(product.slug, quantity - 1)}
                            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold text-foreground">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.slug, quantity + 1)}
                            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <p className="text-sm font-bold text-foreground">
                          {formatPrice(product.price * quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={clearCart}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline pt-2 block mx-auto"
                >
                  Clear all cart items
                </button>
              </div>
            )}
          </div>

          {/* Footer / Summary */}
          {cart.length > 0 && (
            <div className="border-t border-border p-6 bg-card space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Delivery (Karachi DHA & Clifton)</span>
                  <span className="text-emerald-600 font-medium">Calculated on Order</span>
                </div>
                <div className="flex justify-between font-display text-lg font-bold text-foreground pt-2 border-t border-border">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatPrice(cartSubtotal)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
                >
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/cart"
                    onClick={() => setIsCartOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    View Full Cart
                  </Link>

                  <a
                    href={getWhatsappCartOrderLink(cart, cartSubtotal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#1da851]"
                  >
                    <MessageSquare className="h-3.5 w-3.5 fill-current" />
                    Quick WhatsApp
                  </a>
                </div>

                <Link
                  to="/quote"
                  onClick={() => setIsCartOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border bg-background/50 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  Request Bulk / Commercial Quote
                </Link>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground text-center pt-1">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Quality Tested · Fresh Daily · Same Day Karachi Delivery</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
