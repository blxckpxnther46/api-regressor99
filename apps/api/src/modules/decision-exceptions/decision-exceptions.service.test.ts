import { OrganizationRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canApproveDecisionException } from "./decision-exceptions.service.js";

describe("decision exception policy", () => {
  it("allows owner and admin approval", () => {
    expect(canApproveDecisionException(OrganizationRole.OWNER)).toBe(true);
    expect(canApproveDecisionException(OrganizationRole.ADMIN)).toBe(true);
  });

  it("rejects developer and viewer approval", () => {
    expect(canApproveDecisionException(OrganizationRole.DEVELOPER)).toBe(false);
    expect(canApproveDecisionException(OrganizationRole.VIEWER)).toBe(false);
  });
});

