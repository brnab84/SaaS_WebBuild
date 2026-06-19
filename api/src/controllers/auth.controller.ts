import type { Request, Response } from "express";
import { login, me, refresh, register } from "../services/auth.service.js";
import { userId } from "../middleware/auth.js";

export async function registerHandler(req: Request, res: Response): Promise<void> {
  res.status(201).json(await register(req.body));
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  res.json(await login(req.body));
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  res.json(await refresh(req.body.refreshToken));
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  res.json(await me(userId(req)));
}
