import type { Handler } from "express";
import type { IUserService } from "../service";
import { defineErrors } from "../../../lib/api-error";

const MeError = defineErrors('user::me', {
  UNAUTHORIZED: { status: 401, message: 'Unauthorized' },
});

export const MeUserController =
  (userService: IUserService): Handler =>
    (req, res) => {
    const accessToken = res.locals.accessToken;
      if (!accessToken) {
        const error = MeError.create('UNAUTHORIZED');
        return res.status(error.status).json(error);
      }
      userService.get(accessToken.userId)
        .match(
          (user) => {
            res.json(user);
          },
          (error) => {
            res.status(error.status).json(error);
          },
        );
    };
