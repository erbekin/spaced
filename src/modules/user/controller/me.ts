import type { Handler } from "express";
import type { IUserService } from "../service";
import { RefreshToken } from "../../../lib/jwt";
import type { ISessionService } from "../../auth/session/service";
import { errAsync, okAsync } from "neverthrow";

// function justOr<T, E>(e: E): (m: Maybe<T>) => ResultAsync<T, E> {
//   return (m: Maybe<T>) => m.mapOrDefault((t) => okAsync(t), errAsync(e))
// }

export const MeUserController =
  (sessionService: ISessionService, userService: IUserService): Handler =>
  (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: {message: "No refresh token"} });
    }
    RefreshToken.verify(refreshToken)
      .mapErr((e) => ({ status: 401, inner: e }))
      .andThen(({ sessionId }) => sessionService.find(sessionId))
      .andThen((session) =>
        session.caseOf({
          Nothing: () => errAsync({status: 404, inner: new Error("session not found")}),
          Just: (session) => okAsync(session),
        }),
      )
      .map((s) => s.userId)
      .andThen((userId) => userService.get(userId))
      .match(
        (user) => {
          res.json(user);
        },
        (error) => {
          res.status(error.status ?? 500).json({error})
        },
      );
  };
