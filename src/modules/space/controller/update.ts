import type { Handler } from "express";
import type { ISpaceService } from "../service";
import z from "zod";
import { defineErrors } from "../../../lib/api-error";

const updateSchema = z.object({
  slug: z.string().max(64).optional(),
  name: z.string().optional(),
  homePostId: z.uuid().optional().nullable(),
});

const apiErrors = defineErrors('space::update', {
  INVALID_INPUT: { message: 'Invalid input', status: 400 },
  UNAUTHORIZED: { message: 'Unauthorized', status: 401 },
})

export const UpdateSpaceController = (spaceService: ISpaceService): Handler => (req, res) => {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    return apiErrors.use('INVALID_INPUT')(error => res.status(error.status).json(error));
  }
  const { spaceSlug } = req.params;
  if (typeof spaceSlug !== 'string') {
    throw new Error('expected string url params');
  }
  const username  = res.locals.accessToken?.username;
  if (!username) {
    return apiErrors.use('UNAUTHORIZED')(error => res.status(error.status).json(error));
  }
  spaceService.update(username, spaceSlug, result.data)
    .match((s) => {
      res.json(s);
    }, (error) => {
      res.status(error.status).json(error);
    })
}
