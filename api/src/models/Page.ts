import mongoose from "mongoose";
import type { Block } from "@webforge/shared";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

export interface PageDoc {
  _id: mongoose.Types.ObjectId;
  site: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  /** Serializable block tree — validated by shared zod schema before save. */
  tree: Block;
  isHome: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<PageDoc>(
  {
    site: { type: Schema.Types.ObjectId, ref: "Site", required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    // The whole block tree is stored as opaque JSON; the API validates its shape.
    tree: { type: Schema.Types.Mixed, required: true },
    isHome: { type: Boolean, default: false },
  },
  baseSchemaOptions(),
);

// spec: Page.site+slug index (unique page slug within a site).
pageSchema.index({ site: 1, slug: 1 }, { unique: true });

export const Page = model<PageDoc>("Page", pageSchema);
