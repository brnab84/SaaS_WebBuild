import mongoose from "mongoose";
import { baseSchemaOptions } from "./_base.js";

const { Schema, model } = mongoose;

// Phase 4 — generic form captures (contact / lead forms) for a site.
export interface FormSubmissionDoc {
  _id: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  site: mongoose.Types.ObjectId | null;
  formName: string;
  name: string | null;
  email: string | null;
  message: string | null;
  fields: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const formSubmissionSchema = new Schema<FormSubmissionDoc>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    site: { type: Schema.Types.ObjectId, ref: "Site", default: null },
    formName: { type: String, required: true, default: "contact" },
    name: { type: String, default: null },
    email: { type: String, default: null },
    message: { type: String, default: null },
    fields: { type: Schema.Types.Mixed, default: {} },
  },
  baseSchemaOptions(),
);

formSubmissionSchema.index({ workspace: 1, createdAt: -1 });

export const FormSubmission = model<FormSubmissionDoc>("FormSubmission", formSubmissionSchema);
