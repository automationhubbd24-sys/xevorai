import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string, supabase: any) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, models, logs, tx] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, display_name, credits, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("models").select("*").order("provider"),
      supabaseAdmin.from("usage_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("credit_transactions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    return {
      users: users.data ?? [],
      models: models.data ?? [],
      logs: logs.data ?? [],
      transactions: tx.data ?? [],
    };
  });

export const adminGrantCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), amount: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("credits").eq("id", data.user_id).single();
    const next = (p?.credits ?? 0) + data.amount;
    await supabaseAdmin.from("profiles").update({ credits: next }).eq("id", data.user_id);
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: data.user_id,
      amount: data.amount,
      kind: "admin_grant",
      description: `Admin ${data.amount > 0 ? "added" : "removed"} credits`,
    });
    return { ok: true, credits: next };
  });

export const adminUpsertModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slug: z.string().min(1),
        display_name: z.string().min(1),
        provider: z.string().min(1),
        gateway_model: z.string().min(1),
        description: z.string().optional().nullable(),
        credits_per_1k_input: z.number().int().nonnegative(),
        credits_per_1k_output: z.number().int().nonnegative(),
        active: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...rest } = data;
      await supabaseAdmin.from("models").update(rest).eq("id", id);
    } else {
      await supabaseAdmin.from("models").insert(data);
    }
    return { ok: true };
  });

export const adminMakeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: "admin" });
    return { ok: true };
  });

export const purchaseCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ amount: z.number().int().positive().max(1_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    // Placeholder purchase — replace with Stripe checkout webhook to award credits for real payments.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("credits").eq("id", context.userId).single();
    const next = (p?.credits ?? 0) + data.amount;
    await supabaseAdmin.from("profiles").update({ credits: next }).eq("id", context.userId);
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: context.userId,
      amount: data.amount,
      kind: "purchase",
      description: `Purchased ${data.amount} credits`,
    });
    return { ok: true, credits: next };
  });
