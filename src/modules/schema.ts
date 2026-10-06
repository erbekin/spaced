import z from "zod";

export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid slug").max(64, "slug too long").min(3, "slug too short");
/** z.uuid() accepts any version. But we use v4 !!.
 * This should be used instead of `z.uuid()` in schemas, when applicable.
 */
export const uuidSchema = z.uuidv4().toLowerCase();
