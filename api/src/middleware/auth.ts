import type { NextFunction, Request, Response } from "express";
import { forbidden, unauthorized } from "../utils/http-error.js";
import { User } from "../models/User.js";
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

/** Require a platform super-admin (the product owner). Runs after requireAuth. */
export async function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await User.findById(userId(req)).select("role");
    if (!user || user.role !== "superadmin") throw forbidden("Admin access required");
    next();
  } catch (err) {
    next(err);
  }
}
