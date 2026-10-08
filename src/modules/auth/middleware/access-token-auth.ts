import type { Handler } from "express";
import { Maybe } from "purify-ts";
import { TokenType, type ITokenService, type TokenConfig } from "../token/service";
import { defineErrors } from "../../../lib/api-error";

declare global {
  namespace Express {
    interface Locals {
      /**
       * The decoded access token, if one was provided and is valid.
       */
      accessToken: TokenConfig<TokenType.Access> | undefined
    }
  }
}

const moduleErrors = defineErrors('auth', {
  NO_TOKEN: {message: "No token provided", status: 401},
})

export const AccessTokenAuthMiddleware = (tokenService: ITokenService): Handler => async (req, res, next) => {
  // Extract token string from authorization header, empty string if not present
  const token = Maybe.fromNullable(req.headers.authorization).caseOf({
    Nothing: () => "",
    Just: (token) => {
      if (!token.startsWith("Bearer ")) {
        return "";
      }
      return token.replace("Bearer ", "");
    },
  });
  // If no token is provided, return 401 Unauthorized
  if (token === "") {
    res.header('WWW-Authenticate', 'Bearer realm="token"');
    return moduleErrors.use('NO_TOKEN')((error) => res.status(error.status).json(error));
  }
  console.log("auth middleware executed");
  // verify token.
  // invalid -> 401
  // valid -> set token on locals and call next
  (await tokenService.verify(TokenType.Access, token))
    .mapErr((error) => {
      res.status(error.status).json(error.toJSON());
    })
    .map((token) => {
      res.locals.accessToken = token;
      next();
    });
};
