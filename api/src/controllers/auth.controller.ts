import type { Request, Response } from "express";
import {
  changePassword,
  forgotPassword,
  login,
  me,
  refresh,
  register,
  resetPassword,
} from "../services/auth.service.js";
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

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  const tokens = await changePassword(userId(req), req.body.currentPassword, req.body.newPassword);
  res.json({ tokens });
}

export async function forgotPasswordHandler(req: Request, res: Response): Promise<void> {
  await forgotPassword(req.body.email);
  res.json({ ok: true }); // never reveal whether the email exists
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  await resetPassword(req.body.token, req.body.newPassword);
  res.json({ ok: true });
}
