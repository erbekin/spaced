
import { Router } from "express";
import type { ISpaceService } from "./service";
import { CreateSpaceController } from "./controller/create";
import { ListSpaceController } from "./controller/list";
import { GetOneSpaceController } from "./controller/get-one";
import { AccessTokenAuthMiddleware } from "../auth/middleware/access-token-auth";
import type { ITokenService } from "../auth/token/service";
import { UpdateSpaceController } from "./controller/update";
import { DeleteSpaceController } from "./controller/delete";

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
  router.get("/:username/:spaceSlug", GetOneSpaceController(params.spaceService));
  router.patch("/:spaceSlug", accessTokenMiddleware, UpdateSpaceController(params.spaceService));
  router.delete("/:spaceSlug", accessTokenMiddleware, DeleteSpaceController(params.spaceService));

  return router;
}
