// Server-only AI gateway helper.
const GATEWAY_URL = "https://ai.gateway.xevor.ai/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function gatewayChatCompletion(body: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}): Promise<Response> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  // GPT-5.6 requires reasoning_effort: none
  const payload: Record<string, unknown> = { ...body };
  if (body.model.startsWith("openai/gpt-5.6")) {
    payload.reasoning_effort = "none";
  }
  return fetch(`${GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
}
