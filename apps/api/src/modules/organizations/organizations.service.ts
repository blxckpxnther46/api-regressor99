import { OrganizationRole, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { type PrismaTransaction, runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";

const memberSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: {
    select: { id: true, email: true, name: true }
  }
} satisfies Prisma.OrganizationMemberSelect;

export async function listOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    select: {
      role: true,
      organization: {
        select: { id: true, name: true, slug: true, createdAt: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function getOrganization(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);

  return prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true }
  });
}

export async function listMembers(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);

  return prisma.organizationMember.findMany({
    where: { organizationId },
    select: memberSelect,
    orderBy: { createdAt: "asc" }
  });
}

export async function addMember(
  actorUserId: string,
  organizationId: string,
  input: { email: string; role: OrganizationRole }
) {
  const actor = await requireMembership(actorUserId, organizationId);

  if (!["OWNER", "ADMIN"].includes(actor.role)) {
    throw new AppError(403, "ORG_FORBIDDEN", "You cannot add organization members.");
  }

  if (actor.role === "ADMIN" && ["OWNER", "ADMIN"].includes(input.role)) {
    throw new AppError(403, "ORG_FORBIDDEN", "Admins cannot grant owner or admin roles.");
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true }
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  try {
    return await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role: input.role
      },
      select: memberSelect
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(409, "ORG_MEMBER_EXISTS", "User is already a member.");
    }

    throw error;
  }
}

export async function updateMemberRole(
  actorUserId: string,
  organizationId: string,
  memberId: string,
  role: OrganizationRole
) {
  await requireOwner(actorUserId, organizationId);

  return runInTransaction(async (tx) => {
    const member = await tx.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      select: { id: true, role: true }
    });

    if (!member) {
      throw new AppError(404, "ORG_MEMBER_NOT_FOUND", "Organization member not found.");
    }

    if (member.role === "OWNER" && role !== "OWNER") {
      await assertNotLastOwner(tx, organizationId, memberId);
    }

    return tx.organizationMember.update({
      where: { id: memberId },
      data: { role },
      select: memberSelect
    });
  });
}

export async function removeMember(
  actorUserId: string,
  organizationId: string,
  memberId: string
) {
  await requireOwner(actorUserId, organizationId);

  return runInTransaction(async (tx) => {
    const member = await tx.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      select: { id: true, role: true }
    });

    if (!member) {
      throw new AppError(404, "ORG_MEMBER_NOT_FOUND", "Organization member not found.");
    }

    if (member.role === "OWNER") {
      await assertNotLastOwner(tx, organizationId, memberId);
    }

    await tx.organizationMember.delete({ where: { id: memberId } });

    return { success: true };
  });
}

export async function requireMembership(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    },
    select: { id: true, role: true }
  });

  if (!membership) {
    throw new AppError(403, "ORG_FORBIDDEN", "Organization access denied.");
  }

  return membership;
}

async function requireOwner(userId: string, organizationId: string) {
  const membership = await requireMembership(userId, organizationId);

  if (membership.role !== "OWNER") {
    throw new AppError(403, "ORG_OWNER_REQUIRED", "Owner role required.");
  }

  return membership;
}

async function assertNotLastOwner(
  tx: PrismaTransaction,
  organizationId: string,
  memberId: string
) {
  const ownerCount = await tx.organizationMember.count({
    where: {
      organizationId,
      role: "OWNER",
      NOT: { id: memberId }
    }
  });

  if (ownerCount === 0) {
    throw new AppError(409, "ORG_LAST_OWNER", "Organization must keep at least one owner.");
  }
}
