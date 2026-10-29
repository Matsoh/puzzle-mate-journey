import { describe, expect, it } from "vitest";
import { Segmenter, cleanTranscript, resample, rms, speakable } from "./voice";

const tone = (n: number, amp: number) => Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.3) * amp);
const silence = (n: number) => new Float32Array(n);

describe("voice helpers", () => {
  it("resamples by linear interpolation", () => {
    const x = Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    const y = resample(x, 8000, 4000);
    expect(y.length).toBe(4);
    expect(Array.from(y)).toEqual([0, 2, 4, 6]);
    expect(resample(x, 16000, 16000)).toBe(x);
    expect(rms(silence(100))).toBe(0);
    expect(rms(tone(1000, 0.5))).toBeGreaterThan(0.3);
  });

  it("segments an utterance: pre-roll, speech, then silence closes it", () => {
    const rate = 16000;
    const seg = new Segmenter(rate, { threshold: 0.012, silenceMs: 500, minSpeechMs: 200, maxMs: 10_000, preRollMs: 200 });
    const block = 1600; // 100 ms
    let out: Float32Array | null = null;
    for (let i = 0; i < 5; i++) out = seg.push(silence(block)); // quiet room
    expect(seg.isSpeaking).toBe(false);
    for (let i = 0; i < 6; i++) { out = seg.push(tone(block, 0.3)); expect(out).toBeNull(); } // 600 ms of speech
    expect(seg.isSpeaking).toBe(true);
    for (let i = 0; i < 4; i++) { out = seg.push(silence(block)); if (i < 4) expect(out).toBeNull(); }
    out = seg.push(silence(block)); // 500 ms quiet → done
    expect(out).not.toBeNull();
    // 200 ms pre-roll + 600 ms speech + 500 ms silence
    expect(out!.length).toBe(block * (2 + 6 + 5));
    expect(seg.isSpeaking).toBe(false);
  });

  it("drops coughs shorter than minSpeechMs and cuts at maxMs", () => {
    const seg = new Segmenter(16000, { threshold: 0.012, silenceMs: 300, minSpeechMs: 400, maxMs: 1000, preRollMs: 0 });
    const block = 1600;
    seg.push(tone(block, 0.3));
    let out: Float32Array | null = null;
    for (let i = 0; i < 3; i++) out = seg.push(silence(block));
    expect(out).toBeNull(); // too short, discarded
    expect(seg.isSpeaking).toBe(false);
    for (let i = 0; i < 9; i++) out = seg.push(tone(block, 0.3));
    expect(out).toBeNull();
    out = seg.push(tone(block, 0.3)); // hits 1000 ms
    expect(out!.length).toBe(block * 10);
  });

  it("cleans text for speaking and transcripts for Mike", () => {
    expect(speakable("**Castle** early. See [this](http://x).  Go!")).toBe("Castle early. See this. Go!");
    expect(cleanTranscript(" Thank you. ")).toBe("");
    expect(cleanTranscript("[BLANK_AUDIO]")).toBe("");
    expect(cleanTranscript("What is a fork?")).toBe("What is a fork?");
  });
});
