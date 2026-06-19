import mongoose from "mongoose";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

export interface SiteDoc {
  _id: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  status: "draft" | "published";
  publishedAt: Date | null;
  homePage: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<SiteDoc>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true, // spec: Site.workspace index
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date, default: null },
    homePage: { type: Schema.Types.ObjectId, ref: "Page", default: null },
  },
  baseSchemaOptions(),
);

// Slug is globally addressable for serving published sites (/s/:slug), so it is
// globally unique. (workspace is indexed above for listing a workspace's sites.)
siteSchema.index({ slug: 1 }, { unique: true });

export const Site = model<SiteDoc>("Site", siteSchema);
