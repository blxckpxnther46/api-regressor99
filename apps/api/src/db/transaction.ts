import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type PrismaTransaction = Prisma.TransactionClient;

export function runInTransaction<T>(
  operation: (tx: PrismaTransaction) => Promise<T>
) {
  return prisma.$transaction((tx) => operation(tx));
}
