import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

const scrypt = promisify(scryptCallback);
const accessTokenTtlSeconds = 15 * 60;
const refreshTokenTtlDays = 30;

type AccessTokenPayload = {
  sub: string;
  email: string;
  exp: number;
};

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value: unknown) {
  return base64UrlEncode(JSON.stringify(value));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const actualHash = (await scrypt(password, salt, 64)) as Buffer;
  const expectedHash = Buffer.from(storedHash, "base64url");

  return (
    actualHash.length === expectedHash.length &&
    timingSafeEqual(actualHash, expectedHash)
  );
}

export function signAccessToken(payload: { userId: string; email: string }) {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlJson({
    sub: payload.userId,
    email: payload.email,
    exp: Math.floor(Date.now() / 1000) + accessTokenTtlSeconds
  });
  const signature = createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    throw new AppError(401, "AUTH_INVALID_TOKEN", "Invalid access token.");
  }

  const expectedSignature = createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new AppError(401, "AUTH_INVALID_TOKEN", "Invalid access token.");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as AccessTokenPayload;

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new AppError(401, "AUTH_TOKEN_EXPIRED", "Access token expired.");
  }

  return payload;
}

export function createRefreshToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  return { token, tokenHash, expiresAt };
}

export function hashRefreshToken(token: string) {
  return createHmac("sha256", env.JWT_REFRESH_SECRET).update(token).digest("base64url");
}

