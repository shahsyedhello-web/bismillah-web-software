import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Search,
  ShoppingBag,
  Heart,
  Phone,
  MessageCircle,
  User as UserIcon,
  Bell,
} from "lucide-react";
import { SITE } from "@/lib/site-data";
import { useShop } from "@/context/shop-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { useAuth } from "@/context/auth-context";

const LOGO_SRC = SITE.logo;

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/products", label: "Products" },
  { to: "/gallery", label: "Gallery" },
  { to: "/company-profile", label: "Company Profile" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { shopName, phoneLink, whatsappLink } = useSiteSettings();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { cartCount, wishlistCount, setIsCartOpen, setIsWishlistOpen, setIsSearchOpen } = useShop();
  const { user, profile, unreadNotificationsCount } = useAuth();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-40 w-full transition-all duration-300 " +
        (scrolled
          ? "border-b border-border/70 bg-background/85 backdrop-blur-xl shadow-[var(--shadow-soft)]"
          : "bg-background/60 backdrop-blur-md")
      }
    >
      <div className="container-page flex h-18 min-h-16 items-center justify-between py-3">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0" aria-label={`${shopName} — home`}>
          <img
            src={LOGO_SRC}
            alt={`${shopName} logo`}
            width={120}
            height={120}
            className="h-[45px] w-auto rounded-full object-contain ring-2 ring-primary/10 sm:h-[52px] lg:h-[58px]"
          />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold text-primary sm:text-lg lg:text-xl">
              {shopName}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-[11px]">
              {SITE.tagline}
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-primary"
              activeProps={{ className: "text-primary bg-accent" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Header Actions (Search, Wishlist, Cart, Quote) */}
        <div className="flex items-center gap-2">
          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-all"
            aria-label="Search catalog"
          >
            <Search className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden md:inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={() => setIsWishlistOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent hover:text-rose-500 transition-colors"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" />
            {mounted && wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            {mounted && cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-background">
                {cartCount}
              </span>
            )}
          </button>

          {/* Account / Login Button */}
          <Link
            to={mounted && user ? "/account" : "/account/login"}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-primary hover:text-primary transition-colors"
            title={mounted && user ? profile?.full_name || "My Account" : "Sign In"}
            aria-label={mounted && user ? "My Account" : "Sign In"}
          >
            {mounted && user && profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
            {mounted && unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadNotificationsCount}
              </span>
            )}
          </Link>

          {/* Request Quote Button */}
          <Link
            to="/quote"
            className="hidden sm:inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Request Quote
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {open && (
        <div id="mobile-nav" className="lg:hidden border-t border-border bg-background shadow-xl">
          <div className="container-page flex items-center gap-3 pt-4 pb-2">
            <img
              src={SITE.logo}
              alt={`${shopName} logo`}
              width={48}
              height={48}
              className="h-10 w-10 rounded-full object-contain ring-2 ring-primary/10"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold text-primary">{shopName}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {SITE.tagline}
              </span>
            </div>
          </div>

          <nav className="container-page flex flex-col gap-1 pb-4 pt-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-4 py-3 text-base font-medium text-foreground/85 hover:bg-accent"
                activeProps={{ className: "text-primary bg-accent font-semibold" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}

            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border">
              <button
                onClick={() => {
                  setOpen(false);
                  setIsWishlistOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-semibold text-foreground bg-card"
              >
                <Heart className="h-4 w-4 text-rose-500" />
                Wishlist ({wishlistCount})
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  setIsCartOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground"
              >
                <ShoppingBag className="h-4 w-4" />
                Cart ({cartCount})
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <a
                href={phoneLink}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                <Phone className="h-4 w-4 text-primary" />
                Call Us
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs font-semibold text-white hover:bg-[#1da851]"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>

            <Link
              to="/quote"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-accent text-primary border border-primary/20 px-5 py-3 text-sm font-semibold"
            >
              Request Commercial Quotation
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
