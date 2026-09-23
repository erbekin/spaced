import type { Handler } from "express";
import { Maybe } from "purify-ts";
import { AccessToken, type AccessTokenConfig } from "../../../lib/jwt";

declare global {
  namespace Express {
    interface Locals {
      /**
       * The decoded access token, if one was provided and is valid.
       */
      accessToken: AccessTokenConfig | undefined
    }
  }
}

export const AccessTokenAuth = (): Handler => async (req, res, next) => {
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
    return res.status(401).json({ message: "No token provided" });
  }
  // verify token.
  // invalid -> 401
  // valid -> set token on locals and call next
  (await AccessToken.verify(token))
    .mapErr((_) => {
      res.status(401).json({ message: "Invalid token" });
    })
    .map((token) => {
      res.locals.accessToken = token;
      next();
    });
};
