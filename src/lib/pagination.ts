import z from "zod";
import { uuidSchema } from "../modules/schema";

export type PageArgs = { limit: number; cursor?: string };
export type Page<T> = { items: T[]; nextCursor: string | null };

export const pageSchema = (limits: {
  defaultLimit: number;
  maxLimit: number;
}, cursorSchema: z.ZodType<string> = uuidSchema) => {
  return z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(limits.maxLimit)
      .default(limits.defaultLimit),
    cursor: cursorSchema.optional(),
  });
};
