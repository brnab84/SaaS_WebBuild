import mongoose from "mongoose";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

// Phase 4 (events + RSVP) — model ready, RSVP/forms logic later.
export interface Rsvp {
  name: string;
  email: string;
  guests: number;
  status: "going" | "maybe" | "declined";
  createdAt: Date;
}

export interface EventDoc {
  _id: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  site: mongoose.Types.ObjectId | null;
  title: string;
  slug: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string;
  capacity: number | null;
  rsvps: Rsvp[];
  createdAt: Date;
  updatedAt: Date;
}

const rsvpSchema = new Schema<Rsvp>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    guests: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: ["going", "maybe", "declined"], default: "going" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const eventSchema = new Schema<EventDoc>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    site: { type: Schema.Types.ObjectId, ref: "Site", default: null },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    description: { type: String, default: "" },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    location: { type: String, default: "" },
    capacity: { type: Number, default: null },
    rsvps: { type: [rsvpSchema], default: [] },
  },
  baseSchemaOptions(),
);

eventSchema.index({ workspace: 1, slug: 1 }, { unique: true });

export const Event = model<EventDoc>("Event", eventSchema);
