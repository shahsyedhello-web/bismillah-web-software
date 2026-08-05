
-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','super_admin','staff'));
$$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','super_admin'));
$$;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE, description text, image_url text,
  sort_order int NOT NULL DEFAULT 0, is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "categories admin read all" ON public.categories FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "categories admin insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "categories admin update" ON public.categories FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "categories admin delete" ON public.categories FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  description text, short_description text,
  price numeric(10,2) NOT NULL DEFAULT 0, sale_price numeric(10,2),
  unit text, sku text UNIQUE,
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  thumbnail_url text, storage_instructions text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (is_visible = true AND is_archived = false);
CREATE POLICY "products admin read all" ON public.products FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "products admin insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "products admin update" ON public.products FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "products admin delete" ON public.products FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_visible ON public.products(is_visible, is_archived);

-- PRODUCT IMAGES
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_images public read" ON public.product_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_visible AND NOT p.is_archived));
CREATE POLICY "product_images admin read all" ON public.product_images FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "product_images admin insert" ON public.product_images FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "product_images admin update" ON public.product_images FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "product_images admin delete" ON public.product_images FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- BANNERS
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text, subtitle text, image_url text NOT NULL,
  cta_label text, cta_href text, placement text NOT NULL DEFAULT 'home',
  starts_at timestamptz, ends_at timestamptz,
  is_visible boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read" ON public.banners FOR SELECT TO anon, authenticated
  USING (is_visible = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "banners admin read all" ON public.banners FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "banners admin insert" ON public.banners FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "banners admin update" ON public.banners FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "banners admin delete" ON public.banners FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- TESTIMONIALS
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, role text, quote text NOT NULL,
  rating int CHECK (rating BETWEEN 1 AND 5), avatar_url text,
  is_visible boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials public read" ON public.testimonials FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "testimonials admin read all" ON public.testimonials FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "testimonials admin insert" ON public.testimonials FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "testimonials admin update" ON public.testimonials FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "testimonials admin delete" ON public.testimonials FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- GALLERY
CREATE TABLE public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text, image_url text NOT NULL, category text,
  sort_order int NOT NULL DEFAULT 0, is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery public read" ON public.gallery_items FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "gallery admin read all" ON public.gallery_items FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "gallery admin insert" ON public.gallery_items FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "gallery admin update" ON public.gallery_items FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "gallery admin delete" ON public.gallery_items FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_gallery_updated BEFORE UPDATE ON public.gallery_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- HOMEPAGE
CREATE TABLE public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE, heading text, subheading text, body text, image_url text,
  is_visible boolean NOT NULL DEFAULT true, extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT ALL ON public.homepage_sections TO service_role;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homepage public read" ON public.homepage_sections FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "homepage admin read all" ON public.homepage_sections FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "homepage admin insert" ON public.homepage_sections FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "homepage admin update" ON public.homepage_sections FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "homepage admin delete" ON public.homepage_sections FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_homepage_updated BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- SITE SETTINGS
CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'global',
  shop_name text NOT NULL DEFAULT 'Bismillah Milk Corner',
  logo_url text, favicon_url text, address text, phone text, whatsapp text, email text,
  google_maps_url text, socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb, footer_text text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id = 'global')
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings public read" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_settings admin insert" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "site_settings admin update" ON public.site_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "site_settings super delete" ON public.site_settings FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
INSERT INTO public.site_settings (id, shop_name, phone, whatsapp, address, email)
VALUES ('global', 'Bismillah Milk Corner', '021-35803217', '0313-2025005', '78/C Defence Market, Phase 2, DHA Karachi', 'info@bismillahmilkcorner.pk');

-- ACTIVITY LOGS
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid, action text NOT NULL, entity text NOT NULL,
  entity_id text, meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs admin read" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "activity_logs admin insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "activity_logs super delete" ON public.activity_logs FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, type text NOT NULL, title text NOT NULL, body text,
  entity text, entity_id text, is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications admin read" ON public.notifications FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "notifications admin update" ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "notifications admin insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "notifications super delete" ON public.notifications FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX idx_notifications_unread ON public.notifications(is_read, created_at DESC);

-- EXTEND QUOTATIONS & MESSAGES
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_quotations_updated ON public.quotations;
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_contact_messages_updated ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_updated BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_notify_new_quotation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (type, title, body, entity, entity_id)
  VALUES ('quotation', 'New quotation request', NEW.company_name || ' — ' || NEW.contact_person, 'quotations', NEW.id::text);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_new_quotation AFTER INSERT ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_quotation();

CREATE OR REPLACE FUNCTION public.tg_notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (type, title, body, entity, entity_id)
  VALUES ('message', 'New contact message', NEW.name || ': ' || COALESCE(NEW.subject, '(no subject)'), 'contact_messages', NEW.id::text);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_new_message AFTER INSERT ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_message();

