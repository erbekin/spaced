import { Router } from "express";
import { RegisterUserController } from "./controller/register";
import { UserService } from "./service";
import { SessionService } from "../auth/session/service";
import { PrismaSessionRepository } from "../auth/prisma-repository";
import { PrismaUserRepository } from "./prisma-repository";
import { BunPasswordHasher } from "../auth/password-hasher";
import { ListUsersController } from "./controller/list";
import { LoginUserController, AlreadyLoggedInMiddleware } from "./controller/login";
import { MeUserController } from "./controller/me";
import { TokenService } from "../auth/token/service";
import { AccessTokenAuthMiddleware } from "../auth/middleware/access-token-auth";



const tokenService = new TokenService();
const sessionService = new SessionService(PrismaSessionRepository, tokenService);

const userService =
  new UserService(
    sessionService,
    PrismaUserRepository,
    BunPasswordHasher.getInstance(),
    tokenService,
  );

export function createRouter(base: string): Router {
  const router = Router();

  // redirect to /list by default
  router.get('/', (req, res) => {
    res.redirect(`${base}/list`)
  });

  router.get('/list', ListUsersController(userService));

  router.post('/register', RegisterUserController(userService))

  router.post('/login', AlreadyLoggedInMiddleware(sessionService), LoginUserController(userService))

  const accessTokenAuthMiddleware = AccessTokenAuthMiddleware(tokenService);

  router.get('/me', accessTokenAuthMiddleware, MeUserController(userService))
  return router;
}

export default createRouter;
