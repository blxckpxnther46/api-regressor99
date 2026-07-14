import { createHash, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { TargetVerificationMethod } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMembership } from "../organizations/organizations.service.js";

const selectVerification = {
  id: true,
  organizationId: true,
  projectId: true,
  targetBaseUrl: true,
  method: true,
  status: true,
  verificationUrl: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true
};

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function isUnsafeTargetHost(hostname: string) {
  const lowerHost = hostname.toLowerCase();

  if (["localhost", "0.0.0.0"].includes(lowerHost)) {
    return true;
  }

  const ipVersion = isIP(lowerHost);
  if (!ipVersion) {
    return false;
  }

  if (lowerHost === "169.254.169.254") {
    return true;
  }

  if (ipVersion === 4) {
    const [first = 0, second = 0] = lowerHost.split(".").map(Number);
    return (
      first === 10 ||
      first === 127 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254)
    );
  }

  return lowerHost === "::1" || lowerHost.startsWith("fc") || lowerHost.startsWith("fd");
}

export async function createTargetVerification(
  userId: string,
  projectId: string,
  input: {
    targetBaseUrl: string;
    method: TargetVerificationMethod;
    verificationUrl?: string;
  }
) {
  const project = await requireProjectManager(userId, projectId);
  await assertSafeTarget(input.targetBaseUrl);

  if (
    (input.method === TargetVerificationMethod.HEADER ||
      input.method === TargetVerificationMethod.JSON_BODY) &&
    !input.verificationUrl
  ) {
    throw new AppError(
      422,
      "TARGET_VERIFICATION_URL_REQUIRED",
      "verificationUrl is required for header and JSON body verification."
    );
  }

  const token = randomBytes(24).toString("base64url");
  const verification = await prisma.targetVerification.create({
    data: {
      organizationId: project.organizationId,
      projectId,
      targetBaseUrl: input.targetBaseUrl,
      method: input.method,
      verificationUrl: input.verificationUrl,
      tokenHash: hashVerificationToken(token)
    },
    select: selectVerification
  });

  return { ...verification, token };
}

export async function listTargetVerifications(userId: string, projectId: string) {
  const project = await getAccessibleProject(userId, projectId);

  return prisma.targetVerification.findMany({
    where: { projectId: project.id },
    select: selectVerification,
    orderBy: { createdAt: "desc" }
  });
}

export async function verifyTarget(userId: string, projectId: string) {
  await requireProjectManager(userId, projectId);

  const verification = await prisma.targetVerification.findFirst({
    where: { projectId, status: "PENDING" },
    orderBy: { createdAt: "desc" }
  });

  if (!verification) {
    throw new AppError(404, "TARGET_VERIFICATION_NOT_FOUND", "No pending verification found.");
  }

  await assertSafeTarget(verification.targetBaseUrl);
  const token = await readVerificationToken(verification);
  const status =
    token && hashVerificationToken(token.trim()) === verification.tokenHash
      ? "VERIFIED"
      : "FAILED";

  return prisma.targetVerification.update({
    where: { id: verification.id },
    data: {
      status,
      verifiedAt: status === "VERIFIED" ? new Date() : null
    },
    select: selectVerification
  });
}

export async function revokeTargetVerification(userId: string, projectId: string) {
  await requireProjectManager(userId, projectId);

  await prisma.targetVerification.updateMany({
    where: { projectId, status: "VERIFIED" },
    data: { status: "REVOKED" }
  });

  return { success: true };
}

async function requireProjectManager(userId: string, projectId: string) {
  const project = await getAccessibleProject(userId, projectId);
  const membership = await requireMembership(userId, project.organizationId);

  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new AppError(403, "PROJECT_FORBIDDEN", "You cannot manage target verification.");
  }

  return project;
}

async function getAccessibleProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, archivedAt: null },
    select: { id: true, organizationId: true }
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  await requireMembership(userId, project.organizationId);
  return project;
}

async function assertSafeTarget(targetBaseUrl: string) {
  const url = new URL(targetBaseUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError(422, "TARGET_UNSAFE_URL", "Target must use HTTP or HTTPS.");
  }

  if (env.NODE_ENV !== "production") {
    return;
  }

  if (isUnsafeTargetHost(url.hostname)) {
    throw new AppError(422, "TARGET_UNSAFE_URL", "Target host is not allowed.");
  }

  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.some((address) => isUnsafeTargetHost(address.address))) {
    throw new AppError(422, "TARGET_UNSAFE_URL", "Target resolves to a private address.");
  }
}

async function readVerificationToken(verification: {
  targetBaseUrl: string;
  method: TargetVerificationMethod;
  verificationUrl: string | null;
}) {
  switch (verification.method) {
    case TargetVerificationMethod.WELL_KNOWN:
      return fetchText(new URL("/.well-known/regressor99-verification.txt", verification.targetBaseUrl));
    case TargetVerificationMethod.DNS_TXT:
      return readDnsToken(new URL(verification.targetBaseUrl).hostname);
    case TargetVerificationMethod.HEADER: {
      const response = await fetch(verification.verificationUrl!);
      return response.headers.get("x-regressor99-verify");
    }
    case TargetVerificationMethod.JSON_BODY: {
      const response = await fetch(verification.verificationUrl!);
      const body = (await response.json()) as { regressor99Verification?: string };
      return body.regressor99Verification ?? null;
    }
  }
}

async function fetchText(url: URL) {
  const response = await fetch(url);
  return response.ok ? response.text() : null;
}

async function readDnsToken(hostname: string) {
  const { resolveTxt } = await import("node:dns/promises");
  const records = await resolveTxt(`_regressor99.${hostname}`);
  return records.flat().find(Boolean) ?? null;
}
