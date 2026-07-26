import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listUsage } from "@/lib/keys.functions";
import { Activity, Search, Download, ArrowUpDown, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Xevor AI" },
      { name: "description", content: "Every API request, token count, credit spend and status — end to end." },
    ],
  }),
  component: ActivityPage,
});

type SortKey = "new" | "old" | "credits" | "tokens" | "model";
type StatusFilter = "all" | "ok" | "error";

function ActivityPage() {
  const fetchUsage = useServerFn(listUsage);
  const [sort, setSort] = useState<SortKey>("new");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [model, setModel] = useState<string>("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(200);

  const { data, isLoading } = useQuery({
    queryKey: ["activity", sort, status, model, limit],
    queryFn: () => fetchUsage({ data: { sort, status, model: model || undefined, limit } }),
  });

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { credits: 0, input: 0, output: 0, requests: 0 };

  const models = useMemo(
    () => Array.from(new Set(rows.map((r: any) => r.model_slug))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((r: any) =>
      r.model_slug.toLowerCase().includes(s) ||
      String(r.status).includes(s) ||
      (r.api_key_id ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  function exportCsv() {
    const header = ["id", "created_at", "model", "input_tokens", "output_tokens", "credits_spent", "status", "api_key_id"];
    const lines = [header.join(",")].concat(
      filtered.map((r: any) =>
        [r.id, r.created_at, r.model_slug, r.input_tokens, r.output_tokens, r.credits_spent, r.status, r.api_key_id ?? ""].join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xevor-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center gap-2">
        <Activity className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold">Activity</h1>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        A to Z view of your API traffic — request, model, tokens, credits and status.
      </p>

      <div className="grid md:grid-cols-4 gap-4 mt-6">
        <Stat label="Requests" value={totals.requests} />
        <Stat label="Input tokens" value={totals.input.toLocaleString()} />
        <Stat label="Output tokens" value={totals.output.toLocaleString()} />
        <Stat label="Credits spent" value={totals.credits.toLocaleString()} accent />
      </div>

      <div className="glass rounded-2xl p-4 mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search model, status, key…"
            className="w-full surface rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60"
          />
        </div>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="surface rounded-md px-3 py-2 text-sm">
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="surface rounded-md px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="ok">Success (2xx)</option>
          <option value="error">Errors (3xx+)</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="surface rounded-md px-3 py-2 text-sm">
          <option value="new">Newest</option>
          <option value="old">Oldest</option>
          <option value="credits">Most credits</option>
          <option value="tokens">Most tokens</option>
          <option value="model">Model A → Z</option>
        </select>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="surface rounded-md px-3 py-2 text-sm">
          {[50, 100, 200, 500].map((n) => (
            <option key={n} value={n}>{n} rows</option>
          ))}
        </select>
        <button onClick={exportCsv} className="glass rounded-md px-3 py-2 text-sm flex items-center gap-2 hover:border-primary/60">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      <div className="glass rounded-2xl mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase text-left">
            <tr className="border-b border-border">
              <th className="p-3">When</th>
              <th className="p-3">Model</th>
              <th className="p-3 text-right">Input</th>
              <th className="p-3 text-right">Output</th>
              <th className="p-3 text-right">Credits</th>
              <th className="p-3">Status</th>
              <th className="p-3">Key</th>
              <th className="p-3">Request ID</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No activity yet. Make your first API call to see logs here.</td></tr>
            )}
            {filtered.map((r: any) => (
              <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-secondary/40">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3 font-mono text-xs">{r.model_slug}</td>
                <td className="p-3 text-right">{r.input_tokens}</td>
                <td className="p-3 text-right">{r.output_tokens}</td>
                <td className="p-3 text-right font-semibold text-gradient">{r.credits_spent}</td>
                <td className="p-3">
                  {r.status < 300 ? (
                    <span className="inline-flex items-center gap-1 text-primary text-xs"><CheckCircle2 className="w-3 h-3" />{r.status}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-destructive text-xs"><XCircle className="w-3 h-3" />{r.status}</span>
                  )}
                </td>
                <td className="p-3 font-mono text-[11px] text-muted-foreground">{r.api_key_id ? r.api_key_id.slice(0, 8) : "—"}</td>
                <td className="p-3 font-mono text-[11px] text-muted-foreground">{r.id.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
        <ArrowUpDown className="w-3 h-3" /> Showing {filtered.length} of {rows.length} loaded rows
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-gradient" : ""}`}>{value}</div>
    </div>
  );
}
