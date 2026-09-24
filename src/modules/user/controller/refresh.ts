import { type Handler } from "express";
import { defineErrors } from "../../../lib/api-error";
import type { IUserService } from "../service";
import { okAsync, safeTry } from "neverthrow";
import { config } from "../../config";


const RefreshError = defineErrors("user::refresh", {
  UNAUTHORIZED: { message: "Unauthorized", status: 401 },
});
export const RefreshUserController = (
  userService: IUserService
) : Handler => (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (typeof refreshToken !== 'string') {
    const error = RefreshError.create('UNAUTHORIZED', {message: "Unauthorized: missing or invalid refresh token"});
    return res.status(error.status).json(error);
  }

  safeTry(async function* () {
    const tokens = yield* userService.refresh(refreshToken).orTee((error) => {
      res.status(error.status).json(error);
    });
    // set cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      sameSite: true,
      secure: Bun.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: config.jwt.refreshToken.expiration,
    });
    res.status(200).json({ accessToken: tokens.accessToken });
    return okAsync();
  })
};
