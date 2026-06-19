import mongoose from "mongoose";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

// Phase 3 (e-commerce). Model is defined now so the data layer is ready; the
// checkout/payment logic (Mercado Pago / Stripe) lands in a later phase.
export interface ProductDoc {
  _id: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  site: mongoose.Types.ObjectId | null;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  images: string[];
  stock: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDoc>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    site: { type: Schema.Types.ObjectId, ref: "Site", default: null },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    description: { type: String, default: "" },
    priceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    images: { type: [String], default: [] },
    stock: { type: Number, default: null },
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions(),
);

productSchema.index({ workspace: 1, slug: 1 }, { unique: true });

export const Product = model<ProductDoc>("Product", productSchema);
