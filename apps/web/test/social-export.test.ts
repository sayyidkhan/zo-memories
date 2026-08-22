import { describe, expect, test } from "bun:test";
import { buildCarouselPlan, isShareCancellation } from "../src/lib/social-export";

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
});

describe("isShareCancellation", () => {
  test("recognises explicit share-sheet cancellation", () => {
    expect(isShareCancellation(new DOMException("Share cancelled", "AbortError"))).toBe(true);
    expect(isShareCancellation(new DOMException("Permission dismissed", "NotAllowedError"))).toBe(true);
  });

  test("allows browser share failures to fall back to downloads", () => {
    expect(isShareCancellation(new DOMException("Too many files", "DataError"))).toBe(false);
    expect(isShareCancellation(new Error("Share service unavailable"))).toBe(false);
  });
});
