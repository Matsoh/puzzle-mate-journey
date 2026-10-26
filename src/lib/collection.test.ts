import { describe, expect, it } from "vitest";
import { DEFAULT_PROGRESS } from "./progress";
import { MOTIFS, collectionSummary, withMotifs } from "./collection";
import { CHEST_TABLE, rollChest, withChest, withCoinsSpent } from "./chest";
import { DEFAULT_AVATAR, PARTS, avatarName, avatarOf, nextUnlocks, owns, unlockLabel, wardrobeSummary, withPart } from "./avatar";
import { offlineMike, mikeContext, MIKE_SYSTEM_PROMPT } from "./mike-brain";
import { THEME_LABELS } from "./puzzles";

describe("Monsterboken", () => {
  it("counts only collectible motifs and reports first discoveries", () => {
    const r1 = withMotifs(DEFAULT_PROGRESS, ["fork", "middlegame", "short"]);
    expect(r1.discovered.map((m) => m.id)).toEqual(["fork"]);
    expect(r1.progress.motifs).toEqual({ fork: 1 });
    const r2 = withMotifs(r1.progress, ["fork", "pin"]);
    expect(r2.discovered.map((m) => m.id)).toEqual(["pin"]);
    expect(r2.progress.motifs).toEqual({ fork: 2, pin: 1 });
    expect(collectionSummary(r2.progress).found).toBe(2);
  });
  it("has unique ids and every common motif is a known theme label", () => {
    expect(new Set(MOTIFS.map((m) => m.id)).size).toBe(MOTIFS.length);
    for (const m of MOTIFS.filter((x) => x.rarity === "vanlig")) expect(THEME_LABELS[m.id], m.id).toBeDefined();
  });
});

describe("Skattekisten", () => {
  it("is deterministic per seed and pays within the table", () => {
    const a = rollChest("2026-10-24:3:10");
    expect(rollChest("2026-10-24:3:10")).toEqual(a);
    const row = CHEST_TABLE.find((r) => r.tier === a.tier)!;
    expect(a.coins).toBeGreaterThanOrEqual(row.min);
    expect(a.coins).toBeLessThanOrEqual(row.max);
  });
  it("hits every tier over many days, mostly common", () => {
    const tiers = { vanlig: 0, stor: 0, jackpot: 0 };
    for (let i = 0; i < 2000; i++) tiers[rollChest(`seed-${i}`).tier]++;
    expect(tiers.vanlig).toBeGreaterThan(tiers.stor);
    expect(tiers.stor).toBeGreaterThan(tiers.jackpot);
    expect(tiers.jackpot).toBeGreaterThan(20);
  });
  it("opens once per day and spends coins safely", () => {
    const p = withChest(DEFAULT_PROGRESS, "2026-10-24", { coins: 40, tier: "vanlig" });
    expect(p.coins).toBe(40);
    expect(withChest(p, "2026-10-24", { coins: 300, tier: "jackpot" }).coins).toBe(40);
    expect(withCoinsSpent(p, 50)).toBeNull();
    expect(withCoinsSpent(p, 40)!.coins).toBe(0);
  });
});

describe("Avatarverkstedet", () => {
  it("free parts equip at once, coin parts need coins, achievement parts need the achievement", () => {
    expect(avatarOf(DEFAULT_PROGRESS)).toEqual(DEFAULT_AVATAR);
    const p1 = withPart(DEFAULT_PROGRESS, "hair", "short03")!;
    expect(avatarOf(p1).hair).toBe("short03");
    const coin = PARTS.hair.options.find((o) => o.unlock.kind === "coins")!;
    expect(withPart(p1, "hair", coin.id)).toBeNull();
    const rich = { ...p1, coins: 500 };
    const p2 = withPart(rich, "hair", coin.id)!;
    expect(p2.coins).toBe(500 - (coin.unlock as { cost: number }).cost);
    expect(owns(p2, "hair", coin.id)).toBe(true);
    expect(withPart({ ...p2, avatar: { ...p2.avatar, hair: "short01" } }, "hair", coin.id)!.coins).toBe(p2.coins); // owned: no second charge
    const beat = PARTS.eyes.options.find((o) => o.unlock.kind === "beat")!;
    expect(withPart(DEFAULT_PROGRESS, "eyes", beat.id)).toBeNull();
    expect(withPart({ ...DEFAULT_PROGRESS, beaten: [(beat.unlock as { opp: string }).opp] }, "eyes", beat.id)).not.toBeNull();
    const lvl = PARTS.mouth.options.find((o) => o.unlock.kind === "level")!;
    expect(withPart({ ...DEFAULT_PROGRESS, xp: 100000 }, "mouth", lvl.id)).not.toBeNull();
    const streak = PARTS.hair.options.find((o) => o.unlock.kind === "streak")!;
    expect(withPart({ ...DEFAULT_PROGRESS, bestStreak: 30 }, "hair", streak.id)).not.toBeNull();
    // unknown ids are ignored when reading
    expect(avatarOf({ ...DEFAULT_PROGRESS, avatar: { hair: "bob" } }).hair).toBe(DEFAULT_AVATAR.hair);
  });
  it("every part has a free default, ids are unique, and lock labels read well", () => {
    for (const k of Object.keys(PARTS) as (keyof typeof PARTS)[]) {
      expect(PARTS[k].options.some((o) => o.unlock.kind === "free")).toBe(true);
      expect(new Set(PARTS[k].options.map((o) => o.id)).size).toBe(PARTS[k].options.length);
      expect(PARTS[k].options.some((o) => o.id === DEFAULT_AVATAR[k])).toBe(true);
    }
    expect(unlockLabel({ kind: "beat", opp: "leo" })).toBe("Slå Ida");
    expect(unlockLabel({ kind: "level", level: 5 })).toBe("Nivå 5");
    expect(unlockLabel({ kind: "weeks", n: 1 })).toBe("Full skoleuke");
    expect(nextUnlocks(DEFAULT_PROGRESS, 3)).toHaveLength(3);
    const w = wardrobeSummary(DEFAULT_PROGRESS);
    expect(w.total).toBeGreaterThan(120);
    expect(w.unlocked).toBeGreaterThan(35);
  });
  it("names fall back to Tobias", () => {
    expect(avatarName(DEFAULT_PROGRESS)).toBe("Tobias");
    expect(avatarName({ ...DEFAULT_PROGRESS, avatarName: " Tobi " })).toBe("Tobi");
  });
});

describe("Mike offline", () => {
  it("answers chess questions and steers the rest back", () => {
    expect(offlineMike("I lost a game", 0)).toMatch(/lesson|Losing|lost/);
    expect(offlineMike("what's the weather", 0)).toMatch(/Chess|chess/);
  });
  it("gives the model real numbers and child-safe rules", () => {
    const ctx = mikeContext({ ...DEFAULT_PROGRESS, xp: 120, rating: 1580 }, "2026-10-24");
    expect(ctx).toContain("1580");
    expect(ctx).toContain("level 2");
    expect(MIKE_SYSTEM_PROMPT).toMatch(/Never compare him to other kids/);
  });
});

