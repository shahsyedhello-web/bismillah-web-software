export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: string;
          meta: Json;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          created_at: string;
          cta_href: string | null;
          cta_label: string | null;
          ends_at: string | null;
          id: string;
          image_url: string;
          is_visible: boolean;
          placement: string;
          sort_order: number;
          starts_at: string | null;
          subtitle: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url: string;
          is_visible?: boolean;
          placement?: string;
          sort_order?: number;
          starts_at?: string | null;
          subtitle?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string;
          is_visible?: boolean;
          placement?: string;
          sort_order?: number;
          starts_at?: string | null;
          subtitle?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          cart_id: string;
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          cart_id: string;
          created_at?: string;
          id?: string;
          product_id: string;
          quantity?: number;
          unit_price: number;
        };
        Update: {
          cart_id?: string;
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          created_at: string;
          customer_id: string | null;
          id: string;
          session_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          session_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          session_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_visible: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_visible?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_visible?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          admin_notes: string | null;
          assigned_to: string | null;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          phone: string | null;
          replied_at: string | null;
          status: string;
          subject: string | null;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          phone?: string | null;
          replied_at?: string | null;
          status?: string;
          subject?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          phone?: string | null;
          replied_at?: string | null;
          status?: string;
          subject?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupon_redemptions: {
        Row: {
          coupon_id: string;
          created_at: string;
          customer_id: string | null;
          id: string;
          order_id: string | null;
        };
        Insert: {
          coupon_id: string;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          order_id?: string | null;
        };
        Update: {
          coupon_id?: string;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          order_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          discount_type: string;
          discount_value: number;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          max_discount: number | null;
          min_order: number | null;
          starts_at: string | null;
          updated_at: string;
          usage_limit: number | null;
          used_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          discount_type?: string;
          discount_value: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          min_order?: number | null;
          starts_at?: string | null;
          updated_at?: string;
          usage_limit?: number | null;
          used_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          discount_type?: string;
          discount_value?: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          min_order?: number | null;
          starts_at?: string | null;
          updated_at?: string;
          usage_limit?: number | null;
          used_count?: number;
        };
        Relationships: [];
      };
      customer_addresses: {
        Row: {
          area: string | null;
          city: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          is_default: boolean;
          label: string | null;
          line1: string;
          line2: string | null;
        };
        Insert: {
          area?: string | null;
          city?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          line1: string;
          line2?: string | null;
        };
        Update: {
          area?: string | null;
          city?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          line1?: string;
          line2?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          is_disabled: boolean;
          name: string | null;
          notes: string | null;
          phone: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_disabled?: boolean;
          name?: string | null;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_disabled?: boolean;
          name?: string | null;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      delivery_zones: {
        Row: {
          created_at: string;
          eta_minutes: number | null;
          fee: number;
          free_over: number | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          eta_minutes?: number | null;
          fee?: number;
          free_over?: number | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          eta_minutes?: number | null;
          fee?: number;
          free_over?: number | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gallery_items: {
        Row: {
          category: string | null;
          created_at: string;
          id: string;
          image_url: string;
          is_visible: boolean;
          sort_order: number;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          id?: string;
          image_url: string;
          is_visible?: boolean;
          sort_order?: number;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string;
          is_visible?: boolean;
          sort_order?: number;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      homepage_sections: {
        Row: {
          body: string | null;
          created_at: string;
          extra: Json;
          heading: string | null;
          id: string;
          image_url: string | null;
          is_visible: boolean;
          key: string;
          subheading: string | null;
          updated_at: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          extra?: Json;
          heading?: string | null;
          id?: string;
          image_url?: string | null;
          is_visible?: boolean;
          key: string;
          subheading?: string | null;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          extra?: Json;
          heading?: string | null;
          id?: string;
          image_url?: string | null;
          is_visible?: boolean;
          key?: string;
          subheading?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          delta: number;
          id: string;
          product_id: string;
          reason: string | null;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          delta: number;
          id?: string;
          product_id: string;
          reason?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          delta?: number;
          id?: string;
          product_id?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          entity: string | null;
          entity_id: string | null;
          id: string;
          is_read: boolean;
          title: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          is_read?: boolean;
          title: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          is_read?: boolean;
          title?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total: number;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          id: string;
          note: string | null;
          order_id: string;
          status: string;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          order_id: string;
          status: string;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          order_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          admin_notes: string | null;
          coupon_code: string | null;
          created_at: string;
          customer_id: string | null;
          customer_notes: string | null;
          delivery_address: Json | null;
          delivery_fee: number;
          discount_total: number;
          id: string;
          order_number: string;
          payment_method: string | null;
          payment_status: string;
          status: string;
          subtotal: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          coupon_code?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_notes?: string | null;
          delivery_address?: Json | null;
          delivery_fee?: number;
          discount_total?: number;
          id?: string;
          order_number?: string;
          payment_method?: string | null;
          payment_status?: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          coupon_code?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_notes?: string | null;
          delivery_address?: Json | null;
          delivery_fee?: number;
          discount_total?: number;
          id?: string;
          order_number?: string;
          payment_method?: string | null;
          payment_status?: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_methods: {
        Row: {
          code: string;
          config: Json;
          id: string;
          is_enabled: boolean;
          label: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          config?: Json;
          id?: string;
          is_enabled?: boolean;
          label: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          config?: Json;
          id?: string;
          is_enabled?: boolean;
          label?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method_code: string | null;
          order_id: string;
          reference: string | null;
          status: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method_code?: string | null;
          order_id: string;
          reference?: string | null;
          status?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method_code?: string | null;
          order_id?: string;
          reference?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_archived: boolean;
          is_featured: boolean;
          is_visible: boolean;
          name: string;
          price: number;
          sale_price: number | null;
          short_description: string | null;
          sku: string | null;
          slug: string;
          sort_order: number;
          storage_instructions: string | null;
          tags: string[];
          thumbnail_url: string | null;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_archived?: boolean;
          is_featured?: boolean;
          is_visible?: boolean;
          name: string;
          price?: number;
          sale_price?: number | null;
          short_description?: string | null;
          sku?: string | null;
          slug: string;
          sort_order?: number;
          storage_instructions?: string | null;
          tags?: string[];
          thumbnail_url?: string | null;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_archived?: boolean;
          is_featured?: boolean;
          is_visible?: boolean;
          name?: string;
          price?: number;
          sale_price?: number | null;
          short_description?: string | null;
          sku?: string | null;
          slug?: string;
          sort_order?: number;
          storage_instructions?: string | null;
          tags?: string[];
          thumbnail_url?: string | null;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      quotations: {
        Row: {
          admin_notes: string | null;
          assigned_to: string | null;
          business_type: string | null;
          company_name: string;
          contact_person: string;
          created_at: string;
          delivery_address: string | null;
          delivery_city: string | null;
          email: string;
          id: string;
          phone: string;
          products_required: string;
          quantity: string | null;
          replied_at: string | null;
          required_date: string | null;
          special_requirements: string | null;
          status: string;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          assigned_to?: string | null;
          business_type?: string | null;
          company_name: string;
          contact_person: string;
          created_at?: string;
          delivery_address?: string | null;
          delivery_city?: string | null;
          email: string;
          id?: string;
          phone: string;
          products_required: string;
          quantity?: string | null;
          replied_at?: string | null;
          required_date?: string | null;
          special_requirements?: string | null;
          status?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          assigned_to?: string | null;
          business_type?: string | null;
          company_name?: string;
          contact_person?: string;
          created_at?: string;
          delivery_address?: string | null;
          delivery_city?: string | null;
          email?: string;
          id?: string;
          phone?: string;
          products_required?: string;
          quantity?: string | null;
          replied_at?: string | null;
          required_date?: string | null;
          special_requirements?: string | null;
          status?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      shipments: {
        Row: {
          created_at: string;
          delivered_at: string | null;
          dispatched_at: string | null;
          id: string;
          order_id: string;
          status: string;
          tracking_ref: string | null;
          updated_at: string;
          zone_id: string | null;
        };
        Insert: {
          created_at?: string;
          delivered_at?: string | null;
          dispatched_at?: string | null;
          id?: string;
          order_id: string;
          status?: string;
          tracking_ref?: string | null;
          updated_at?: string;
          zone_id?: string | null;
        };
        Update: {
          created_at?: string;
          delivered_at?: string | null;
          dispatched_at?: string | null;
          id?: string;
          order_id?: string;
          status?: string;
          tracking_ref?: string | null;
          updated_at?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          address: string | null;
          business_hours: Json;
          email: string | null;
          favicon_url: string | null;
          footer_text: string | null;
          google_maps_url: string | null;
          id: string;
          logo_url: string | null;
          phone: string | null;
          shop_name: string;
          socials: Json;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          business_hours?: Json;
          email?: string | null;
          favicon_url?: string | null;
          footer_text?: string | null;
          google_maps_url?: string | null;
          id?: string;
          logo_url?: string | null;
          phone?: string | null;
          shop_name?: string;
          socials?: Json;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          business_hours?: Json;
          email?: string | null;
          favicon_url?: string | null;
          footer_text?: string | null;
          google_maps_url?: string | null;
          id?: string;
          logo_url?: string | null;
          phone?: string | null;
          shop_name?: string;
          socials?: Json;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          id: string;
          is_visible: boolean;
          name: string;
          quote: string;
          rating: number | null;
          role: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          is_visible?: boolean;
          name: string;
          quote: string;
          rating?: number | null;
          role?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          is_visible?: boolean;
          name?: string;
          quote?: string;
          rating?: number | null;
          role?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          area: string | null;
          city: string | null;
          created_at: string;
          house: string | null;
          id: string;
          instructions: string | null;
          is_default: boolean;
          label: string | null;
          phone: string | null;
          province: string | null;
          recipient_name: string | null;
          street: string | null;
          user_id: string;
        };
        Insert: {
          area?: string | null;
          city?: string | null;
          created_at?: string;
          house?: string | null;
          id?: string;
          instructions?: string | null;
          is_default?: boolean;
          label?: string | null;
          phone?: string | null;
          province?: string | null;
          recipient_name?: string | null;
          street?: string | null;
          user_id: string;
        };
        Update: {
          area?: string | null;
          city?: string | null;
          created_at?: string;
          house?: string | null;
          id?: string;
          instructions?: string | null;
          is_default?: boolean;
          label?: string | null;
          phone?: string | null;
          province?: string | null;
          recipient_name?: string | null;
          street?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          first_name: string | null;
          full_name: string | null;
          id: string;
          last_name: string | null;
          notification_preferences: Json | null;
          phone: string | null;
          preferred_language: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          id: string;
          last_name?: string | null;
          notification_preferences?: Json | null;
          phone?: string | null;
          preferred_language?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          id?: string;
          last_name?: string | null;
          notification_preferences?: Json | null;
          phone?: string | null;
          preferred_language?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      recently_viewed: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          viewed_at?: string;
        };
        Relationships: [];
      };
      support_messages: {
        Row: {
          created_at: string;
          id: string;
          image_url: string | null;
          message: string;
          sender_id: string;
          sender_type: string;
          ticket_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          message: string;
          sender_id: string;
          sender_type: string;
          ticket_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          message?: string;
          sender_id?: string;
          sender_type?: string;
          ticket_id?: string;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          priority: string;
          status: string;
          subject: string;
          ticket_number: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject: string;
          ticket_number?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject?: string;
          ticket_number?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      wishlist: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          is_disabled: boolean;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_disabled?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_disabled?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      is_super_admin: { Args: { _user_id: string }; Returns: boolean };
      set_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"];
          _target_user: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "staff";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super_admin", "staff"],
    },
  },
} as const;
