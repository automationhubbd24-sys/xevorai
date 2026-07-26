import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/keys.functions";
import { Copy, Key, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — Xevor AI" }, { name: "description", content: "Manage your API keys." }] }),
  component: Keys,
});

function Keys() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);

  const { data: keys } = useQuery({ queryKey: ["api-keys"], queryFn: () => list() });

  const createMut = useMutation({
    mutationFn: async () => create({ data: { name } }),
    onSuccess: (r: any) => {
      setRevealed(r.key);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => revoke({ data: { id } }),
    onSuccess: () => { toast.success("Key revoked"); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
  });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold">API Keys</h1>
      <p className="text-muted-foreground text-sm mt-1">Use these keys to call /api/public/v1/chat/completions.</p>

      <div className="glass rounded-2xl p-6 mt-8">
        <h2 className="font-semibold">Create new key</h2>
        <div className="mt-3 flex gap-2">
          <input
            placeholder="Key name (e.g. Production)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-input border border-border rounded-lg px-4 py-2.5 text-sm"
          />
          <button
            disabled={!name || createMut.isPending}
            onClick={() => createMut.mutate()}
            className="btn-brand btn-brand-hover rounded-lg px-5 text-sm disabled:opacity-50"
          >
            Create
          </button>
        </div>
        {revealed && (
          <div className="mt-4 p-4 rounded-lg border border-accent/50 bg-accent/10">
            <div className="text-xs text-accent mb-2">Copy this key — it won't be shown again.</div>
            <div className="flex gap-2">
              <code className="flex-1 font-mono text-xs bg-background/50 rounded p-2 break-all">{revealed}</code>
              <button onClick={() => { navigator.clipboard.writeText(revealed); toast.success("Copied"); }} className="glass rounded p-2">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setRevealed(null)} className="mt-3 text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6 mt-6">
        <h2 className="font-semibold mb-4">Your keys</h2>
        {keys?.length ? (
          <ul className="divide-y divide-border">
            {keys.map((k) => (
              <li key={k.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    <span className="font-medium">{k.name}</span>
                    {k.revoked && <span className="text-xs text-destructive">revoked</span>}
                  </div>
                  <code className="text-xs text-muted-foreground">{k.key_prefix}…</code>
                </div>
                {!k.revoked && (
                  <button onClick={() => revokeMut.mutate(k.id)} className="text-destructive hover:text-destructive/80 p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No keys yet.</p>
        )}
      </div>
    </div>
  );
}
