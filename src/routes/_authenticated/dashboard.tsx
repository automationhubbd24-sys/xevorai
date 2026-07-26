import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/keys.functions";
import { Coins, Activity, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Xevor AI" }, { name: "description", content: "Your Xevor AI dashboard." }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchProfile = useServerFn(getProfile);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const totalSpent = (data?.usage ?? []).reduce((s, u) => s + Number(u.credits_spent), 0);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground text-sm mt-1">Welcome back, {data?.profile?.display_name ?? "there"}.</p>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Stat icon={Coins} label="Credits balance" value={data?.profile?.credits ?? 0} accent />
        <Stat icon={Activity} label="Requests (last 20)" value={data?.usage?.length ?? 0} />
        <Stat icon={TrendingUp} label="Credits spent" value={totalSpent} />
      </div>

      <section className="glass rounded-2xl p-6 mt-8">
        <h2 className="font-semibold mb-4">Recent usage</h2>
        {data?.usage?.length ? (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs uppercase">
              <tr className="text-left">
                <th className="py-2">Model</th>
                <th>In</th>
                <th>Out</th>
                <th>Credits</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">{u.model_slug}</td>
                  <td>{u.input_tokens}</td>
                  <td>{u.output_tokens}</td>
                  <td>{u.credits_spent}</td>
                  <td><span className={u.status < 300 ? "text-primary" : "text-destructive"}>{u.status}</span></td>
                  <td className="text-muted-foreground">{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No requests yet. Create an API key and make your first call.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="glass rounded-2xl p-6">
      <Icon className={`w-5 h-5 ${accent ? "text-accent" : "text-primary"}`} />
      <div className="mt-3 text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent ? "text-gradient" : ""}`}>{value}</div>
    </div>
  );
}
