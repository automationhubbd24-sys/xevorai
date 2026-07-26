import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { adminGrantCredits, adminMakeAdmin, adminOverview, adminUpsertModel } from "@/lib/admin.functions";
import { Shield, Users, Cpu, Activity, Coins, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Xevor AI" }, { name: "description", content: "Admin console." }] }),
  component: Admin,
});

function Admin() {
  const overview = useServerFn(adminOverview);
  const grant = useServerFn(adminGrantCredits);
  const upsert = useServerFn(adminUpsertModel);
  const makeAdmin = useServerFn(adminMakeAdmin);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"users" | "models" | "logs">("users");

  const { data, isError, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overview(),
    retry: false,
  });

  const grantMut = useMutation({
    mutationFn: async ({ user_id, amount }: { user_id: string; amount: number }) => grant({ data: { user_id, amount } }),
    onSuccess: () => { toast.success("Credits updated"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const upsertMut = useMutation({
    mutationFn: async (m: any) => upsert({ data: m }),
    onSuccess: () => { toast.success("Model saved"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const adminMut = useMutation({
    mutationFn: async (user_id: string) => makeAdmin({ data: { user_id } }),
    onSuccess: () => toast.success("Promoted to admin"),
    onError: (e: any) => toast.error(e.message),
  });

  if (isError) {
    return (
      <div className="p-8">
        <div className="glass rounded-2xl p-8 max-w-md">
          <Shield className="w-6 h-6 text-destructive" />
          <h1 className="text-xl font-bold mt-2">Access denied</h1>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
          <button onClick={() => nav({ to: "/dashboard" })} className="mt-4 btn-brand rounded-lg px-4 py-2 text-sm">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-accent" />
        <h1 className="text-3xl font-bold">Admin console</h1>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mt-6">
        <MiniStat icon={Users} label="Users" value={data?.users.length ?? 0} />
        <MiniStat icon={Cpu} label="Models" value={data?.models.length ?? 0} />
        <MiniStat icon={Activity} label="Requests (50)" value={data?.logs.length ?? 0} />
        <MiniStat icon={Coins} label="Transactions" value={data?.transactions.length ?? 0} />
      </div>

      <div className="mt-8 flex gap-2 border-b border-border">
        {(["users", "models", "logs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >{t}</button>
        ))}
      </div>

      {tab === "users" && (
        <div className="glass rounded-2xl p-6 mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase text-left">
              <tr><th className="py-2">User</th><th>Credits</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data?.users.map((u: any) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2">
                    <div>{u.display_name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="text-gradient font-bold">{u.credits}</td>
                  <td className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="flex gap-2 py-2">
                    <button onClick={() => grantMut.mutate({ user_id: u.id, amount: 10000 })} className="glass rounded px-2 py-1 text-xs">+10k</button>
                    <button onClick={() => grantMut.mutate({ user_id: u.id, amount: -10000 })} className="glass rounded px-2 py-1 text-xs">-10k</button>
                    <button onClick={() => adminMut.mutate(u.id)} className="glass rounded px-2 py-1 text-xs">Make admin</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "models" && (
        <ModelsPanel models={data?.models ?? []} onSave={(m) => upsertMut.mutate(m)} />
      )}

      {tab === "logs" && (
        <div className="glass rounded-2xl p-6 mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase text-left">
              <tr><th className="py-2">User</th><th>Model</th><th>Tokens</th><th>Credits</th><th>Status</th><th>When</th></tr>
            </thead>
            <tbody>
              {data?.logs.map((l: any) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">{l.user_id.slice(0, 8)}</td>
                  <td className="font-mono text-xs">{l.model_slug}</td>
                  <td>{l.input_tokens + l.output_tokens}</td>
                  <td>{l.credits_spent}</td>
                  <td className={l.status < 300 ? "text-primary" : "text-destructive"}>{l.status}</td>
                  <td className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: any) {
  return (
    <div className="glass rounded-2xl p-4">
      <Icon className="w-4 h-4 text-primary" />
      <div className="text-xs text-muted-foreground mt-2 uppercase">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function ModelsPanel({ models, onSave }: { models: any[]; onSave: (m: any) => void }) {
  const empty = {
    slug: "", display_name: "", provider: "openai", gateway_model: "",
    description: "", credits_per_1k_input: 10, credits_per_1k_output: 30, active: true,
  };
  const [form, setForm] = useState<any>(empty);
  const isEdit = !!form.id;

  const field = (label: string, key: string, placeholder = "", type: "text" | "number" = "text") => (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key] ?? ""}
        onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="mt-1 w-full surface rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
      />
    </div>
  );

  return (
    <div className="grid lg:grid-cols-5 gap-4 mt-4">
      <div className="lg:col-span-2 surface rounded-xl p-6 h-fit">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            {isEdit ? "Edit model" : "Post new model"}
          </h3>
          {isEdit && (
            <button onClick={() => setForm(empty)} className="text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Fill the details and publish — it appears instantly in the marketplace.
        </p>

        <div className="mt-5 space-y-3">
          {field("Display name", "display_name", "GPT-5.5")}
          {field("Slug (public id)", "slug", "gpt-5.5")}
          <div>
            <label className="text-xs text-muted-foreground">Provider</label>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              className="mt-1 w-full surface rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
            >
              <option value="openai">openai</option>
              <option value="google">google</option>
              <option value="anthropic">anthropic</option>
              <option value="meta">meta</option>
              <option value="mistral">mistral</option>
            </select>
          </div>
          {field("Gateway model id", "gateway_model", "openai/gpt-5.5")}
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full surface rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none"
              placeholder="Short pitch shown in the catalog"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Credits / 1K input", "credits_per_1k_input", "10", "number")}
            {field("Credits / 1K output", "credits_per_1k_output", "30", "number")}
          </div>
          <label className="flex items-center gap-2 text-sm pt-1">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="accent-primary"
            />
            <span>Active — visible in the marketplace</span>
          </label>
          <button
            onClick={() => { onSave(form); setForm(empty); }}
            disabled={!form.slug || !form.display_name || !form.gateway_model}
            className="w-full btn-brand btn-brand-hover rounded-md py-2.5 text-sm mt-2 disabled:opacity-50"
          >
            {isEdit ? "Update model" : "Publish model"}
          </button>
        </div>
      </div>

      <div className="lg:col-span-3 surface rounded-xl overflow-hidden h-fit">
        <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
          <div className="col-span-5">Model</div>
          <div className="col-span-2">Provider</div>
          <div className="col-span-2 text-right">In/Out</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        {models.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No models yet. Post your first one.</div>}
        {models.map((m) => (
          <div key={m.id} className="grid grid-cols-12 px-5 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/30 transition">
            <div className="col-span-5">
              <div className="font-medium text-sm flex items-center gap-2">
                {m.display_name}
                {!m.active && <span className="chip text-destructive">disabled</span>}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono truncate">{m.gateway_model}</div>
            </div>
            <div className="col-span-2"><span className="chip">{m.provider}</span></div>
            <div className="col-span-2 text-right font-mono text-xs">{m.credits_per_1k_input}/{m.credits_per_1k_output}</div>
            <div className="col-span-3 flex justify-end gap-1.5">
              <button onClick={() => setForm(m)} className="text-xs px-2 py-1 rounded border border-border hover:border-primary/60">Edit</button>
              <button onClick={() => onSave({ ...m, active: !m.active })} className="text-xs px-2 py-1 rounded border border-border hover:border-primary/60">
                {m.active ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
