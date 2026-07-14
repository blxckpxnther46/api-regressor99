import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createRefreshToken,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyPassword
} from "./auth.crypto.js";

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "organization";
}

function authResponse(user: { id: string; email: string; name: string }, refreshToken: string) {
  return {
    user,
    accessToken: signAccessToken({ userId: user.id, email: user.email }),
    refreshToken
  };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}) {
  try {
    return await runInTransaction(async (tx) => {
      const passwordHash = await hashPassword(input.password);
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash
        },
        select: { id: true, email: true, name: true }
      });
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: `${slugify(input.organizationName)}-${user.id.slice(-6)}`
        },
        select: { id: true, name: true, slug: true }
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "OWNER"
        }
      });

      const refreshToken = await createRefreshTokenRecord(tx, user.id);

      return {
        ...authResponse(user, refreshToken),
        organization
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(409, "AUTH_EMAIL_EXISTS", "Email is already registered.");
    }

    throw error;
  }
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, name: true, passwordHash: true }
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const refreshToken = await createRefreshTokenRecord(prisma, user.id);

  return authResponse(
    { id: user.id, email: user.email, name: user.name },
    refreshToken
  );
}

export async function refresh(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  return runInTransaction(async (tx) => {
    const storedToken = await tx.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new AppError(401, "AUTH_INVALID_REFRESH_TOKEN", "Invalid refresh token.");
    }

    const nextRefreshToken = createRefreshToken();
    const nextStoredToken = await tx.refreshToken.create({
      data: {
        userId: storedToken.userId,
        tokenHash: nextRefreshToken.tokenHash,
        expiresAt: nextRefreshToken.expiresAt
      }
    });

    await tx.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: nextStoredToken.id
      }
    });

    return authResponse(storedToken.user, nextRefreshToken.token);
  });
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashRefreshToken(refreshToken),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });

  return { success: true };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      organizationMembers: {
        select: {
          role: true,
          organization: {
            select: { id: true, name: true, slug: true }
          }
        }
      }
    }
  });

  if (!user) {
    throw new AppError(401, "AUTH_USER_NOT_FOUND", "Authenticated user no longer exists.");
  }

  return user;
}

async function createRefreshTokenRecord(
  tx: Pick<typeof prisma, "refreshToken">,
  userId: string
) {
  const refreshToken = createRefreshToken();

  await tx.refreshToken.create({
    data: {
      userId,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt
    }
  });

  return refreshToken.token;
}