-- ROLE MANAGEMENT
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;
CREATE POLICY "user_roles super manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_user_role(_target_user uuid, _new_role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Only super admins can change roles'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, _new_role);
  INSERT INTO public.activity_logs (actor_user_id, action, entity, entity_id, meta)
  VALUES (auth.uid(), 'role.set', 'user_roles', _target_user::text, jsonb_build_object('role', _new_role));
END; $$;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO authenticated;

UPDATE public.user_roles SET role = 'super_admin'::app_role WHERE role::text = 'admin';

-- PHASE 2 SCAFFOLD TABLES
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE,
  name text, email text, phone text, is_disabled boolean NOT NULL DEFAULT false, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label text, line1 text NOT NULL, line2 text, city text, area text,
  is_default boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE, session_id text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity int NOT NULL DEFAULT 1, unit_price numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL DEFAULT 'BMC-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6),
  customer_id uuid REFERENCES public.customers(id), status text NOT NULL DEFAULT 'pending',
  subtotal numeric(10,2) NOT NULL DEFAULT 0, discount_total numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0, total numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid', payment_method text,
  customer_notes text, admin_notes text, delivery_address jsonb, coupon_code text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id), product_name text NOT NULL,
  unit_price numeric(10,2) NOT NULL, quantity int NOT NULL, line_total numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL, note text, actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  delta int NOT NULL, reason text, actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL, min_order numeric(10,2), max_discount numeric(10,2),
  usage_limit int, used_count int NOT NULL DEFAULT 0,
  starts_at timestamptz, ends_at timestamptz, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, label text NOT NULL, is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method_code text, amount numeric(10,2) NOT NULL, status text NOT NULL DEFAULT 'pending',
  reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, fee numeric(10,2) NOT NULL DEFAULT 0, free_over numeric(10,2),
  eta_minutes int, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.delivery_zones(id), status text NOT NULL DEFAULT 'pending',
  tracking_ref text, dispatched_at timestamptz, delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customers','customer_addresses','carts','cart_items','orders','order_items',
    'order_status_history','inventory_movements','coupons','coupon_redemptions',
    'payment_methods','payments','delivery_zones','shipments'
  ]) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s admin select" ON public.%I FOR SELECT TO authenticated USING (public.is_admin(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "%s admin insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "%s admin update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "%s admin delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))', t, t);
  END LOOP;
END $$;

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_payment_methods_updated BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_delivery_zones_updated BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_shipments_updated BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed homepage sections
INSERT INTO public.homepage_sections (key, heading, subheading, body) VALUES
  ('hero', 'Delivering Uncompromised Freshness', 'Karachi''s trusted dairy partner', 'Fresh milk, yogurt, khoya and traditional dairy — direct from farm to your family.'),
  ('about', 'A family of quality-first dairy', 'Serving DHA Karachi with pride', 'From our counter in Phase 2 to premier clubs across the city, we hand-select every product for freshness.'),
  ('services', 'What we deliver', 'Fresh, on time, every time', 'Home delivery, bulk supply to clubs and restaurants, and custom orders for events.'),
  ('gallery_intro', 'Inside our dairy', 'A look at our craft', 'Photos from our shop, our products, and the clients we proudly serve.')
ON CONFLICT (key) DO NOTHING;

-- Seed initial categories & products from existing site data
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Milk & Dairy', 'milk-dairy', 1),
  ('Yogurt & Khoya', 'yogurt-khoya', 2),
  ('Traditional Sweets', 'sweets', 3),
  ('Snacks & Extras', 'snacks', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (name, slug, price, unit, short_description, is_featured, sort_order, category_id)
SELECT * FROM (VALUES
  ('Fresh Milk', 'fresh-milk', 220, 'per litre', 'Farm-fresh whole milk delivered daily.', true, 1, (SELECT id FROM public.categories WHERE slug='milk-dairy')),
  ('Yogurt', 'yogurt', 360, 'per kg', 'Creamy, thick set yogurt.', true, 2, (SELECT id FROM public.categories WHERE slug='yogurt-khoya')),
  ('Khoya', 'khoya', 1400, 'per kg', 'Rich, traditional khoya for sweets.', true, 3, (SELECT id FROM public.categories WHERE slug='yogurt-khoya')),
  ('Phoolki', 'phoolki', 320, 'per kg', 'Light, airy sweet.', false, 4, (SELECT id FROM public.categories WHERE slug='sweets')),
  ('Roll Patti', 'roll-patti', 360, 'per kg', 'Delicate rolled sweet.', false, 5, (SELECT id FROM public.categories WHERE slug='sweets')),
  ('Samosa', 'samosa', 40, 'each', 'Crispy fried samosa.', false, 6, (SELECT id FROM public.categories WHERE slug='snacks')),
  ('Papri', 'papri', 250, 'per kg', 'Crunchy papri snack.', false, 7, (SELECT id FROM public.categories WHERE slug='snacks')),
  ('Eggs', 'eggs', 0, 'per dozen', 'Fresh eggs at market rate.', false, 8, (SELECT id FROM public.categories WHERE slug='snacks'))
) AS v(name, slug, price, unit, short_description, is_featured, sort_order, category_id)
ON CONFLICT (slug) DO NOTHING;
