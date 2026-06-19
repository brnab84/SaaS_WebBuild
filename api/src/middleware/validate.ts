import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { badRequest } from "../utils/http-error.js";

type Source = "body" | "query" | "params";

/**
 * zod validation middleware. Parses the chosen request part, replaces it with
 * the parsed (and defaulted/coerced) value, or forwards a 400 with details.
 * Every mutating endpoint uses this — see spec: "validación zod en todos los
 * endpoints".
 */
export function validate(schema: ZodTypeAny, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(badRequest("Validation failed", result.error.flatten()));
    }
    // query/params are read-only getters in Express 5; assign defensively.
    if (source === "body") req.body = result.data;
    else Object.defineProperty(req, source, { value: result.data, configurable: true });
    next();
  };
}
