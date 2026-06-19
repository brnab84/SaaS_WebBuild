import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { HttpError } from "../utils/http-error.js";
import { isProd } from "../config/env.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
}

/** Central error handler — maps known error shapes to clean HTTP responses. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.flatten() });
    return;
  }
  // multer upload errors (e.g. file too large) -> 400.
  if (typeof err === "object" && err !== null && (err as { name?: string }).name === "MulterError") {
    res.status(400).json({ error: (err as Error).message });
    return;
  }
  // Mongo duplicate key (e.g. unique slug/email).
  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    res.status(409).json({ error: "Resource already exists" });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: "Invalid data", details: err.message });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid identifier" });
    return;
  }

  logger.error("Unhandled error", err);
  res.status(500).json({ error: isProd ? "Internal server error" : String(err) });
}
