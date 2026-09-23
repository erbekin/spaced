import type { Handler } from "express";
import z from "zod";
import { config } from "../../config";
import type { ISessionService } from "../../auth/session/service";
import { RefreshToken } from "../../../lib/jwt";
import type { IUserService } from "../service";

const loginSchema = z.object({
  username: z.string(),
  password: z.string().min(3).max(255),
});

/**
 * If user is already logged in, return an error.
 * - If no refresh token is present, the user is not logged in.
 *   In this case, calling this middleware is a no-op.
 * - If a refresh token is present, it will be verified.
 *   If it is a valid refresh token, the cookie is cleared
 *   and error with status 400 is returned.
 * @param userService
 * @returns
 */
export const AlreadyLoggedInMiddleware = (
  sessionService: ISessionService
): Handler => (req, res, next) => {
  if (!req.cookies.refreshToken) {
    return next()
  }
  const refreshToken = req.cookies.refreshToken;
  if (typeof refreshToken !== 'string') {
    return res.status(400).json({error: {message: 'Invalid refresh token'}});
  }
  sessionService.decodeSession(refreshToken)
    .match((session) => {
      return res.status(400).json({error: {message: 'Already logged in', sessionId: session.sessionId}});
    }, (error) => {
      if (error.code !== 'NOT_FOUND') {
        return res.status(error.status ?? 500).json({error});
      }
      next();
    });
};

export const LoginUserController = (
  userService: IUserService
): Handler => (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({error: {message: 'Invalid request body', issues: result.error.issues}});
  }
  const { username, password } = result.data;
  userService.login({ username, password })
    .match((user) => {
      res.cookie('refreshToken', user.refreshToken, {
        sameSite: true,
        secure: Bun.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: config.jwt.refreshToken.expiration,
      });
      return res.status(200).json(user);
    }, (error) => {
      return res.status(error.status ?? 500).json({error});
    })
};
