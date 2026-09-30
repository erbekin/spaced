import { Router } from "express";
import { RegisterUserController } from "./controller/register";
import { type IUserService } from "./service";
import { ListUsersController } from "./controller/list";
import { LoginUserController, AlreadyLoggedInMiddleware } from "./controller/login";
import { MeUserController } from "./controller/me";
import { TokenService } from "../auth/token/service";
import { AccessTokenAuthMiddleware } from "../auth/middleware/access-token-auth";
import { RefreshUserController } from "./controller/refresh";
import { LogoutUserController } from "./controller/logout";
import type { ISessionService } from "../auth/session/service";







export interface IUserRouterDependencies  {
  userService: IUserService;
  tokenService: TokenService;
  sessionService: ISessionService;
}
export interface IUserRouterOptions {
  base: string;
}
export type IUserRouterParams = IUserRouterDependencies & IUserRouterOptions

export function createRouter(params: IUserRouterParams): Router {

  const router = Router();
  const { base } = params;

  // redirect to /list by default
  router.get('/', (req, res) => {
    res.redirect(`${base}/list`)
  });

  const accessTokenAuthMiddleware = AccessTokenAuthMiddleware(params.tokenService);

  router.get('/list', ListUsersController(params.userService));
  router.post('/register', RegisterUserController(params.userService))
  router.post('/login', AlreadyLoggedInMiddleware(params.sessionService), LoginUserController(params.userService))
  router.post('/refresh', RefreshUserController(params.userService))
  router.post('/logout', LogoutUserController(params.userService))
  router.get('/me', accessTokenAuthMiddleware, MeUserController(params.userService))
  return router;
}

export default createRouter;
