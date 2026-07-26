import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Bot, Search, Zap, Key, Code2, Github } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xevor AI — One API for GPT, Gemini & Frontier Models" },
      { name: "description", content: "A unified, OpenAI-compatible gateway to every major AI model. Buy credits, get one API key, use everywhere." },
      { property: "og:title", content: "Xevor AI — One API for GPT, Gemini & Frontier Models" },
      { property: "og:description", content: "A unified, OpenAI-compatible gateway to every major AI model. Buy credits, get one API key, use everywhere." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [models, setModels] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("models").select("*").eq("active", true).order("provider").then(({ data }) => setModels(data ?? []));
  }, []);

  const filtered = models.filter((m) =>
    !q || [m.display_name, m.slug, m.provider].some((v: string) => v?.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="w-7 h-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <span>Xevor<span className="text-muted-foreground">AI</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#models" className="hover:text-foreground transition">Models</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#docs" className="hover:text-foreground transition">Docs</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Sign in</Link>
            <Link to="/auth" className="btn-brand btn-brand-hover rounded-md px-3.5 py-1.5 text-sm">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 chip mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          OpenAI-compatible · GPT · Gemini · One key
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          A unified interface<br />for <span className="text-gradient">every LLM</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
          Buy credits once. Access every frontier model through a single OpenAI-compatible endpoint.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth" className="btn-brand btn-brand-hover rounded-md px-5 py-2.5 text-sm inline-flex items-center gap-2">
            Get an API key <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#models" className="surface hover:border-primary/60 transition rounded-md px-5 py-2.5 text-sm">
            Browse models
          </a>
        </div>
      </section>

      {/* Model marketplace */}
      <section id="models" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Marketplace</div>
            <h2 className="text-2xl font-semibold mt-1">{models.length} models available</h2>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search models…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full surface rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60"
            />
          </div>
        </div>

        <div className="surface rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
            <div className="col-span-6">Model</div>
            <div className="col-span-2">Provider</div>
            <div className="col-span-2 text-right">Input /1K</div>
            <div className="col-span-2 text-right">Output /1K</div>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No models found.</div>
          )}
          {filtered.map((m) => (
            <div key={m.id} className="grid grid-cols-12 px-5 py-4 items-center border-b border-border last:border-b-0 hover:bg-secondary/30 transition">
              <div className="col-span-6">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.display_name}</span>
                  <code className="text-[10px] text-muted-foreground bg-secondary rounded px-1.5 py-0.5">{m.slug}</code>
                </div>
                {m.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.description}</div>}
              </div>
              <div className="col-span-2">
                <span className="chip">{m.provider}</span>
              </div>
              <div className="col-span-2 text-right font-mono text-sm">{m.credits_per_1k_input}</div>
              <div className="col-span-2 text-right font-mono text-sm">{m.credits_per_1k_output}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20 grid md:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: "One endpoint", body: "Drop-in OpenAI-compatible /v1/chat/completions routes to any provider." },
          { icon: Key, title: "Single API key", body: "Generate keys per project. Pay per token consumed. Revoke instantly." },
          { icon: Code2, title: "Full observability", body: "Track every request, model, token count and credits from your dashboard." },
        ].map((f) => (
          <div key={f.title} className="surface rounded-xl p-6">
            <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
              <f.icon className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Code block */}
      <section id="docs" className="max-w-4xl mx-auto px-6 pb-24">
        <div className="text-xs uppercase tracking-wider text-muted-foreground text-center">Quickstart</div>
        <h2 className="text-3xl font-semibold text-center mt-1">Works with the OpenAI SDK</h2>
        <div className="surface rounded-xl mt-8 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/40 text-xs text-muted-foreground">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent/60" />
            </div>
            <span className="ml-2">curl</span>
          </div>
          <pre className="p-5 text-xs md:text-sm overflow-x-auto"><code>{`curl https://xevor.ai/api/public/v1/chat/completions \\
  -H "Authorization: Bearer xev_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.5",
    "messages": [{"role":"user","content":"Hello!"}]
  }'`}</code></pre>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span>© {new Date().getFullYear()} Xevor AI</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground inline-flex items-center gap-1.5"><Github className="w-4 h-4" /> GitHub</a>
            <Link to="/auth" className="hover:text-foreground">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
