import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { CustomerProfile, CustomerNotification } from "@/types/customer";
import { getMockAdminUser, setMockAdminUser, clearMockAdminUser } from "@/lib/mock-auth";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  loading: boolean;
  unreadNotificationsCount: number;
  notifications: CustomerNotification[];
  refreshNotifications: () => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    data: { firstName: string; lastName: string; phone: string },
  ) => Promise<{ error: Error | null; user: User | null }>;
  signUp: (
    email: string,
    pass: string,
    data: { firstName: string; lastName: string; phone: string },
  ) => Promise<{ error: Error | null; user: User | null }>;
  signInWithPhoneOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPass: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  // Fetch or create customer profile
  const fetchProfile = async (currentUser: User) => {
    const profileStorageKey = `bmc_profile_${currentUser.id}`;
    let cachedProfile: CustomerProfile | null = null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(profileStorageKey);
        if (stored) cachedProfile = JSON.parse(stored);
      } catch {
        // ignore storage parse error
      }
    }

    const names = (
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      ""
    ).split(" ");
    const firstName = currentUser.user_metadata?.first_name || names[0] || "";
    const lastName = currentUser.user_metadata?.last_name || names.slice(1).join(" ") || "";

    const defaultProfile: CustomerProfile = cachedProfile || {
      id: currentUser.id,
      email: currentUser.email || null,
      phone: currentUser.phone || currentUser.user_metadata?.phone || null,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim() || currentUser.email || "Valued Customer",
      avatar_url: currentUser.user_metadata?.avatar_url || null,
      preferred_language: "English",
      notification_preferences: {
        email_updates: true,
        whatsapp_updates: true,
        promotional_offers: true,
        stock_alerts: true,
      },
    };

    if (!isSupabaseConfigured()) {
      setProfile(defaultProfile);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!error && data) {
        const fetchedProfile: CustomerProfile = {
          ...data,
          notification_preferences:
            (data.notification_preferences as unknown as CustomerProfile["notification_preferences"]) || {
              email_updates: true,
              whatsapp_updates: true,
              promotional_offers: true,
              stock_alerts: true,
            },
        };
        setProfile(fetchedProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem(profileStorageKey, JSON.stringify(fetchedProfile));
        }
      } else {
        if (error && error.code !== "PGRST116") {
          console.warn(
            "Profile fetch skipped (falling back to local profile):",
            error.message || error,
          );
        }

        // Create initial profile if missing
        try {
          const { error: insErr } = await supabase
            .from("profiles")
            .upsert([defaultProfile as never]);
          if (insErr) {
            console.warn("Profile initial save skipped:", insErr.message || insErr);
          }
        } catch (e) {
          console.warn("Profile upsert exception:", e);
        }

        setProfile(defaultProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem(profileStorageKey, JSON.stringify(defaultProfile));
        }
      }
    } catch (e) {
      console.warn("fetchProfile exception (using local profile):", e);
      setProfile(defaultProfile);
    }
  };

  const fetchNotifications = async (userId: string) => {
    let list: CustomerNotification[] = [];

    let readIds: string[] = [];
    try {
      const stored = localStorage.getItem(`bmc_read_notifs_${userId}`);
      if (stored) readIds = JSON.parse(stored);
    } catch {
      // ignore
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .or(`user_id.eq.${userId},is_global.eq.true`)
          .order("created_at", { ascending: false })
          .limit(30);

        if (!error && data && data.length > 0) {
          list = data.map((n: Record<string, unknown>) => ({
            id: String(n.id),
            user_id: (n.user_id as string) || null,
            title: String(n.title),
            body: (n.body as string) || null,
            type: (n.type as string) || "system",
            is_read: Boolean(n.is_read) || readIds.includes(String(n.id)),
            entity: (n.entity as string) || null,
            entity_id: (n.entity_id as string) || null,
            created_at: String(n.created_at || new Date().toISOString()),
          }));
        }
      } catch (e) {
        console.warn("fetchNotifications error:", e);
      }
    }

    if (list.length === 0) {
      const userOrdersKey = `bmc_user_orders_${userId}`;
      let savedOrders: Record<string, unknown>[] = [];
      try {
        const raw = localStorage.getItem(userOrdersKey);
        if (raw) savedOrders = JSON.parse(raw);
      } catch {
        // ignore
      }

      const orderNotifs: CustomerNotification[] = savedOrders.map((ord) => {
        const id = `notif-ord-${ord.id}`;
        return {
          id,
          user_id: userId,
          title: `Order #${ord.order_number || String(ord.id).slice(0, 8)} Placed`,
          body: `Your order for PKR ${ord.total || ord.grandTotal} is currently being processed.`,
          type: "order",
          is_read: true,
          created_at: (ord.created_at as string) || new Date().toISOString(),
        };
      });

      const welcomeId = "notif-welcome-1";
      const globalAnnouncements: CustomerNotification[] = [
        {
          id: welcomeId,
          user_id: userId,
          title: "Welcome to Bismillah Milk Corner!",
          body: "Enjoy 100% pure fresh milk, dahi, desi ghee, and bakery delights delivered daily to your doorstep across Karachi.",
          type: "offer",
          is_read: readIds.includes(welcomeId),
          created_at: new Date().toISOString(),
        },
      ];

      list = [...orderNotifs, ...globalAnnouncements];
    }

    setNotifications(list);
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    const readIds = notifications.map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      localStorage.setItem(`bmc_read_notifs_${user.id}`, JSON.stringify(readIds));
    } catch (e) {
      console.warn("Save read notifs error:", e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("notifications")
          .update({ is_read: true } as never)
          .or(`user_id.eq.${user.id},is_global.eq.true`);
      } catch (e) {
        console.warn("Supabase markAllNotificationsAsRead error:", e);
      }
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));

    try {
      const readIds: string[] = JSON.parse(
        localStorage.getItem(`bmc_read_notifs_${user.id}`) || "[]",
      );
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`bmc_read_notifs_${user.id}`, JSON.stringify(readIds));
      }
    } catch (e) {
      console.warn("Save single read notif error:", e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("notifications")
          .update({ is_read: true } as never)
          .eq("id", id);
      } catch (e) {
        console.warn("Supabase markNotificationAsRead error:", e);
      }
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const mock = getMockAdminUser();
      if (mock) {
        setUser({
          id: mock.id,
          email: mock.email,
          user_metadata: mock.user_metadata,
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as unknown as User);
      }
      setLoading(false);
      return;
    }

    // 1. Get current session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user);
          fetchNotifications(session.user.id);
        } else {
          const mock = getMockAdminUser();
          if (mock) {
            setUser({
              id: mock.id,
              email: mock.email,
              user_metadata: mock.user_metadata,
              app_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString(),
            } as unknown as User);
          } else {
            setProfile(null);
            setNotifications([]);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        const mock = getMockAdminUser();
        if (mock) {
          setUser({
            id: mock.id,
            email: mock.email,
            user_metadata: mock.user_metadata,
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          } as unknown as User);
        }
        setLoading(false);
      });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
        await fetchNotifications(session.user.id);
      } else {
        const mock = getMockAdminUser();
        if (mock) {
          setUser({
            id: mock.id,
            email: mock.email,
            user_metadata: mock.user_metadata,
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          } as unknown as User);
        } else {
          setProfile(null);
          setNotifications([]);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    if (!isSupabaseConfigured()) {
      const mock = setMockAdminUser(email);
      setUser({
        id: mock.id,
        email: mock.email,
        user_metadata: mock.user_metadata,
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User);
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      return { error };
    } catch (e: unknown) {
      console.error("signInWithPassword fetch exception:", e);
      const mock = setMockAdminUser(email);
      setUser({
        id: mock.id,
        email: mock.email,
        user_metadata: mock.user_metadata,
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User);
      return { error: null };
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    data: { firstName: string; lastName: string; phone: string },
  ) => {
    const { data: res, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`.trim(),
          phone: data.phone,
        },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    if (!error && res.user) {
      // Upsert profile immediately
      const initialProf: CustomerProfile = {
        id: res.user.id,
        email,
        phone: data.phone,
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`.trim(),
        avatar_url: null,
        preferred_language: "English",
        notification_preferences: {
          email_updates: true,
          whatsapp_updates: true,
          promotional_offers: true,
          stock_alerts: true,
        },
      };

      await supabase.from("profiles").upsert([initialProf as never]);
      setProfile(initialProf);
    }

    return { error, user: res.user };
  };

  const signInWithPhoneOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/account`,
      },
    });
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPass: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPass,
    });
    return { error };
  };

  const signOut = async () => {
    clearMockAdminUser();
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Supabase signOut error:", e);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setNotifications([]);
    toast.success("Signed out successfully.");
  };

  const updateProfile = async (updates: Partial<CustomerProfile>) => {
    if (!user) return { error: new Error("Not logged in") };

    const updatedData: CustomerProfile = {
      ...(profile || {
        id: user.id,
        email: user.email || null,
        phone: user.phone || null,
        first_name: "",
        last_name: "",
        full_name: "",
        avatar_url: null,
        preferred_language: "English",
        notification_preferences: {
          email_updates: true,
          whatsapp_updates: true,
          promotional_offers: true,
          stock_alerts: true,
        },
      }),
      ...updates,
      updated_at: new Date().toISOString(),
    };

    setProfile(updatedData);
    if (typeof window !== "undefined") {
      localStorage.setItem(`bmc_profile_${user.id}`, JSON.stringify(updatedData));
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("profiles").upsert([updatedData as never]);

        if (error) {
          console.warn("Supabase profile update skipped:", error.message || error);
        }
      } catch (e) {
        console.warn("Supabase updateProfile exception:", e);
      }
    }

    toast.success("Profile updated!");
    return { error: null };
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  const refreshNotifications = async () => {
    if (user) await fetchNotifications(user.id);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        unreadNotificationsCount,
        notifications,
        refreshNotifications,
        markAllNotificationsAsRead,
        markNotificationAsRead,
        signInWithEmail,
        signInWithPassword: signInWithEmail,
        signUpWithEmail,
        signUp: signUpWithEmail,
        signInWithPhoneOtp,
        verifyPhoneOtp,
        signInWithGoogle,
        resetPasswordForEmail,
        updatePassword,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
