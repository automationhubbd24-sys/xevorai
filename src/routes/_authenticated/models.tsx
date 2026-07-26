import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Cpu, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/models")({
  head: () => ({ meta: [{ title: "Models — Xevor AI" }, { name: "description", content: "Available AI models on Xevor." }] }),
  component: Models,
});

function Models() {
  const [models, setModels] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState<string>("all");

  useEffect(() => {
    supabase.from("models").select("*").eq("active", true).order("provider").then(({ data }) => setModels(data ?? []));
  }, []);

  const providers = useMemo(() => ["all", ...Array.from(new Set(models.map((m) => m.provider)))], [models]);
  const filtered = models.filter(
    (m) =>
      (provider === "all" || m.provider === provider) &&
      (!q || [m.display_name, m.slug].some((v: string) => v?.toLowerCase().includes(q.toLowerCase()))),
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Cpu className="w-3.5 h-3.5" /> Marketplace
      </div>
      <h1 className="text-3xl font-semibold mt-1">Model catalog</h1>
      <p className="text-muted-foreground text-sm mt-1">Prices are in credits per 1K tokens.</p>

      <div className="mt-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search models…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full surface rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-3 py-1.5 text-xs rounded-md border transition capitalize ${
                provider === p ? "bg-primary/15 border-primary/50 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="surface rounded-xl overflow-hidden mt-4">
        <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
          <div className="col-span-6">Model</div>
          <div className="col-span-2">Provider</div>
          <div className="col-span-2 text-right">Input /1K</div>
          <div className="col-span-2 text-right">Output /1K</div>
        </div>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No models.</div>}
        {filtered.map((m) => (
          <div key={m.id} className="grid grid-cols-12 px-5 py-4 items-center border-b border-border last:border-b-0 hover:bg-secondary/30 transition">
            <div className="col-span-6">
              <div className="flex items-center gap-2">
                <span className="font-medium">{m.display_name}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(m.slug); toast.success("Slug copied"); }}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary rounded px-1.5 py-0.5 hover:text-foreground"
                >
                  {m.slug} <Copy className="w-2.5 h-2.5" />
                </button>
              </div>
              {m.description && <div className="text-xs text-muted-foreground mt-1">{m.description}</div>}
            </div>
            <div className="col-span-2"><span className="chip">{m.provider}</span></div>
            <div className="col-span-2 text-right font-mono text-sm">{m.credits_per_1k_input}</div>
            <div className="col-span-2 text-right font-mono text-sm">{m.credits_per_1k_output}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
