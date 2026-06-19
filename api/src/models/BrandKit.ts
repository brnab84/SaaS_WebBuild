import mongoose from "mongoose";
import type { BrandKit as BrandKitTokens } from "@webforge/shared";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

export interface BrandKitDoc extends BrandKitTokens {
  _id: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Token sub-objects are stored as flexible maps; their shape is validated at the
// API boundary by the shared zod `brandKitSchema`, so Mixed here is intentional.
const brandKitSchema = new Schema<BrandKitDoc>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, default: "Default brand" },
    colors: { type: Schema.Types.Mixed, required: true },
    fonts: { type: Schema.Types.Mixed, required: true },
    spacing: { type: Schema.Types.Mixed, required: true },
    radius: { type: Schema.Types.Mixed, required: true },
    logo: { type: String, default: null },
  },
  baseSchemaOptions(),
);

export const BrandKit = model<BrandKitDoc>("BrandKit", brandKitSchema);
