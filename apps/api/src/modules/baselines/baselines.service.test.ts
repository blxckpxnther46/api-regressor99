import { describe, expect, it } from "vitest";
import { nextBaselineVersionNumber } from "./baselines.service.js";

describe("baseline service helpers", () => {
  it("increments baseline history versions", () => {
    expect(nextBaselineVersionNumber()).toBe(1);
    expect(nextBaselineVersionNumber(1)).toBe(2);
  });
});

