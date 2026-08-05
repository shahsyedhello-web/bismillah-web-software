import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import type { CatalogProduct } from "@/lib/catalog";

export type CartItem = {
  product: CatalogProduct;
  quantity: number;
};

export type ProductReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  image?: string;
};

export type AppliedCouponInfo = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
};

type ShopContextType = {
  // Cart
  cart: CartItem[];
  addToCart: (product: CatalogProduct, quantity?: number) => void;
  removeFromCart: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Saved For Later
  savedForLater: CartItem[];
  saveForLater: (slug: string) => void;
  moveToCartFromSaved: (slug: string) => void;
  removeFromSaved: (slug: string) => void;

  // Coupons
  appliedCoupon: AppliedCouponInfo | null;
  applyCoupon: (coupon: AppliedCouponInfo) => void;
  removeCoupon: () => void;

  // Wishlist
  wishlist: CatalogProduct[];
  toggleWishlist: (product: CatalogProduct) => void;
  isInWishlist: (slug: string) => boolean;
  moveToCart: (slug: string) => void;
  wishlistCount: number;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;

  // Search Modal
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Quick View
  quickViewProduct: CatalogProduct | null;
  setQuickViewProduct: (product: CatalogProduct | null) => void;

  // Recently Viewed
  recentlyViewed: CatalogProduct[];
  addRecentlyViewed: (product: CatalogProduct) => void;

  // Reviews
  reviews: Record<string, ProductReview[]>;
  addReview: (productSlug: string, review: Omit<ProductReview, "id" | "date" | "verified">) => void;
  deleteReview: (productSlug: string, reviewId: string) => void;
};

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const LOCAL_STORAGE_CART_KEY = "bmc_shop_cart_v1";
const LOCAL_STORAGE_SAVED_KEY = "bmc_shop_saved_v1";
const LOCAL_STORAGE_WISHLIST_KEY = "bmc_shop_wishlist_v1";
const LOCAL_STORAGE_RECENT_KEY = "bmc_shop_recent_v1";
const LOCAL_STORAGE_REVIEWS_KEY = "bmc_shop_reviews_v1";

