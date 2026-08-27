import { describe, expect, test } from "bun:test";
import { assessMotionPlan, buildCarouselPlan, buildMotionPlan, isShareCancellation } from "../src/lib/social-export";
import { chooseAdaptivePhotoLayout, fitHeadingSize } from "../src/lib/layout-engine";

describe("buildCarouselPlan", () => {
  test("adds a cover and closing card around one slide per photo", () => {
    const plan = buildCarouselPlan(6, 20);
    expect(plan).toHaveLength(8);
    expect(plan[0]?.kind).toBe("cover");
    expect(plan.at(-1)?.kind).toBe("closing");
    expect(plan.filter((slide) => slide.kind === "moment").flatMap((slide) => slide.photoIndexes)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("grows to the destination limit and keeps every selected photo", () => {
    const plan = buildCarouselPlan(30, 20);
    expect(plan).toHaveLength(20);
    expect(plan.filter((slide) => slide.kind === "moment").flatMap((slide) => slide.photoIndexes)).toEqual(Array.from({ length: 30 }, (_, index) => index));
    expect(plan.some((slide) => slide.photoIndexes.length > 1)).toBe(true);
  });

  test("respects destinations with a four-image limit", () => {
    const plan = buildCarouselPlan(10, 4);
    expect(plan).toHaveLength(4);
    expect(plan.filter((slide) => slide.kind === "moment").flatMap((slide) => slide.photoIndexes)).toEqual(Array.from({ length: 10 }, (_, index) => index));
  });

  test("uses the narrative hero as the cover without dropping chronological moments", () => {
    const plan = buildCarouselPlan(6, 20, 4);
    expect(plan[0]?.photoIndexes).toEqual([4]);
    expect(plan.filter((slide) => slide.kind === "moment").flatMap((slide) => slide.photoIndexes)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("adaptive layout engine", () => {
  test("stacks landscape photos instead of forcing them into narrow columns", () => {
    expect(chooseAdaptivePhotoLayout([1.8, 1.55], 0.8).kind).toBe("landscape-stack");
  });

  test("gives portrait pairs full-height side-by-side frames", () => {
    const layout = chooseAdaptivePhotoLayout([0.62, 0.7], 0.8);
    expect(layout.kind).toBe("portrait-duo");
    expect(layout.frames.every((frame) => frame.height === 1)).toBe(true);
  });

  test("uses an asymmetric editorial rhythm for mixed media", () => {
    const first = chooseAdaptivePhotoLayout([1.7, 0.65, 1], 0.8, 1);
    const second = chooseAdaptivePhotoLayout([1.7, 0.65, 1], 0.8, 2);
    expect(first.kind).toBe("asymmetric-mosaic");
    expect(first.frames[0]?.x).not.toBe(second.frames[0]?.x);
  });

  test("fits long headings within the available line budget", () => {
    const size = fitHeadingSize((value, fontSize) => value.length * fontSize * 0.55, "A much longer chapter heading that needs room", 420, 2, 64, 32);
    expect(size).toBeLessThan(64);
    expect(size).toBeGreaterThanOrEqual(32);
  });
});

describe("buildMotionPlan", () => {
  test("gives a film an opening hook, distinct scenes, and a reflective closing", () => {
    const plan = buildMotionPlan(4);
    expect(plan.map((shot) => shot.kind)).toEqual(["opening", "moment", "moment", "moment", "moment", "closing"]);
    expect(plan[0]?.start).toBe(0);
    expect(plan.at(-1)?.end).toBe(1);
    expect(plan.filter((shot) => shot.purpose === "payoff")).toHaveLength(1);
    expect(plan.find((shot) => shot.purpose === "payoff")?.camera).toBe("push-in");
    expect(plan.find((shot) => shot.purpose === "payoff")?.transitionIn).toBe("dip-to-ink");
    expect(plan.find((shot) => shot.purpose === "payoff")!.end - plan.find((shot) => shot.purpose === "payoff")!.start).toBeGreaterThan(
      plan.find((shot) => shot.purpose === "journey")!.end - plan.find((shot) => shot.purpose === "journey")!.start,
    );
    expect(plan.map((shot) => shot.end).at(-1)).toBeCloseTo(1, 10);
  });

  test("still makes a complete film when there is only one source photo", () => {
    const plan = buildMotionPlan(1);
    expect(plan).toHaveLength(3);
    expect(plan[1]?.photoIndexes).toEqual([0]);
    expect(plan[2]?.photoIndexes).toEqual([0]);
  });

  test("respects the selected payoff image and proves its renderable plan", () => {
    const plan = buildMotionPlan(5, 4);
    expect(plan.find((shot) => shot.purpose === "payoff")?.photoIndexes).toEqual([4]);
    expect(assessMotionPlan(plan, 5).every((check) => check.status === "pass")).toBe(true);
  });
});

describe("isShareCancellation", () => {
  test("recognises explicit share-sheet cancellation", () => {
    expect(isShareCancellation(new DOMException("Share cancelled", "AbortError"))).toBe(true);
  });

  test("allows browser share failures to fall back to downloads", () => {
    expect(isShareCancellation(new DOMException("Sharing is not permitted", "NotAllowedError"))).toBe(false);
    expect(isShareCancellation(new DOMException("Too many files", "DataError"))).toBe(false);
    expect(isShareCancellation(new Error("Share service unavailable"))).toBe(false);
  });
});
