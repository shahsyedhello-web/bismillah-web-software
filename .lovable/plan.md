# Phase 1 Admin Panel — Bismillah Milk Corner

Build a full admin panel on top of the current site without changing any public page behavior. Phase 2 modules are prepared at the DB layer only — no UI, no server logic.

## Public site — no changes

Home, About, Products, Gallery, Company Profile, Quote, Contact keep current behavior. `/auth` and `/_authenticated` gate stays as-is. Only the admin surface at `/admin/*` is expanded, and `products.tsx` / `gallery.tsx` / homepage start reading a few CMS-managed fields from Supabase with a static fallback so nothing visually regresses.

## Database (single migration)

Phase-1 tables (with GRANTs + RLS + admin-only policies via `has_role`):

- `admin_role` enum: `super_admin`, `staff` — extend existing `app_role` with these values (keep `admin`, `user` for compatibility; treat legacy `admin` = `super_admin`).
- `categories` — name, slug (unique), description, image_url, sort_order, is_visible.
- `products` — name, slug (unique), category_id, description, short_description, price, sale_price, unit, sku, is_featured, is_visible, is_archived, sort_order, thumbnail_url, storage_instructions.
- `product_images` — product_id, url, sort_order.
- `banners` — title, subtitle, image_url, cta_label, cta_href, placement, starts_at, ends_at, is_visible, sort_order.
- `testimonials` — name, role, quote, rating, avatar_url, is_visible, sort_order.
- `gallery_items` — title, image_url, category, sort_order, is_visible.
- `homepage_sections` — key (unique: `hero`, `about`, `services`, `gallery_intro`), heading, subheading, body, image_url, is_visible.
- `site_settings` — singleton row keyed by `id='global'`: shop_name, logo_url, favicon_url, address, phone, whatsapp, email, google_maps_url, socials (jsonb), business_hours (jsonb), footer_text.
- `activity_logs` — actor_user_id, action, entity, entity_id, meta jsonb, created_at.
- `notifications` — user_id (nullable = broadcast to admins), type, title, body, entity, entity_id, is_read, created_at.

Phase-2 architecture-only tables (schema + RLS admin-only reads, no app code touches them yet):

- `customers`, `customer_addresses`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `inventory_movements`, `coupons`, `coupon_redemptions`, `payment_methods`, `payments`, `delivery_zones`, `shipments`.

FK to `products.id`, `customers.id`, `orders.id` chosen carefully so Phase 2 can add UI without schema changes. All tables have `created_at`, `updated_at` + trigger, RLS on, admin-only policies via `public.has_role(auth.uid(),'super_admin' OR 'staff')`. `products/categories/banners/testimonials/gallery_items/homepage_sections/site_settings` also get narrow `TO anon SELECT` policies filtered to `is_visible = true` so the public site can read them.

Existing `quotations` and `contact_messages` gain `assigned_to`, `admin_notes`, `replied_at`, and status enum columns.

## Storage

Single `bmc-media` public bucket with prefix folders: `products/`, `categories/`, `gallery/`, `banners/`, `logos/`, `testimonials/`. RLS: public SELECT, admin (staff+) INSERT/UPDATE/DELETE via `has_role`.

## Roles

Extend `has_role` usage: `super_admin` = full access, `staff` = everything except managing admin users, site_settings destructive changes, and activity_log purge. A single security-definer `public.is_admin(uid)` returns true for either role; policies use `is_admin` for read, `has_role(...,'super_admin')` for privileged writes.

## Admin panel structure

New route tree under `src/routes/_authenticated/admin/`:

```text
_authenticated/admin/
  route.tsx           sidebar layout + top bar + global search + notif bell
  index.tsx           dashboard (KPIs + recent activity + charts placeholders)
  quotations.tsx      list/detail/status/notes/CSV export
  messages.tsx        list/detail/reply-mark/notes/CSV export
  products.index.tsx  table + search/filter/pagination
  products.new.tsx
  products.$id.tsx    edit + image manager (drag/drop, compress client-side)
  categories.tsx      CRUD + image
  gallery.tsx         upload grid, categorize, reorder, delete
  banners.tsx         CRUD, schedule, preview
  testimonials.tsx    CRUD
  homepage.tsx        edit hero/about/services/gallery_intro blocks
  settings.tsx        site_settings form (logo, contact, hours, socials)
  admins.tsx          super_admin only: invite/list/change role/disable
  activity.tsx        activity_logs viewer with filters
  notifications.tsx   list + mark read
```

Redirect `/admin` → `/admin` (index). Old flat `/_authenticated/admin.tsx` is replaced by this folder (moves quotation + messages views into their own routes).

## Data access

All admin reads/writes go through TanStack Query using the browser `supabase` client under the `_authenticated` gate (RLS enforces admin). Uploads use `supabase.storage`. No new server functions required for Phase 1 CRUD.

Activity log + notification writes happen from DB triggers on `products`, `categories`, `quotations`, `contact_messages`, `orders` (future), `banners`, `testimonials` — one trigger function inserts into both tables so app code stays clean.

## Public site wiring (minimal, safe)

- Header/footer read `site_settings` via a small hook with fallback to `SITE` constants in `src/lib/site-data.ts` so if the row is missing the site still renders.
- `products.tsx` and homepage featured products query `products` where `is_visible AND NOT is_archived`, fallback to the static list.
- `gallery.tsx` queries `gallery_items` fallback to static.
- Testimonials/banners/homepage_sections queried where used; fallbacks retained.
- `quote.tsx` and `contact.tsx` submission code unchanged.

## UI

shadcn Sidebar (collapsible icon), Tanstack Table for lists, `sonner` toasts, `AlertDialog` for destructive confirmations, `Skeleton` loading, empty states, dark/light already supported via existing theme tokens. Charts via `recharts` (already common with shadcn) — dashboard shows submissions/week and quotations by status; product/order revenue charts show a "Phase 2" empty state.

## Security

- RLS on every table; policies use `is_admin` / `has_role`.
- Client-side Zod validation on every form; server enforces via RLS + column checks.
- Storage: file type + size limits enforced in upload helper (max 5 MB, image/*).
- Activity logs write actor from `auth.uid()` inside DB trigger (not trusted from client).
- `admins.tsx` role changes call a `SECURITY DEFINER` function `public.set_user_role(target uuid, new_role app_role)` that checks caller is `super_admin`.

## Deliverables order

1. Migration (schema + RLS + GRANTs + triggers + storage policies).
2. Storage bucket `bmc-media`.
3. Shared admin shell (sidebar, header, search, notifications).
4. Dashboard.
5. Quotations + Messages (port existing).
6. Categories → Products → Product images.
7. Gallery, Banners, Testimonials, Homepage sections, Site settings.
8. Admins (super_admin only) + Activity + Notifications.
9. Public site wiring to read from new tables with fallbacks.
10. Verify build + smoke test key flows.

## Explicitly out of scope (Phase 2)

Cart, checkout, orders UI, order workflow, inventory UI, coupons UI, payments, delivery, sales reports/exports of revenue, customer accounts, analytics. Their tables exist but no routes/components/queries are added.
