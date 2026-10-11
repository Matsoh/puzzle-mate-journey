import { describe, expect, it } from "vitest";
import { parseTheme } from "./theme";

describe("parseTheme", () => {
  it("defaults existing users (no stored value) to dark", () => expect(parseTheme(null)).toBe("dark"));
  it("ignores unknown values", () => expect(parseTheme("blue")).toBe("dark"));
  it("keeps a saved light choice", () => expect(parseTheme("light")).toBe("light"));
});
