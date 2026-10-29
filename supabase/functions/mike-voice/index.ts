// Mike's voice and ears via ElevenLabs. The browser sends either a short text
// ({text}) – read aloud, MP3 streamed back – or a WAV recording ({audio}:
// base64) – transcribed with Scribe, {text} back. Callers must be approved
// players. ELEVENLABS_API_KEY is a Lovable/Supabase secret.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API = "https://api.elevenlabs.io/v1";
/** Fast + cheapest model; fine for short spoken replies. */
const MODEL = Deno.env.get("ELEVENLABS_MODEL") ?? "eleven_flash_v2_5";
const DEFAULT_VOICE = Deno.env.get("ELEVENLABS_VOICE") ?? "S0ypc51SmsvcKXTWvjqJ"; // Mike's voice, picked by Tobias in the ElevenLabs library
const STT_MODEL = Deno.env.get("ELEVENLABS_STT_MODEL") ?? "scribe_v1";
const MAX_CHARS = 600;
const MAX_AUDIO = 2_000_000; // ~60 s of 16 kHz WAV, base64

/** Turn an ElevenLabs error into a short code the app can explain (ElevenLabs uses 401 both for bad keys and for keys missing a permission). */
function classify(what: string, status: number, text: string): string {
  let detail = "";
  try { const d = (JSON.parse(text) as { detail?: { status?: string; message?: string } | string }).detail; detail = typeof d === "string" ? d : `${d?.status ?? ""} ${d?.message ?? ""}`.trim(); } catch { detail = text.slice(0, 160); }
  if (/missing_permissions|permission/i.test(detail)) return `no ${what === "scribe" ? "stt" : "tts"} permission: ${detail}`;
  if (status === 401) return `bad key: ${detail}`;
  if (status === 402 || status === 429 || /quota|limit/i.test(detail)) return `quota: ${detail}`;
  return `${what} ${status}: ${detail}`;
}

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

    const body = (await req.json().catch(() => ({}))) as { text?: string; voice?: string; audio?: string };

    if (typeof body.audio === "string") {
      if (body.audio.length > MAX_AUDIO) return json({ error: "too long" }, 413);
      const bytes = Uint8Array.from(atob(body.audio), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: "audio/wav" }), "speech.wav");
      form.append("model_id", STT_MODEL);
      form.append("language_code", "en");
      form.append("tag_audio_events", "false");
      form.append("diarize", "false");
      const res = await fetch(`${API}/speech-to-text`, { method: "POST", headers: { "xi-api-key": key }, body: form });
      if (!res.ok) return json({ error: classify("scribe", res.status, await res.text()) }, res.status === 402 || res.status === 429 ? 429 : 502);
      const data = (await res.json()) as { text?: string };
      return json({ text: (data.text ?? "").trim() });
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
    if (!res.ok) return json({ error: classify("tts", res.status, await res.text()) }, res.status === 402 || res.status === 429 ? 429 : 502);
    return new Response(res.body, { status: 200, headers: { ...cors, "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
