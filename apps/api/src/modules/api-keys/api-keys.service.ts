import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ActivityAction, logActivity } from "../activity-logs/activity-logs.service.js";
import { requireMembership } from "../organizations/organizations.service.js";

export const apiKeyScopes = [
  "deployments:create",
  "benchmark_runs:create",
  "benchmark_runs:read",
  "projects:read"
] as const;

export type ApiKeyScope = (typeof apiKeyScopes)[number];

const apiKeySelect = {
  id: true,
  organizationId: true,
  projectId: true,
  name: true,
  keyPrefix: true,
  scopes: true,
  lastUsedAt: true,
  revokedAt: true,
  createdByUserId: true,
  createdAt: true
} satisfies Prisma.ApiKeySelect;

export function generateApiKey() {
  return `r99_${randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("base64url");
}

export function hasApiKeyScope(scopes: unknown, scope: ApiKeyScope) {
  return Array.isArray(scopes) && scopes.includes(scope);
}

export function assertApiKeyScope(scopes: unknown, scope: ApiKeyScope) {
  if (!hasApiKeyScope(scopes, scope)) {
    throw new AppError(403, "API_KEY_SCOPE_REQUIRED", `API key requires ${scope}.`);
  }
}

export function assertApiKeyProjectAccess(apiKey: { projectId: string | null }, projectId: string) {
  if (apiKey.projectId && apiKey.projectId !== projectId) {
    throw new AppError(403, "API_KEY_PROJECT_FORBIDDEN", "API key cannot access this project.");
  }
}

export async function createApiKey(
  userId: string,
  organizationId: string,
  input: { name: string; projectId?: string; scopes: ApiKeyScope[] }
) {
  const membership = await requireMembership(userId, organizationId);

  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new AppError(403, "API_KEY_FORBIDDEN", "You cannot create API keys.");
  }

  if (input.projectId) {
    await assertProjectInOrganization(organizationId, input.projectId);
  }

  const rawKey = generateApiKey();
  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId,
      projectId: input.projectId,
      name: input.name,
      keyPrefix: rawKey.slice(0, 12),
      keyHash: hashApiKey(rawKey),
      scopes: input.scopes,
      createdByUserId: userId
    },
    select: apiKeySelect
  });

  await logActivity({
    organizationId,
    actorUserId: userId,
    action: ActivityAction.ApiKeyCreated,
    entityType: "api_key",
    entityId: apiKey.id,
    metadata: { projectId: apiKey.projectId, scopes: input.scopes }
  });

  return { ...apiKey, key: rawKey };
}

export async function listApiKeys(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);

  return prisma.apiKey.findMany({
    where: { organizationId },
    select: apiKeySelect,
    orderBy: { createdAt: "desc" }
  });
}

export async function revokeApiKey(userId: string, apiKeyId: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { id: true, organizationId: true }
  });

  if (!apiKey) {
    throw new AppError(404, "API_KEY_NOT_FOUND", "API key not found.");
  }

  const membership = await requireMembership(userId, apiKey.organizationId);

  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new AppError(403, "API_KEY_FORBIDDEN", "You cannot revoke API keys.");
  }

  const revoked = await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { revokedAt: new Date() },
    select: apiKeySelect
  });

  await logActivity({
    organizationId: revoked.organizationId,
    actorUserId: userId,
    action: ActivityAction.ApiKeyRevoked,
    entityType: "api_key",
    entityId: revoked.id
  });

  return revoked;
}

export async function authenticateApiKey(rawKey: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(rawKey) },
    select: apiKeySelect
  });

  if (!apiKey || apiKey.revokedAt) {
    throw new AppError(401, "API_KEY_INVALID", "Invalid API key.");
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  return apiKey;
}

async function assertProjectInOrganization(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, archivedAt: null },
    select: { id: true }
  });

  if (!project) {
    throw new AppError(400, "API_KEY_PROJECT_INVALID", "Project does not belong to this organization.");
  }
}

