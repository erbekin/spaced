import type { Handler } from "express";
import { defineErrors } from "../../../lib/api-error";
import type { ISpaceService } from "../service";

const apiErrors = defineErrors('space::delete', {
  UNAUTHORIZED: { message: "Unauthorized", status: 401 },
})

export const DeleteSpaceController = (spaceService: ISpaceService): Handler => (req, res) => {
  const {spaceSlug} = req.params;
  if (typeof spaceSlug !== 'string') {
    throw new Error('spaceSlug must be a string');
  }
  const username = res.locals.accessToken?.username;
  if (!username) {
    return apiErrors.use('UNAUTHORIZED')((error) => res.status(error.status).json(error));
  }
  spaceService.delete(username, spaceSlug)
    .match(() => {
      res.status(204).send();
    }, (error) => {
      res.status(error.status).json(error);
    })
}
