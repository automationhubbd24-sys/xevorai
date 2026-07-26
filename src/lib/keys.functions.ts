import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).optional(),
        model: z.string().optional(),
        status: z.enum(["all", "ok", "error"]).optional(),
        sort: z.enum(["new", "old", "credits", "tokens", "model"]).optional(),
      })
      .partial()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 200;
    let q = context.supabase
      .from("usage_logs")
      .select("id, model_slug, input_tokens, output_tokens, credits_spent, status, created_at, api_key_id")
      .eq("user_id", context.userId)
      .limit(limit);
    if (data.model) q = q.eq("model_slug", data.model);
    if (data.status === "ok") q = q.lt("status", 300);
    if (data.status === "error") q = q.gte("status", 300);
    const sort = data.sort ?? "new";
    if (sort === "new") q = q.order("created_at", { ascending: false });
    else if (sort === "old") q = q.order("created_at", { ascending: true });
    else if (sort === "credits") q = q.order("credits_spent", { ascending: false });
    else if (sort === "tokens") q = q.order("input_tokens", { ascending: false });
    else if (sort === "model") q = q.order("model_slug", { ascending: true });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const totals = (rows ?? []).reduce(
      (a, r) => {
        a.credits += Number(r.credits_spent) || 0;
        a.input += Number(r.input_tokens) || 0;
        a.output += Number(r.output_tokens) || 0;
        a.requests += 1;
        return a;
      },
      { credits: 0, input: 0, output: 0, requests: 0 },
    );
    return { rows: rows ?? [], totals };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, created_at, revoked")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const { generateApiKey } = await import("@/lib/api-key.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { plaintext, prefix, hash } = generateApiKey();
    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({ user_id: context.userId, name: data.name, key_prefix: prefix, key_hash: hash })
      .select("id, name, key_prefix, created_at, revoked, last_used_at")
      .single();
    if (error) throw new Error(error.message);
    return { key: plaintext, ...row };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles, usage] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase
        .from("usage_logs")
        .select("id, model_slug, input_tokens, output_tokens, credits_spent, created_at, status")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return {
      profile: profile.data,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      usage: usage.data ?? [],
    };
  });
