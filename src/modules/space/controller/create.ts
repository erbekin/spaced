import type { Handler } from "express";
import type { ISpaceService } from "../service";
import z from "zod";
import { defineErrors, withPayload } from "../../../lib/api-error";
import { slugSchema } from "../schema";
const createSpaceSchema = z.object({
  name: z.string(),
  slug: slugSchema,
});

const CreateErrors = defineErrors("space::create", {
  INVALID_INPUT: withPayload<{ issues: any }>({ message: "Invalid input", status: 400 }),
  UNAUTHORIZED: { message: "Unauthorized", status: 401 },
});

export const CreateSpaceController =
  (spaceService: ISpaceService): Handler =>
  (req, res) => {
    const result = createSpaceSchema.safeParse(req.body);
    if (!result.success) {
      return CreateErrors.use("INVALID_INPUT", { payload: { issues: result.error.issues } })((err) =>
        res.status(err.status).json(err),
      );
    }
    const userId = res.locals.accessToken?.userId;
    if (!userId) {
      return CreateErrors.use("UNAUTHORIZED")((err) => res.status(err.status).json(err));
    }
    spaceService.create({ name: result.data.name, slug: result.data.slug, ownerId: userId }).match(
      (space) => {
        res.status(201).json(space);
      },
      (error) => {
        res.status(error.status).json(error);
      },
    );
  };
