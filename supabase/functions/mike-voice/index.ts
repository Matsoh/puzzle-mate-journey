// Mike's voice via ElevenLabs. The browser sends a short text; this function
// checks that the caller is an approved player, then asks ElevenLabs to read
// it and streams the MP3 back. {list:true} returns the account's voices for the
// picker in settings. ELEVENLABS_API_KEY is a Lovable/Supabase secret.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API = "https://api.elevenlabs.io/v1";
/** Fast + cheapest model; fine for short spoken replies. */
const MODEL = Deno.env.get("ELEVENLABS_MODEL") ?? "eleven_flash_v2_5";
const DEFAULT_VOICE = "S0ypc51SmsvcKXTWvjqJ"; // Mike's voice, picked by Tobias in the ElevenLabs library
const MAX_CHARS = 600;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: approved, error: approveErr } = await supabase.rpc("is_approved_player");
    if (approveErr || approved !== true) return json({ error: "forbidden" }, 403);

    const key = Deno.env.get("ELEVENLABS_API_KEY");
    if (!key) return json({ error: "no key" }, 501);

    const body = (await req.json().catch(() => ({}))) as { text?: string; voice?: string; list?: boolean };

    if (body.list) {
      const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
      if (!res.ok) return json({ error: `voices ${res.status}` }, 502);
      const data = (await res.json()) as { voices?: { voice_id: string; name: string; category?: string; labels?: Record<string, string> }[] };
      const voices = (data.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name, category: v.category ?? "", labels: v.labels ?? {} }));
      return json({ voices });
    }

    const text = (body.text ?? "").toString().replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
    if (!text) return json({ error: "bad request" }, 400);
    const voice = /^[A-Za-z0-9]{10,40}$/.test(body.voice ?? "") ? body.voice! : DEFAULT_VOICE;

    const res = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
      }),
    });
    if (res.status === 401) return json({ error: "bad key" }, 502);
    if (res.status === 402 || res.status === 429) return json({ error: "quota" }, 429);
    if (!res.ok) return json({ error: `elevenlabs ${res.status}: ${(await res.text()).slice(0, 200)}` }, 502);
    return new Response(res.body, { status: 200, headers: { ...cors, "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
