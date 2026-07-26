import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { purchaseCredits } from "@/lib/admin.functions";
import { Coins, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/credits")({
  head: () => ({ meta: [{ title: "Credits — Xevor AI" }, { name: "description", content: "Buy credits for Xevor AI." }] }),
  component: Credits,
});

const PACKS = [
  { amount: 10_000, price: "$5", tag: "Starter" },
  { amount: 50_000, price: "$20", tag: "Builder" },
  { amount: 250_000, price: "$80", tag: "Pro", popular: true },
  { amount: 1_000_000, price: "$250", tag: "Scale" },
];

function Credits() {
  const buy = useServerFn(purchaseCredits);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async (amount: number) => buy({ data: { amount } }),
    onSuccess: () => { toast.success("Credits added!"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold">Buy credits</h1>
      <p className="text-muted-foreground text-sm mt-1">Credits are consumed per request based on token usage.</p>

      <div className="glass rounded-2xl p-4 mt-6 flex items-start gap-3 border-accent/40">
        <Sparkles className="w-4 h-4 text-accent mt-0.5" />
        <div className="text-xs text-muted-foreground">
          Payments are currently in <span className="text-accent">demo mode</span> — clicking a pack instantly adds credits. Connect Stripe from the admin console to enable real checkout.
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mt-6">
        {PACKS.map((p) => (
          <div key={p.amount} className={`glass rounded-2xl p-6 relative ${p.popular ? "border-primary/60" : ""}`}>
            {p.popular && <span className="absolute -top-2 right-4 btn-brand rounded-full px-2 py-0.5 text-xs">Popular</span>}
            <Coins className="w-5 h-5 text-primary" />
            <div className="mt-3 text-xs uppercase text-muted-foreground">{p.tag}</div>
            <div className="mt-1 text-3xl font-bold text-gradient">{p.amount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">credits</div>
            <div className="mt-4 text-lg font-semibold">{p.price}</div>
            <button
              disabled={mut.isPending}
              onClick={() => mut.mutate(p.amount)}
              className="mt-4 w-full btn-brand btn-brand-hover rounded-lg py-2 text-sm disabled:opacity-50"
            >
              Buy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
