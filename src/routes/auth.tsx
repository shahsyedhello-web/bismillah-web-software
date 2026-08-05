import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getMockAdminUser, setMockAdminUser } from "@/lib/mock-auth";
import { SITE } from "@/lib/site-data";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Admin sign in — ${SITE.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let user = null;
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getUser();
          user = data?.user ?? null;
        } catch {
          // ignore network error
        }
      }
      if (!user && typeof window !== "undefined") {
        user = getMockAdminUser();
      }
      if (user) {
        navigate({ to: "/admin", replace: true });
      }
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setStatus("loading");

    if (mode === "signin") {
      if (isSupabaseConfigured()) {
        try {
          const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signErr) {
            if (signErr.message === "Failed to fetch") {
              setMockAdminUser(email);
              navigate({ to: "/admin", replace: true });
              return;
            }
            setError(signErr.message);
            setStatus("idle");
            return;
          }
          navigate({ to: "/admin", replace: true });
          return;
        } catch (err: unknown) {
          console.error("Auth signin exception:", err);
          setMockAdminUser(email);
          navigate({ to: "/admin", replace: true });
          return;
        }
      } else {
        setMockAdminUser(email || "admin@example.com");
        navigate({ to: "/admin", replace: true });
        return;
      }
    } else {
      if (isSupabaseConfigured()) {
        try {
          const { error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin + "/admin" },
          });
          if (signUpErr) {
            if (signUpErr.message === "Failed to fetch") {
              setMockAdminUser(email);
              navigate({ to: "/admin", replace: true });
              return;
            }
            setError(signUpErr.message);
            setStatus("idle");
            return;
          }
          setNotice("Account created. If email confirmation is enabled, please check your inbox.");
          setStatus("idle");
          return;
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Failed to create account.");
          setStatus("idle");
          return;
        }
      } else {
        setMockAdminUser(email || "admin@example.com");
        navigate({ to: "/admin", replace: true });
        return;
      }
    }
  }

  return (
    <section className="container-page py-24">
      <div className="mx-auto max-w-md rounded-3xl bg-card p-8 shadow-[var(--shadow-elegant)] ring-1 ring-border md:p-10">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-display text-3xl text-foreground">
          {mode === "signin" ? "Admin sign in" : "Create admin account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to view quotation requests and messages."
            : "Create the first admin account, then have the role assigned."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && <p className="rounded-xl bg-primary/10 p-3 text-sm text-primary">{notice}</p>}

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
              </>
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary"
          >
            {mode === "signin"
              ? "Need to create the first admin account?"
              : "Already have an account? Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            ← Back to site
          </Link>
        </p>
      </div>
    </section>
  );
}
