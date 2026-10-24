// Mike's cloud brain. The browser sends the chat history + a context block;
// this function checks that the caller is an approved player, then asks the
// Lovable AI gateway (LOVABLE_API_KEY is provided by Lovable automatically).
// The system prompt is sent from the app so it can be edited in one place.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = Deno.env.get("MIKE_MODEL") ?? "google/gemini-3.7-flash";
const MAX_MESSAGES = 12;
const MAX_CHARS = 400;

type Msg = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: approved, error: approveErr } = await supabase.rpc("is_approved_player");
    if (approveErr || approved !== true) return json({ error: "forbidden" }, 403);

    const body = (await req.json()) as { system?: string; context?: string; messages?: Msg[] };
    const history = (body.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    if (!history.length || typeof body.system !== "string") return json({ error: "bad request" }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "no key" }, 500);

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.9,
        messages: [{ role: "system", content: `${body.system}\n\nContext:\n${body.context ?? ""}` }, ...history],
      }),
    });
    if (res.status === 429) return json({ error: "rate" }, 429);
    if (res.status === 402) return json({ error: "credits" }, 402);
    if (!res.ok) return json({ error: `gateway ${res.status}` }, 502);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return json({ error: "empty" }, 502);
    return json({ text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
