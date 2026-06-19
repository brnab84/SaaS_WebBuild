import mongoose from "mongoose";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

export type WorkspaceRole = "owner" | "admin" | "editor";

export interface WorkspaceMember {
  user: mongoose.Types.ObjectId;
  role: WorkspaceRole;
}

export interface WorkspaceDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  owner: mongoose.Types.ObjectId;
  members: WorkspaceMember[];
  brandKit: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<WorkspaceMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "admin", "editor"], default: "editor" },
  },
  { _id: false },
);

const workspaceSchema = new Schema<WorkspaceDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: { type: [memberSchema], default: [] },
    brandKit: { type: Schema.Types.ObjectId, ref: "BrandKit" },
  },
  baseSchemaOptions(),
);

// Fast "which workspaces am I a member of" lookups.
workspaceSchema.index({ "members.user": 1 });

export const Workspace = model<WorkspaceDoc>("Workspace", workspaceSchema);
