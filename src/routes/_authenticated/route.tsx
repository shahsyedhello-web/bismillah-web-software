import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getMockAdminUser } from "@/lib/mock-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let user = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          user = data.user;
        }
      } catch (e) {
        console.error("Supabase getUser error in route guard:", e);
      }
    }
    if (!user && typeof window !== "undefined") {
      const mock = getMockAdminUser();
      if (mock) {
        user = {
          id: mock.id,
          email: mock.email,
          user_metadata: mock.user_metadata,
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };
      }
    }
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
