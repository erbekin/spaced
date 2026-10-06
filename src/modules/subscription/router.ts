import { Router, type Handler } from "express";
import {
  GetSubscriptionDetailsController,
  ListSubscribersController,
  ListSubscriptionsController,
  SubscribeController,
} from "./controllers";
import type { ISpaceService } from "../space/service";
import type { IUserService } from "../user/service";
import type { ISubscriptionService } from "./service";
import { AccessTokenAuthMiddleware } from "../auth/middleware/access-token-auth";
import type { ITokenService } from "../auth/token/service";

export default function createSubscriptionRouter(
  tokenService: ITokenService,
  subService: ISubscriptionService,
  userService: IUserService,
  spaceService: ISpaceService,
): Router {
  const router = Router();

  const authMiddleware = AccessTokenAuthMiddleware(tokenService);

  // subscribe to a space
  router.post(
    "/subscribe/:username/:spaceSlug",
    authMiddleware,
    SubscribeController("subscribe", subService, userService, spaceService),
  );

  // unsubscribe from a space
  router.post(
    "/unsubscribe/:username/:spaceSlug",
    authMiddleware,
    SubscribeController("unsubscribe", subService, userService, spaceService),
  );

  // list subscriptions
  // auth: yes
  router.get("/:username", authMiddleware, ListSubscriptionsController(subService, userService));

  // list subscribers of a space
  // auth: no
  router.get("/:username/spaces/:spaceSlug", ListSubscribersController(subService, spaceService));

  // get subscription details
  // auth: no
  router.get("/details", GetSubscriptionDetailsController('get', subService));
  router.post("/details", GetSubscriptionDetailsController('post', subService));

  return router;
}
