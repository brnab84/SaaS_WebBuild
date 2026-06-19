import mongoose from "mongoose";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  plan: "free" | "pro" | "business";
  /** Bumped to invalidate all outstanding refresh tokens ("log out everywhere"). */
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // Unique index — see spec: User.email unique.
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    plan: { type: String, enum: ["free", "pro", "business"], default: "free" },
    tokenVersion: { type: Number, default: 0 },
  },
  baseSchemaOptions(["passwordHash", "tokenVersion"]),
);

export const User = model<UserDoc>("User", userSchema);
