import mongoose from "mongoose";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

// Phase 3 (e-commerce) — model ready, fulfillment/payment logic later.
export interface OrderItem {
  product: mongoose.Types.ObjectId;
  title: string;
  priceCents: number;
  quantity: number;
}

export interface OrderDoc {
  _id: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  site: mongoose.Types.ObjectId | null;
  items: OrderItem[];
  totalCents: number;
  currency: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
  provider: "stripe" | "mercadopago" | null;
  providerRef: string | null;
  customer: { name: string; email: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    priceCents: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDoc>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    site: { type: Schema.Types.ObjectId, ref: "Site", default: null },
    items: { type: [orderItemSchema], default: [] },
    totalCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "paid", "fulfilled", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    provider: { type: String, enum: ["stripe", "mercadopago", null], default: null },
    providerRef: { type: String, default: null },
    customer: { type: Schema.Types.Mixed, default: null },
  },
  baseSchemaOptions(),
);

export const Order = model<OrderDoc>("Order", orderSchema);
