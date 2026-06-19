import type { SchemaOptions } from "mongoose";

/**
 * Standard schema options: timestamps + a clean JSON shape (`id` instead of
 * `_id`, no `__v`, never leak sensitive fields). Applied to every model.
 *
 * Returned as `SchemaOptions<any>` so it can be passed to any `new Schema<T>()`
 * without fighting Mongoose's document-bound generic.
 */
export function baseSchemaOptions(hidden: string[] = []): SchemaOptions<any> {
  return {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = ret._id?.toString();
        delete ret._id;
        for (const field of hidden) delete ret[field];
        return ret;
      },
    },
  };
}
