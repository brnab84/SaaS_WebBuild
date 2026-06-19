import mongoose from "mongoose";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

export interface AssetDoc {
  _id: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  filename: string;
  /** Storage key (StorageService addressing) — opaque to the rest of the app. */
  key: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<AssetDoc>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    filename: { type: String, required: true },
    key: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  baseSchemaOptions(),
);

export const Asset = model<AssetDoc>("Asset", assetSchema);
