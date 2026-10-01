import { Router } from "express";
import type { ITokenService } from "../auth/token/service";
import type { IPostService } from "./service";
import { AccessTokenAuthMiddleware } from "../auth/middleware/access-token-auth";
import { ListPostsController } from "./controller/list";
import { CreatePostController } from "./controller/create";
import { GetOnePostController } from "./controller/get-one";
import { UpdatePostController } from "./controller/update";
import { DeletePostController } from "./controller/delete";


export interface IPostRouterDependencies  {
  postService: IPostService,
  tokenService: ITokenService,
}
export interface IPostRouterOptions {
}
export type IPostRouterParams = IPostRouterDependencies & IPostRouterOptions

export default function createPostRouter(params: IPostRouterParams) {
  const router = Router();
  const accessTokenMiddleware = AccessTokenAuthMiddleware(params.tokenService);

  router.get("/:username/:spaceSlug", ListPostsController(params.postService))
  router.post("/:username/:spaceSlug", accessTokenMiddleware, CreatePostController(params.postService))
  router.get("/:postId", GetOnePostController(params.postService))
  router.patch("/:postId", accessTokenMiddleware, UpdatePostController(params.postService))
  router.delete("/:postId", accessTokenMiddleware, DeletePostController(params.postService))

  return router;
}
