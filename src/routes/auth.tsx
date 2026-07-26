import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bot, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Xevor AI" }, { name: "description", content: "Sign in to Xevor AI." }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) nav({ to: "/dashboard" });
  }, [session, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { display_name: name } },
        });
        if (error) throw error;
        toast.success("Account created! Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* 3D scene */}
      <div className="scene-3d absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="cube" style={{ width: 260, height: 260, transform: "translateZ(-200px)" }}>
          {[
            { t: "rotateY(0deg) translateZ(130px)" },
            { t: "rotateY(90deg) translateZ(130px)" },
            { t: "rotateY(180deg) translateZ(130px)" },
            { t: "rotateY(-90deg) translateZ(130px)" },
            { t: "rotateX(90deg) translateZ(130px)" },
            { t: "rotateX(-90deg) translateZ(130px)" },
          ].map((f, i) => (
            <div key={i} className="cube-face" style={{ transform: f.t }} />
          ))}
        </div>
      </div>

      <div className="card-3d relative z-10 w-full max-w-md">
        <div className="glass rounded-2xl p-8" style={{ boxShadow: "var(--shadow-glow-accent)" }}>
          <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-6">
            <Bot className="text-primary" />
            <span className="text-gradient">Xevor AI</span>
          </Link>
          <h1 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in to your Xevor account." : "Start with 100 free credits."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <input
                required
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            )}
            <input
              required
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
            <input
              required
              type="password"
              placeholder="Password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
            <button
              disabled={loading}
              className="w-full btn-brand btn-brand-hover rounded-lg py-3 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground w-full text-center"
          >
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have one? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
