import type { Handler } from "express";
import { defineErrors } from "../../../lib/api-error";
import { usernameSchema } from "../../user/username";
import z from "zod";
import { slugSchema } from "../../schema";
import { okAsync, safeTry } from "neverthrow";
import type { ISpaceService } from "../service";

const apiErrors = defineErrors("space::home-post", {
  UNAUTHORIZED: { status: 401, message: "Unauthorized" },
  FORBIDDEN: { status: 403, message: "Forbidden" },
  INVALID_PARAMS: { status: 400, message: "Invalid params" },
  INVALID_BODY: { status: 400, message: "Invalid body" },
});

const setHomeParamSchema = z.object({
  username: usernameSchema,
  spaceSlug: slugSchema,
});
const setHomeBodySchema = z.object({
  content: z.string().nonempty(),
});
export const SetHomePostController =
  (spaceService: ISpaceService): Handler =>
  (req, res) => {
    // validate params
    const result = setHomeParamSchema.safeParse(req.params);
    if (!result.success) {
      return apiErrors.use("INVALID_PARAMS")((err) => res.status(err.status).json(err.message));
    }
    const { username, spaceSlug } = result.data;
    // authenticate
    const auth = res.locals.accessToken;
    if (!auth) {
      return apiErrors.use("UNAUTHORIZED")((err) => res.status(err.status).json(err.message));
    }
    if (auth.username !== username) {
      return apiErrors.use("FORBIDDEN")((err) => res.status(err.status).json(err.message));
    }
    // validate body
    const bodyResult = setHomeBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return apiErrors.use("INVALID_BODY")((err) => res.status(err.status).json(err.message));
    }
    const { content } = bodyResult.data;

    // controller logic
    safeTry(async function* () {
      // get space
      const space = yield* spaceService.get(username, spaceSlug);
      yield* spaceService.setHomePost({content, spaceId: space.id});
      return okAsync(null);
    }).match(
      () => res.status(200).json(null),
      (err) => res.status(err.status).json(err.message),
    );
  };

export const GetHomePostController =
  (spaceService: ISpaceService): Handler =>
  (req, res) => {
    const result = setHomeParamSchema.safeParse(req.params);
    if (!result.success) {
      return apiErrors.use("INVALID_PARAMS")((err) => res.status(err.status).json(err.message));
    }
    const { username, spaceSlug } = result.data;
    // no auth required
    safeTry(async function* () {
      const space = yield* spaceService.get(username, spaceSlug);
      const homePost = yield* spaceService.getHomePost(space.id);
      return okAsync(homePost);
    }).match(
      (homePost) => res.status(200).json(homePost),
      (err) => res.status(err.status).json(err.message),
    );
  };
