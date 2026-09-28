import type { Handler } from "express";
import { defineErrors } from "../../../lib/api-error";
import { writeApiError } from "./utils";
import type { IUserService } from "../service";
import { okAsync } from "neverthrow";

const LogoutError = defineErrors('user::logout', {
  TOKEN_NOT_FOUND: { message: 'Token not found', status: 400 },
  SERVICE_FAILURE: {message: 'Service failure', status: 500},
})


export const LogoutUserController = (userService: IUserService): Handler => (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (typeof refreshToken !== 'string') {
    return writeApiError(res, LogoutError.create('TOKEN_NOT_FOUND'));
  };

  userService.logout(refreshToken)
    .orTee((error) => console.log('user::logout', error))
    .andThen(() => {
      res.clearCookie('refreshToken');
      res.status(200).json({ message: 'Logout successful' });
      return okAsync();
    })
    .orTee((error) => writeApiError(res, LogoutError.create('SERVICE_FAILURE', { message: error.message, status: error.status })))

}
