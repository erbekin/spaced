import type { Application } from "express";
import { TokenService } from "./auth/token/service";
import { SessionService } from "./auth/session/service";
import { PrismaSessionRepository } from "./auth/prisma-repository";
import { UserService } from "./user/service";
import { PrismaUserRepository } from "./user/prisma-repository";
import { BunPasswordHasher } from "./auth/password-hasher";
import createUserRouter from "./user/router";
import createSpaceRouter from "./space/router";
import { SpaceService } from "./space/service";
import { PrismaSpaceRepository } from "./space/prisma-repository";
export default function buildRouters(app: Application) {
  // ========== Service Instances =========
  const tokenService = new TokenService();
  const sessionService = new SessionService(PrismaSessionRepository, tokenService);

  const userService =
    new UserService(
      sessionService,
      PrismaUserRepository.getInstance(),
      BunPasswordHasher.getInstance(),
      tokenService,
    );

  const spaceService = new SpaceService(PrismaSpaceRepository.getInstance());

  // wire up user router
  app.use('/users', createUserRouter({ base: "/users", userService, tokenService, sessionService }))
  app.use('/spaces', createSpaceRouter({spaceService, tokenService}))
}
