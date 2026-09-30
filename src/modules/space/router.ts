
import { Router } from "express";
import type { ISpaceService } from "./service";
import { CreateSpaceController } from "./controller/create";
import { ListSpaceController } from "./controller/list";
import { AccessTokenAuthMiddleware } from "../auth/middleware/access-token-auth";
import type { ITokenService } from "../auth/token/service";

export interface ISpaceRouterDependencies  {
  spaceService: ISpaceService,
  tokenService: ITokenService,
}
export interface ISpaceRouterOptions {
}
export type ISpaceRouterParams = ISpaceRouterDependencies & ISpaceRouterOptions

export default function createSpaceRouter(params: ISpaceRouterParams) {
  const router = Router();

  const accessTokenMiddleware = AccessTokenAuthMiddleware(params.tokenService);

  router.post("/", accessTokenMiddleware, CreateSpaceController(params.spaceService));
  router.get("/:username", ListSpaceController(params.spaceService));

  return router;
}
