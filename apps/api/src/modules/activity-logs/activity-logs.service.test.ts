import { describe, expect, it } from "vitest";
import { ActivityAction, isKnownActivityAction } from "./activity-logs.service.js";

describe("activity log actions", () => {
  it("includes current and upcoming audit events", () => {
    expect(isKnownActivityAction(ActivityAction.RunCompleted)).toBe(true);
    expect(isKnownActivityAction(ActivityAction.ApiKeyCreated)).toBe(true);
    expect(isKnownActivityAction(ActivityAction.ApiKeyRevoked)).toBe(true);
    expect(isKnownActivityAction(ActivityAction.CiRunTriggered)).toBe(true);
    expect(isKnownActivityAction(ActivityAction.TargetVerificationCreated)).toBe(true);
    expect(isKnownActivityAction(ActivityAction.TargetVerificationCompleted)).toBe(true);
    expect(isKnownActivityAction(ActivityAction.TargetVerificationRevoked)).toBe(true);
  });
});

