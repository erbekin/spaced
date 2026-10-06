import type { Handler } from "express";
import type { ISpaceService } from "../service";

import { defineErrors } from "../../../lib/api-error";
import { pageSchema } from "../../../lib/pagination";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const ListSpaceQuerySchema = pageSchema({ defaultLimit: DEFAULT_LIMIT, maxLimit: MAX_LIMIT });

const apiErrors = defineErrors('space::list', {
  INVALID_INPUT: { message: "Invalid input", status: 400 },
})

export const ListSpaceController =
  (spaceService: ISpaceService): Handler =>
  (req, res) => {
    const { username } = req.params;
    if (typeof username !== "string") {
      throw new Error("username url parameter is required");
    }
    const result = ListSpaceQuerySchema.safeParse(req.query);
    if (!result.success) {
      return apiErrors.use('INVALID_INPUT')((error) => res.status(error.status).json(error));
    }
    const { limit, cursor } = result.data;

    spaceService.list(username, { limit, cursor }).match(
      (page) => res.status(200).json(page),
      (error) => res.status(error.status).json(error),
    );
  };
