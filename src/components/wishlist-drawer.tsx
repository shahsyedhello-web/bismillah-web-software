import { useShop } from "@/context/shop-context";
import { formatPrice } from "@/lib/catalog";
import { Heart, Trash2, ShoppingBag, X } from "lucide-react";

export function WishlistDrawer() {
  const { wishlist, toggleWishlist, moveToCart, wishlistCount, isWishlistOpen, setIsWishlistOpen } =
    useShop();

  if (!isWishlistOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => setIsWishlistOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-background shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-rose-500/10 text-rose-500">
                <Heart className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Saved Wishlist
                </h2>
                <p className="text-xs text-muted-foreground">
                  {wishlistCount} {wishlistCount === 1 ? "item" : "items"} saved
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsWishlistOpen(false)}
              className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close wishlist"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Wishlist Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {wishlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-muted text-muted-foreground">
                  <Heart className="h-10 w-10 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-medium text-foreground">
                    Your wishlist is empty
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                    Save items you want to reorder regularly by clicking the heart icon on any
                    product card.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {wishlist.map((product) => (
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
                          onClick={() => toggleWishlist(product)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                          aria-label={`Remove ${product.name} from wishlist`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/60">
                        <button
                          onClick={() => moveToCart(product.slug)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Move to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
