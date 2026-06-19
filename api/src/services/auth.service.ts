import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  defaultBrandKit,
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
  type UserDTO,
  type WorkspaceDTO,
} from "@webforge/shared";
import { env } from "../config/env.js";
import { BrandKit } from "../models/BrandKit.js";
import { User, type UserDoc } from "../models/User.js";
import { Workspace, type WorkspaceDoc } from "../models/Workspace.js";
import type { AuthTokens } from "@webforge/shared";
import { badRequest, conflict, unauthorized } from "../utils/http-error.js";
import { slugify, withRandomSuffix } from "../utils/slug.js";
import { sendEmail } from "./email.service.js";
import {
  signAccessToken,
  signRefreshToken,
  signResetToken,
  verifyRefreshToken,
  verifyResetToken,
} from "./token.service.js";

const BCRYPT_ROUNDS = 12;

function toUserDTO(u: UserDoc): UserDTO {
  return { id: u._id.toString(), name: u.name, email: u.email, plan: u.plan, role: u.role };
}

/** Is this the configured product-owner email? */
function isSuperAdminEmail(email: string): boolean {
  return !!env.SUPER_ADMIN_EMAIL && email === env.SUPER_ADMIN_EMAIL.toLowerCase();
}
function toWorkspaceDTO(w: WorkspaceDoc): WorkspaceDTO {
  return { id: w._id.toString(), name: w.name, slug: w.slug };
}

function issueTokens(user: UserDoc) {
  return {
    accessToken: signAccessToken(user._id.toString()),
    refreshToken: signRefreshToken(user._id.toString(), user.tokenVersion),
  };
}

async function uniqueWorkspaceSlug(name: string): Promise<string> {
  let slug = slugify(name);
  // Loop until the slug is free (rare collisions in practice).
  while (await Workspace.exists({ slug })) slug = withRandomSuffix(slugify(name));
  return slug;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  if (await User.exists({ email })) throw conflict("Email already registered");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email,
    passwordHash,
    role: isSuperAdminEmail(email) ? "superadmin" : "user",
  });

  const wsName = input.workspaceName?.trim() || `${input.name}'s workspace`;
  const slug = await uniqueWorkspaceSlug(wsName);

  // Each workspace owns a BrandKit (the central design-token source).
  const workspaceId = new mongoose.Types.ObjectId();
  const brandKit = await BrandKit.create({ workspace: workspaceId, ...defaultBrandKit });
  const workspace = await Workspace.create({
    _id: workspaceId,
    name: wsName,
    slug,
    owner: user._id,
    members: [{ user: user._id, role: "owner" }],
    brandKit: brandKit._id,
  });

  return {
    user: toUserDTO(user),
    workspace: toWorkspaceDTO(workspace),
    tokens: issueTokens(user),
  };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email });
  if (!user) throw unauthorized("Invalid email or password");

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid email or password");

  // Promote the product owner on login (covers accounts created before the env was set).
  if (isSuperAdminEmail(user.email) && user.role !== "superadmin") {
    user.role = "superadmin";
    await user.save();
  }

  const workspace = await Workspace.findOne({ "members.user": user._id }).sort({ createdAt: 1 });
  if (!workspace) throw badRequest("User has no workspace");

  return {
    user: toUserDTO(user),
    workspace: toWorkspaceDTO(workspace),
    tokens: issueTokens(user),
  };
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized("Invalid refresh token");
  }
  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.ver) throw unauthorized("Refresh token revoked");

  const workspace = await Workspace.findOne({ "members.user": user._id }).sort({ createdAt: 1 });
  if (!workspace) throw badRequest("User has no workspace");

  return {
    user: toUserDTO(user),
    workspace: toWorkspaceDTO(workspace),
    tokens: issueTokens(user),
  };
}

export async function me(userId: string): Promise<{ user: UserDTO; workspaces: WorkspaceDTO[] }> {
  const user = await User.findById(userId);
  if (!user) throw unauthorized();
  const workspaces = await Workspace.find({ "members.user": user._id }).sort({ createdAt: 1 });
  return { user: toUserDTO(user), workspaces: workspaces.map(toWorkspaceDTO) };
}

/** Change password for the authenticated user; returns fresh tokens. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthTokens> {
  const user = await User.findById(userId);
  if (!user) throw unauthorized();
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw unauthorized("Current password is incorrect");
  }
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // invalidate other sessions
  await user.save();
  return issueTokens(user);
}

/** Email a reset link. Always resolves (never reveals whether the email exists). */
export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return;
  const token = signResetToken(user._id.toString(), user.tokenVersion);
  const link = `${env.PUBLIC_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your WebForge password",
    html:
      `<p>Hi ${user.name},</p><p>Click the link below to set a new password (valid for 1 hour):</p>` +
      `<p><a href="${link}">Reset my password</a></p><p>If you didn't request this, ignore this email.</p>`,
    text: `Reset your WebForge password: ${link}`,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  let payload;
  try {
    payload = verifyResetToken(token);
  } catch {
    throw badRequest("Invalid or expired reset link");
  }
  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.ver) {
    throw badRequest("Invalid or expired reset link");
  }
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // single-use: invalidates the reset token
  await user.save();
}
