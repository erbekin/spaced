import type { Handler } from "express";
import { defineErrors } from "../../../lib/api-error";
import { writeApiError } from "./utils";
import type { IUserService } from "../service";
import { okAsync } from "neverthrow";

const LogoutError = defineErrors('user::logout', {
  TOKEN_NOT_FOUND: { message: 'Token not found', status: 400 },
  INVALID_TOKEN: { message: 'Invalid token', status: 400 },
})


export const LogoutUserController = (userService: IUserService): Handler => (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (typeof refreshToken !== 'string') {
    return writeApiError(res, LogoutError.create('TOKEN_NOT_FOUND'));
  };
  if (refreshToken.trim().length === 0) {
    return writeApiError(res, LogoutError.create('INVALID_TOKEN', { message: 'Token cannot be empty' }));
  };

  userService.logout(refreshToken)
    .andThen(() => {
      res.clearCookie('refreshToken');
      res.status(200).json({ message: 'Logout successful' });
      return okAsync();
    })
    .orTee((error) => res.status(error.status).json(error))

}
