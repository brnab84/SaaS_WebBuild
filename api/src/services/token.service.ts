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
  return { sub: String(decoded.sub), ver: Number(decoded.ver ?? 0) };
}
