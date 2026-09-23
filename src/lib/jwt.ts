/**
 * @module jwt
 * This module signs and verifies JWT tokens.
 */

import { ResultAsync } from "neverthrow";
import jwtlib from "jsonwebtoken";

//=================== Access Tokens ================//

export interface AccessTokenConfig {
  userId: string;
  username: string;
}

export const AccessToken = {
  /** Creates new access token */
  create: function (config: AccessTokenConfig): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
      new Promise<string>((resolve, reject) => {
        jwtlib.sign(
          { username: config.username },
          Bun.env.JWT_SECRET_ACCESS,
          {
            algorithm: "HS256",
            expiresIn: Bun.env.JWT_ACCESS_TOKEN_EXPIRY,
          },
          (err, token) => {
            if (err || !token) reject(err ?? new Error("token not generated"));
            else resolve(token);
          },
        );
      }),
      (e) => e as Error,
    );
  },

  verify: function (token: string): ResultAsync<AccessTokenConfig, Error> {
    return ResultAsync.fromPromise(
      new Promise<AccessTokenConfig>((resolve, reject) => {
        jwtlib.verify(
          token,
          Bun.env.JWT_SECRET_ACCESS,
          {
            algorithms: ["HS256"],
          },
          (err, decoded) => {
            if (err || decoded === undefined) reject(err ?? new Error("verification failed"));
            else {
              const payload = decoded as jwtlib.JwtPayload;
              if (!payload.sub || !payload.username)
                return reject(new Error("invalid jwt payload"));
              resolve({ userId: payload.sub, username: payload.username });
            }
          },
        );
      }),
      (e) => e as Error,
    );
  },
};

//========= Refresh Tokens ============/

export interface RefreshTokenConfig {
  sessionId: string;
}

export const RefreshToken = {
  create: function (config: RefreshTokenConfig): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
      new Promise<string>((resolve, reject) => {
        jwtlib.sign(
          {}, // no-custom payload, jti is provided in options
          Bun.env.JWT_SECRET_REFRESH,
          {
            algorithm: "HS256",
            jwtid: config.sessionId,
            expiresIn: Bun.env.JWT_REFRESH_TOKEN_EXPIRY,
          },
          (err, token) => {
            if (err || !token) reject(err ?? new Error("token not generated"));
            else resolve(token);
          },
        );
      }),
      (e) => e as Error,
    );
  },

  verify: function (token: string): ResultAsync<RefreshTokenConfig, Error> {
    return ResultAsync.fromPromise(
      new Promise<RefreshTokenConfig>((resolve, reject) => {
        jwtlib.verify(
          token,
          Bun.env.JWT_SECRET_REFRESH,
          {
            algorithms: ["HS256"],
          },
          (err, decoded) => {
            if (err || decoded === undefined) reject(err ?? new Error("verification failed"));
            else {
              const payload = decoded as jwtlib.JwtPayload;
              if (!payload.jti) return reject(new Error("invalid jwt payload"));
              resolve({ sessionId: payload.jti });
            }
          },
        );
      }),
      (e) => e as Error,
    );
  },
};
