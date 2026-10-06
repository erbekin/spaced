import type { Handler } from "express";
import type { ISubscriptionService } from "./service";
import z from "zod";
import { Result } from "neverthrow";
import { defineErrors } from "../../lib/api-error";
import type { IUserService } from "../user/service";
import type { ISpaceService } from "../space/service";
import { slugSchema } from "../schema";



const apiErrors = defineErrors("subscription", {
  INVALID_PARAMS: { message: "Invalid params", status: 400 },
  UNAUTHORIZED: { message: "Unauthorized", status: 401 },
  FORBIDDEN: { message: "Forbidden", status: 403 },
});
// curried function to parse params to result using a given schema
const parseParams = <T>(schema: z.ZodType<T>) =>
  Result.fromThrowable(
    (params) => schema.parse(params),
    () => apiErrors.create("INVALID_PARAMS"),
  );

// Controller type for the subscribe/unsubscribe controller.
// Since, the controller handles both subscribe and unsubscribe operations,
// we use a type to differentiate between them.
export type ControllerType = "subscribe" | "unsubscribe";

const subscribeParamsSchema = z.object({
  username: z.uuidv4(),
  spaceSlug: slugSchema,
});

export const SubscribeController =
  (
    type: ControllerType,
    subService: ISubscriptionService,
    userService: IUserService,
    spaceService: ISpaceService,
  ): Handler =>
  (req, res) => {
    const parsed = parseParams(subscribeParamsSchema)(req.params);
    if (parsed.isErr()) {
      res.status(400).json(parsed.error);
      return;
    }
    const { username: usernameParam, spaceSlug: spaceSlugParam } = parsed.value;

    const token = res.locals.accessToken;
    if (token === undefined) {
      return apiErrors.use("UNAUTHORIZED")((err) => {
        res.status(err.status).json(err);
      });
    }
    // token username must match username param
    if (token.username !== usernameParam) {
      return apiErrors.use("FORBIDDEN")((err) => {
        res.status(err.status).json(err);
      });
    }
    // get ids using services.
    userService
      .getByUsername(usernameParam)
      .andThen((user) => {
        return spaceService.get(user.username, spaceSlugParam).map((space) => ({
          spaceId: space.id,
          userId: user.id,
        }));
      })
      // subscribe or unsubscribe based on the controller type
      .andThen(({ spaceId, userId }) => {
        return type === "subscribe"
          ? subService.subscribe(userId, spaceId)
          : subService.unsubscribe(userId, spaceId);
      })
      .match(
        (result) => {
          res.status(200).json(result);
        },
        (err) => {
          res.status(err.status).json(err);
        },
      );
  };

export const ListSubscriptionsController =
  (subService: ISubscriptionService, userService: IUserService): Handler =>
  (req, res) => {
    const { username } = req.params;
    const parsed = parseParams(z.uuidv4())(username);
    if (parsed.isErr()) {
      res.status(400).json(parsed.error);
      return;
    }
    const token = res.locals.accessToken;
    if (token === undefined) {
      return apiErrors.use("UNAUTHORIZED")((err) => {
        res.status(err.status).json(err);
      });
    }
    if (token.username !== username) {
      return apiErrors.use("FORBIDDEN")((err) => {
        res.status(err.status).json(err);
      });
    }
    userService
      .getByUsername(username)
      .map((user) => user.id)
      .andThen((userId) => {
        return subService.getSubscriptions(userId);
      })
      .match(
        (sub) => {
          res.json(sub);
        },
        (err) => {
          res.status(err.status).json(err);
        },
      );
  };

export const ListSubscribersController =
  (subService: ISubscriptionService, spaceService: ISpaceService): Handler =>
  (req, res) => {
    const parsed = parseParams(subscribeParamsSchema)(req.params);
    if (parsed.isErr()) {
      res.status(400).json(parsed.error);
      return;
    }
    const { username, spaceSlug } = parsed.value;

    spaceService.get(username, spaceSlug)
      .map((space) => space.id)
      .andThen((spaceId) => {
        return subService.getSubscribers(spaceId);
      })
      .match(
        (sub) => {
          res.json(sub);
        },
        (err) => {
          res.status(err.status).json(err);
        },
      );
  };