const INITIAL_REVIEWS: Record<string, ProductReview[]> = {
  "fresh-milk": [
    {
      id: "rev-1",
      author: "Farhan Siddiqui (Head Chef, Beach View Club)",
      rating: 5,
      date: "2026-07-28",
      comment:
        "Bismillah Milk Corner has supplied our commercial kitchen for over 3 years. The cream content and bacterial purity in their fresh milk are unbeatable in Karachi.",
      verified: true,
    },
    {
      id: "rev-2",
      author: "Mrs. Tariq",
      rating: 5,
      date: "2026-07-24",
      comment:
        "Pure milk without water dilution. Brings back childhood memory of true dairy taste!",
      verified: true,
    },
  ],
  yogurt: [
    {
      id: "rev-3",
      author: "Chef Haris (Creek Club)",
      rating: 5,
      date: "2026-07-25",
      comment:
        "Their matka set yogurt has the perfect firmness for marinations and raita. Highly recommended!",
      verified: true,
    },
  ],
  "authentic-khoya": [
    {
      id: "rev-4",
      author: "Kamran Sweets",
      rating: 5,
      date: "2026-07-20",
      comment:
        "Slow-reduced authentic khoya with zero starch fillers. Essential for our daily gulab jamuns.",
      verified: true,
    },
  ],
};

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedForLater, setSavedForLater] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(null);
  const [wishlist, setWishlist] = useState<CatalogProduct[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<CatalogProduct[]>([]);
  const [reviews, setReviews] = useState<Record<string, ProductReview[]>>(INITIAL_REVIEWS);

  const isLoadedRef = React.useRef(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState<CatalogProduct | null>(null);

  // Restore from localStorage post-mount to guarantee SSR == Client initial render matching
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
      if (storedCart) setCart(JSON.parse(storedCart));

      const storedSaved = localStorage.getItem(LOCAL_STORAGE_SAVED_KEY);
      if (storedSaved) setSavedForLater(JSON.parse(storedSaved));

      const storedWishlist = localStorage.getItem(LOCAL_STORAGE_WISHLIST_KEY);
      if (storedWishlist) setWishlist(JSON.parse(storedWishlist));

      const storedRecent = localStorage.getItem(LOCAL_STORAGE_RECENT_KEY);
      if (storedRecent) setRecentlyViewed(JSON.parse(storedRecent));

      const storedReviews = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
      if (storedReviews) setReviews((prev) => ({ ...prev, ...JSON.parse(storedReviews) }));
    } catch (e) {
      console.error("Failed to restore shop context from localStorage", e);
    } finally {
      isLoadedRef.current = true;
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cart]);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_KEY, JSON.stringify(savedForLater));
    } catch (e) {
      console.error("Failed to save savedForLater to localStorage", e);
    }
  }, [savedForLater]);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_WISHLIST_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error("Failed to save wishlist to localStorage", e);
    }
  }, [wishlist]);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_RECENT_KEY, JSON.stringify(recentlyViewed));
    } catch (e) {
      console.error("Failed to save recently viewed to localStorage", e);
    }
  }, [recentlyViewed]);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
    } catch (e) {
      console.error("Failed to save reviews to localStorage", e);
    }
  }, [reviews]);

  // Cart Handlers
  const addToCart = (product: CatalogProduct, quantity = 1) => {
    if (product.stockStatus === "out_of_stock") {
      toast.error(`${product.name} is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.slug === product.slug);
      if (existing) {
        return prev.map((item) =>
          item.product.slug === product.slug
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity }];
    });

    toast.success(
      `Added ${quantity} ${product.unit.startsWith("per") ? "" : "x"} ${product.name} to cart`,
      {
        description: "Click your cart icon anytime to review or place order.",
        action: {
          label: "View Cart",
          onClick: () => setIsCartOpen(true),
        },
      },
    );
  };

  const removeFromCart = (slug: string) => {
    setCart((prev) => prev.filter((item) => item.product.slug !== slug));
    toast.info("Item removed from cart");
  };

  const updateQuantity = (slug: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(slug);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.slug === slug ? { ...item, quantity } : item)),
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  // Save for later
  const saveForLater = (slug: string) => {
    const item = cart.find((i) => i.product.slug === slug);
    if (!item) return;
    setCart((prev) => prev.filter((i) => i.product.slug !== slug));
    setSavedForLater((prev) => {
      const exists = prev.find((i) => i.product.slug === slug);
      if (exists) {
        return prev.map((i) =>
          i.product.slug === slug ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...prev, item];
    });
    toast.success(`Saved "${item.product.name}" for later`);
  };

  const moveToCartFromSaved = (slug: string) => {
    const item = savedForLater.find((i) => i.product.slug === slug);
    if (!item) return;
    setSavedForLater((prev) => prev.filter((i) => i.product.slug !== slug));
    addToCart(item.product, item.quantity);
  };

  const removeFromSaved = (slug: string) => {
    setSavedForLater((prev) => prev.filter((i) => i.product.slug !== slug));
    toast.info("Removed item from Saved for Later");
  };

  // Coupons
  const applyCoupon = (coupon: AppliedCouponInfo) => {
    setAppliedCoupon(coupon);
    toast.success(`Coupon "${coupon.code}" applied!`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Coupon removed");
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + (item.product.price > 0 ? item.product.price * item.quantity : 0),
    0,
  );

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Wishlist Handlers
  const toggleWishlist = (product: CatalogProduct) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.slug === product.slug);
      if (exists) {
        toast.info(`Removed ${product.name} from wishlist`);
        return prev.filter((item) => item.slug !== product.slug);
      } else {
        toast.success(`Saved ${product.name} to wishlist`, {
          action: {
            label: "View Wishlist",
            onClick: () => setIsWishlistOpen(true),
          },
        });
        return [...prev, product];
      }
    });
  };

  const isInWishlist = (slug: string) => wishlist.some((item) => item.slug === slug);

  const moveToCart = (slug: string) => {
    const item = wishlist.find((p) => p.slug === slug);
    if (item) {
      addToCart(item, 1);
      setWishlist((prev) => prev.filter((p) => p.slug !== slug));
    }
  };

  const wishlistCount = wishlist.length;

  // Recently Viewed Handler
  const addRecentlyViewed = (product: CatalogProduct) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.slug !== product.slug);
      return [product, ...filtered].slice(0, 10);
    });
  };

  // Review Handlers
  const addReview = (
    productSlug: string,
    reviewData: Omit<ProductReview, "id" | "date" | "verified">,
  ) => {
    const newRev: ProductReview = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      verified: true,
    };

    setReviews((prev) => ({
      ...prev,
      [productSlug]: [newRev, ...(prev[productSlug] || [])],
    }));

    toast.success("Thank you! Your product review has been published.");
  };

  const deleteReview = (productSlug: string, reviewId: string) => {
    setReviews((prev) => ({
      ...prev,
      [productSlug]: (prev[productSlug] || []).filter((r) => r.id !== reviewId),
    }));
    toast.info("Review deleted.");
  };

  return (
    <ShopContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartSubtotal,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        savedForLater,
        saveForLater,
        moveToCartFromSaved,
        removeFromSaved,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        wishlist,
        toggleWishlist,
        isInWishlist,
        moveToCart,
        wishlistCount,
        isWishlistOpen,
        setIsWishlistOpen,
        isSearchOpen,
        setIsSearchOpen,
        searchQuery,
        setSearchQuery,
        quickViewProduct,
        setQuickViewProduct,
        recentlyViewed,
        addRecentlyViewed,
        reviews,
        addReview,
        deleteReview,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}
