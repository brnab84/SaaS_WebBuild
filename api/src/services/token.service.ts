import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AccessPayload {
  sub: string; // user id
}
export interface RefreshPayload {
  sub: string; // user id
  ver: number; // user.tokenVersion at issue time
}

export function signAccessToken(userId: string): string {
  const opts: SignOptions = { subject: userId, expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"] };
  return jwt.sign({}, env.JWT_ACCESS_SECRET, opts);
}

export function signRefreshToken(userId: string, tokenVersion: number): string {
  const opts: SignOptions = {
    subject: userId,
    expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"],
  };
  return jwt.sign({ ver: tokenVersion }, env.JWT_REFRESH_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  return { sub: String(decoded.sub) };
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  if (decoded.typ) throw new Error("Not a refresh token");
  return { sub: String(decoded.sub), ver: Number(decoded.ver ?? 0) };
}

/** Short-lived password-reset token (1h). Carries the user's tokenVersion so it
 *  is invalidated once the password changes. */
export function signResetToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ ver: tokenVersion, typ: "reset" }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: "1h",
  });
}

export function verifyResetToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  if (decoded.typ !== "reset") throw new Error("Not a reset token");
  return { sub: String(decoded.sub), ver: Number(decoded.ver ?? 0) };
}
