import type { Handler } from "express";
import z from "zod";
import { config } from "../../config";
import type { ISessionService } from "../../auth/session/service";
import type { IUserService } from "../service";
import { defineErrors, withPayload } from "../../../lib/api-error";

const loginSchema = z.object({
  username: z.string(),
  password: z.string().min(3).max(255),
});

const LoginError = defineErrors('user::login', {
  INVALID_REFRESH_TOKEN: { status: 400, message: 'Invalid or missing refresh token' },
  SESSION_FOUND: withPayload<{ sessionId: string }>({ status: 400, message: 'Session found, clear the cookie and try again' }),
  INVALID_BODY: withPayload<{ issues: z.core.$ZodIssue[] }>({ status: 400, message: 'Invalid request body, expected username and password' }),
})

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
    const error = LoginError.create('INVALID_REFRESH_TOKEN');
    return res.status(error.status).json(error);
  }
  sessionService.decode(refreshToken)
    .match((session) => {
      const error = LoginError.create('SESSION_FOUND', { payload: { sessionId: session.sessionId } });
      return res.status(error.status).json(error);
    }, (error) => {
      if (error.code !== 'NOT_FOUND') {
        return res.status(error.status).json(error.toJSON());
      }
      next();
    });
};

export const LoginUserController = (
  userService: IUserService
): Handler => (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    const error = LoginError.create('INVALID_BODY', { payload: { issues: result.error.issues } });
    return res.status(error.status).json(error);
  }
  const { username, password } = result.data;
  userService.login({ username, password })
    .match(({tokens, user}) => {
      res.cookie('refreshToken', tokens.refreshToken, {
        sameSite: true,
        secure: Bun.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: config.jwt.refreshToken.expiration,
      });
      return res.status(200).json({tokens, user});
    }, (error) => {
      return res.status(error.status).json(error.toJSON());
    })
};
