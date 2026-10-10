import type { Handler } from "express";
import type { IUserService } from "../service";
import { usernameSchema } from "../username";
import { defineErrors } from "../../../lib/api-error";
import { okAsync, safeTry } from "neverthrow";

const apiErrors = defineErrors("user", {
  INVALID_USERNAME: { message: "username is invalid", status: 400 },
});

export const GetUserHome =
  (userService: IUserService): Handler =>
  (req, res) => {
    const result = usernameSchema.safeParse(req.params.username);
    if (!result.success) {
      return apiErrors.use("INVALID_USERNAME")((err) =>
        res.status(err.status).json(err),
      );
    }
    const username = result.data;

    // get user with username
    safeTry(async function* () {
      const user = yield* userService.getByUsername(username);
      const homePost = yield* userService.getHomePost(user.id);

      return okAsync({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
        // looks ugly, but getHomePost returns { homePost: HomePost | null }
        // dont ask me why
        homePost: homePost.homePost,
      });
    }).match(
      (data) => res.json(data),
      (err) => res.status(err.status).json(err),
    );
  };

export const CheckUsername =
  (userService: IUserService): Handler =>
  (req, res) => {
    const result = usernameSchema.safeParse(req.params.username);
    if (!result.success) {
      return apiErrors.use("INVALID_USERNAME")((err) =>
        res.status(err.status).json(err),
      );
    }
    const username = result.data;

    safeTry(async function* () {
      const user = yield* userService.getByUsername(username);
      return okAsync({
        id: user.id,
        username: user.username,
        name: user.name,
      });
    }).match(
      (data) => res.json({ found: true, user: data }),
      (err) => {
        if (err.code === 'USER_NOT_FOUND') {
          return res.json({ found: false, user: null });
        }
        res.status(err.status).json(err);
      },
    );
  };
