import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../utils/http-error.js";
import { verifyAccessToken } from "../services/token.service.js";

/** Require a valid Bearer access token; sets req.userId for downstream handlers. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(unauthorized("Missing Bearer token"));
  }
  try {
    const { sub } = verifyAccessToken(token);
    req.userId = sub;
    next();
  } catch {
    next(unauthorized("Invalid or expired access token"));
  }
}

/** Read the authenticated user id (guaranteed present after requireAuth). */
export function userId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
