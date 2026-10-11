import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChampAvatarScene } from "./ChampAvatarScene";
import { play } from "@/lib/sound";

vi.mock("@/lib/sound", () => ({ play: vi.fn(), unlockAudio: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("Champion celebration", () => {
  it("celebrates when the prop becomes true and removes the class after 1400ms", () => {
    vi.useFakeTimers();
    const view = render(<ChampAvatarScene />);
    const scene = view.getByRole("group");
    expect(scene.classList.contains("is-celebrating")).toBe(false);
    view.rerender(<ChampAvatarScene celebrate />);
    expect(scene.classList.contains("is-celebrating")).toBe(true);
    act(() => vi.advanceTimersByTime(1399));
    expect(scene.classList.contains("is-celebrating")).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(scene.classList.contains("is-celebrating")).toBe(false);
    expect(play).not.toHaveBeenCalled(); // Game finish already plays its win sound.
  });
  it("restarts the timer and uses the existing mute-aware win sound when tapped", () => {
    vi.useFakeTimers();
    const view = render(<ChampAvatarScene />);
    const button = view.getByRole("button", { name: "Spill seiersanimasjon" });
    fireEvent.click(button);
    expect(play).toHaveBeenCalledWith("win");
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(400));
    expect(view.getByRole("group").classList.contains("is-celebrating")).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(view.getByRole("group").classList.contains("is-celebrating")).toBe(false);
  });
});