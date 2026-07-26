import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/public/v1/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token.startsWith("xev_")) {
          return json({ error: { message: "Invalid API key", type: "auth" } }, 401);
        }
        const { hashApiKey } = await import("@/lib/api-key.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const keyHash = hashApiKey(token);

        const { data: keyRow } = await supabaseAdmin
          .from("api_keys")
          .select("id, user_id, revoked")
          .eq("key_hash", keyHash)
          .maybeSingle();
        if (!keyRow || keyRow.revoked) {
          return json({ error: { message: "API key not found or revoked", type: "auth" } }, 401);
        }

        let body: any;
        try { body = await request.json(); } catch { return json({ error: { message: "Invalid JSON" } }, 400); }
        const modelSlug: string | undefined = body?.model;
        const messages = body?.messages;
        if (!modelSlug || !Array.isArray(messages)) {
          return json({ error: { message: "model and messages required" } }, 400);
        }

        const { data: model } = await supabaseAdmin
          .from("models")
          .select("*")
          .eq("slug", modelSlug)
          .eq("active", true)
          .maybeSingle();
        if (!model) return json({ error: { message: `Model ${modelSlug} not available` } }, 404);

        const { data: profile } = await supabaseAdmin
          .from("profiles").select("credits").eq("id", keyRow.user_id).single();
        if (!profile || profile.credits <= 0) {
          return json({ error: { message: "Insufficient credits", type: "insufficient_credits" } }, 402);
        }

        // Call the AI Gateway
        const { gatewayChatCompletion } = await import("@/lib/ai-gateway.server");
        const gwRes = await gatewayChatCompletion({
          model: model.gateway_model,
          messages,
          temperature: body.temperature,
          max_tokens: body.max_tokens,
        });

        const gwBody = await gwRes.json().catch(() => ({}));
        let creditsSpent = 0;
        let inTok = 0, outTok = 0;
        if (gwRes.ok && gwBody?.usage) {
          inTok = gwBody.usage.prompt_tokens ?? 0;
          outTok = gwBody.usage.completion_tokens ?? 0;
          creditsSpent = Math.ceil(
            (inTok / 1000) * Number(model.credits_per_1k_input) +
            (outTok / 1000) * Number(model.credits_per_1k_output),
          );
          if (creditsSpent > 0) {
            await supabaseAdmin
              .from("profiles")
              .update({ credits: Math.max(0, Number(profile.credits) - creditsSpent) })
              .eq("id", keyRow.user_id);
            await supabaseAdmin.from("credit_transactions").insert({
              user_id: keyRow.user_id,
              amount: -creditsSpent,
              kind: "usage",
              description: `${model.slug} · ${inTok + outTok} tokens`,
            });
          }
        }

        await supabaseAdmin.from("usage_logs").insert({
          user_id: keyRow.user_id,
          api_key_id: keyRow.id,
          model_slug: model.slug,
          input_tokens: inTok,
          output_tokens: outTok,
          credits_spent: creditsSpent,
          status: gwRes.status,
        });
        await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

        return new Response(JSON.stringify(gwBody), {
          status: gwRes.status,
          headers: { "Content-Type": "application/json", ...CORS },
        });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
