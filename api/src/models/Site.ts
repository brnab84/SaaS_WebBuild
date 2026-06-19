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
  customDomain: string | null;
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
    customDomain: { type: String, default: null },
  },
  baseSchemaOptions(),
);

// Slug is globally addressable for serving published sites (/s/:slug), so it is
// globally unique. (workspace is indexed above for listing a workspace's sites.)
siteSchema.index({ slug: 1 }, { unique: true });
// Custom domain is globally unique only when actually set. A partial filter on
// string values is required: the field defaults to `null`, so a plain
// unique+sparse index would treat every domain-less site's null as a collision.
siteSchema.index(
  { customDomain: 1 },
  { unique: true, partialFilterExpression: { customDomain: { $type: "string" } } },
);

export const Site = model<SiteDoc>("Site", siteSchema);
