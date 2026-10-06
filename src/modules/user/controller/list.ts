import type { Handler } from "express";
import type { IUserService } from "../service";
import { pageSchema } from "../../../lib/pagination";
import { usernameSchema } from "../username";
import { defineErrors } from "../../../lib/api-error";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const listUsersPageSchema = pageSchema({ defaultLimit: DEFAULT_LIMIT, maxLimit: MAX_LIMIT }, usernameSchema);

const apiErrors = defineErrors('user::list', {
  INVALID_QUERY: { message: "Invalid query", status: 400 },
})
export const ListUsersController =
  (userService: IUserService): Handler =>
    (req, res) => {
    const result = listUsersPageSchema.safeParse(req.query);
    if (!result.success) {
      return apiErrors.use('INVALID_QUERY')((err) => res.status(err.status).json(err));
    }
    const { limit, cursor } = result.data;
    userService.list({ limit, cursor }).match(
      (list) => {
        res.json(list);
      },
      (error) => {
        res.status(error.status).json(error);
      },
    );
  };
