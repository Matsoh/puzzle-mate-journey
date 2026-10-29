// Mike's ears and voice, off the main thread: Whisper (speech → text) and
// Kokoro (text → speech) via Transformers.js. Models download from Hugging Face
// the first time and are cached by the browser afterwards. Messages in:
// {type:"load"}, {type:"transcribe", id, audio: Float32Array (16 kHz)},
// {type:"speak", id, text, voice, speed}. Messages out: progress/ready/error,
// {type:"text", id, text}, {type:"audio", id, audio, rate, done}.
import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

env.allowLocalModels = false;

export const WHISPER_MODEL = "onnx-community/whisper-base.en";
export const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

let asr: AutomaticSpeechRecognitionPipeline | null = null;
let tts: KokoroTTS | null = null;
let loading: Promise<void> | null = null;
const sizes: Record<string, { loaded: number; total: number }> = {};

const post = (m: unknown, transfer?: Transferable[]) => (self as unknown as Worker).postMessage(m, transfer ?? []);

function progress(p: { status: string; file?: string; loaded?: number; total?: number }) {
  if (p.status === "progress" && p.file && p.total) sizes[p.file] = { loaded: p.loaded ?? 0, total: p.total };
  if (p.status === "done" && p.file && sizes[p.file]) sizes[p.file]!.loaded = sizes[p.file]!.total;
  const all = Object.values(sizes);
  const total = all.reduce((a, s) => a + s.total, 0);
  const loaded = all.reduce((a, s) => a + s.loaded, 0);
  post({ type: "progress", progress: total ? loaded / total : 0, loaded, total });
}

async function load() {
  if (asr && tts) return;
  if (!loading) {
    loading = (async () => {
      // Whisper first (smaller), then Kokoro. q8 everywhere: fits an iPad and sounds fine.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      asr = (await (pipeline as any)("automatic-speech-recognition", WHISPER_MODEL, { dtype: "q8", progress_callback: progress })) as AutomaticSpeechRecognitionPipeline;
      tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype: "q8", device: "wasm", progress_callback: progress });
    })().catch((e) => { loading = null; throw e; });
  }
  await loading;
}

self.onmessage = async (e: MessageEvent) => {
  const m = e.data as { type: string; id?: number; audio?: Float32Array; text?: string; voice?: string; speed?: number };
  try {
    if (m.type === "load") {
      await load();
      post({ type: "ready" });
    } else if (m.type === "transcribe") {
      await load();
      const out = await asr!(m.audio!, { language: "en", task: "transcribe" });
      const text = (Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text).trim();
      post({ type: "text", id: m.id, text });
    } else if (m.type === "speak") {
      await load();
      let n = 0;
      for await (const chunk of tts!.stream(m.text!, { voice: m.voice as "am_puck", speed: m.speed ?? 1 })) {
        const audio = chunk.audio.audio as Float32Array;
        post({ type: "audio", id: m.id, audio, rate: chunk.audio.sampling_rate, done: false, index: n++ }, [audio.buffer as ArrayBuffer]);
      }
      post({ type: "audio", id: m.id, done: true });
    }
  } catch (err) {
    post({ type: "error", id: m.id, message: (err as Error).message ?? String(err) });
  }
};
