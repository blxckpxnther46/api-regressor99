import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMembership } from "../organizations/organizations.service.js";

const projectSelect = {
  id: true,
  organizationId: true,
  name: true,
  slug: true,
  description: true,
  defaultBaseUrl: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ProjectSelect;

export async function listProjects(
  userId: string,
  input: { organizationId: string; includeArchived?: boolean }
) {
  await requireMembership(userId, input.organizationId);

  return prisma.project.findMany({
    where: {
      organizationId: input.organizationId,
      archivedAt: input.includeArchived ? undefined : null
    },
    select: projectSelect,
    orderBy: { createdAt: "desc" }
  });
}

export async function createProject(
  userId: string,
  input: {
    organizationId: string;
    name: string;
    slug: string;
    description?: string;
    defaultBaseUrl?: string;
  }
) {
  const membership = await requireMembership(userId, input.organizationId);

  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new AppError(403, "PROJECT_FORBIDDEN", "You cannot create projects.");
  }

  try {
    return await prisma.project.create({
      data: input,
      select: projectSelect
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(409, "PROJECT_SLUG_EXISTS", "Project slug already exists.");
    }

    throw error;
  }
}

export async function getProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: projectSelect
  });

  if (!project || project.archivedAt) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  await requireMembership(userId, project.organizationId);

  return project;
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    defaultBaseUrl?: string;
  }
) {
  const project = await getProject(userId, projectId);
  const membership = await requireMembership(userId, project.organizationId);

  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new AppError(403, "PROJECT_FORBIDDEN", "You cannot update projects.");
  }

  try {
    return await prisma.project.update({
      where: { id: projectId },
      data: input,
      select: projectSelect
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(409, "PROJECT_SLUG_EXISTS", "Project slug already exists.");
    }

    throw error;
  }
}

export async function archiveProject(userId: string, projectId: string) {
  const project = await getProject(userId, projectId);
  const membership = await requireMembership(userId, project.organizationId);

  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new AppError(403, "PROJECT_FORBIDDEN", "You cannot archive projects.");
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: new Date() },
    select: projectSelect
  });
}

