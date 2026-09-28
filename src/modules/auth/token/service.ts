import { ResultAsync } from "neverthrow";
import { TokenError } from "./errors";
import jwtlib from "jsonwebtoken";
import { config as appconfig} from "../../config";

export enum TokenType {
  Access = "AccessToken",
  Refresh = "RefreshToken",
}

export interface AccessTokenConfig {
  type: TokenType.Access;
  userId: string;
  username: string;
}

export interface RefreshTokenConfig {
  type: TokenType.Refresh;
  sessionId: string;
}

export type TokenConfig<T extends TokenType> = T extends TokenType.Access ? AccessTokenConfig : RefreshTokenConfig;

export interface ITokenService {
  create<T extends TokenType>(config: TokenConfig<T>): ResultAsync<string, TokenError>;
  verify<T extends TokenType>(type: T, token: string): ResultAsync<TokenConfig<T>, TokenError>;
}

// ========== Service Implementation ==========
export class TokenService implements ITokenService {
  constructor() {}

  //========= Per-interface implementation ==========
  private accessToken = {
    /** Creates new access token */
    create: function (config: AccessTokenConfig): ResultAsync<string, TokenError> {
      return ResultAsync.fromPromise(
        new Promise<string>((resolve, reject) => {
          jwtlib.sign(
            { username: config.username },
            appconfig.jwt.accessToken.secret,
            {
              algorithm: "HS256",
              expiresIn: appconfig.jwt.accessToken.expiration / 1000,
              subject: config.userId
            },
            (err, token) => {
              if (err || !token) reject(TokenError.create('OTHER', {cause: err}));
              else resolve(token);
            },
          );
        }),
        (e) => {
          if (TokenError.is(e)) return e;
          return TokenError.create('OTHER', {cause: e});
        },
      );
    },

    verify: function (token: string): ResultAsync<AccessTokenConfig, TokenError> {
      return ResultAsync.fromPromise(
        new Promise<AccessTokenConfig>((resolve, reject) => {
          jwtlib.verify(
            token,
            appconfig.jwt.accessToken.secret,
            {
              algorithms: ["HS256"],
            },
            (error, decoded) => {
              if (error === null) {
                const payload = decoded as jwtlib.JwtPayload;
                if (!payload.sub || !payload.username) return reject(TokenError.create('INVALID_TOKEN', {message: "'sub' or 'username' missing in jwt payload"}));
                resolve({ type: TokenType.Access, userId: payload.sub, username: payload.username });
              } else if (error instanceof jwtlib.TokenExpiredError) {
                return reject(TokenError.create('EXPIRED', {cause: error, message: error.message, payload: {expiredAt: error.expiredAt}}));
              } else if (error instanceof jwtlib.JsonWebTokenError) {
                return reject(TokenError.create('INVALID_TOKEN', {cause: error, message: error.message}));
              }
            },
          );
        }),
        (e) => {
          if (TokenError.is(e)) return e;
          return TokenError.create('OTHER', { cause: e });
        },
      );
    },
  };
  private refreshToken = {
    create: function (config: RefreshTokenConfig): ResultAsync<string, TokenError> {
      return ResultAsync.fromPromise(
        new Promise<string>((resolve, reject) => {
          jwtlib.sign(
            {}, // no-custom payload, jti is provided in options
            appconfig.jwt.refreshToken.secret,
            {
              algorithm: "HS256",
              jwtid: config.sessionId,
              expiresIn: appconfig.jwt.refreshToken.expiration / 1000,
            },
            (error, token) => {
              if (error || !token) reject(TokenError.create('OTHER', {cause: error}));
              else resolve(token);
            },
          );
        }),
        (e) => {
          if (TokenError.is(e)) return e;
          return TokenError.create('OTHER', { cause: e });
        },
      );
    },

    verify: function (token: string): ResultAsync<RefreshTokenConfig, TokenError> {
      return ResultAsync.fromPromise(
        new Promise<RefreshTokenConfig>((resolve, reject) => {
          jwtlib.verify(
            token,
            appconfig.jwt.refreshToken.secret,
            {
              algorithms: ["HS256"],
            },
            (error, decoded) => {
              if (error === null) {
                const payload = decoded as jwtlib.JwtPayload;
                if (!payload.jti) return reject(TokenError.create('INVALID_TOKEN', {message: "'jti' missing in jwt payload"}));
                resolve({ type: TokenType.Refresh, sessionId: payload.jti });
              } else if (error instanceof jwtlib.TokenExpiredError) {
                return reject(TokenError.create('EXPIRED', {cause: error, message: error.message, payload: {expiredAt: error.expiredAt}}));
              } else if (error instanceof jwtlib.JsonWebTokenError) {
                return reject(TokenError.create('INVALID_TOKEN', {cause: error, message: error.message}));
              }
            },
          );
        }),
        (e) => {
          if (TokenError.is(e)) return e;
          return TokenError.create('OTHER', {cause: e});
        },
      );
    },
  };

  //========= common interface implementation ==========
  create<T extends TokenType>(config: TokenConfig<T>): ResultAsync<string, TokenError> {
    switch (config.type) {
      case TokenType.Access:
        return this.accessToken.create(config);
      case TokenType.Refresh:
        return this.refreshToken.create(config);
    }
  }

  // helping type inference
  verify(type: TokenType.Access, token: string): ResultAsync<AccessTokenConfig, TokenError>;
  verify(type: TokenType.Refresh, token: string): ResultAsync<RefreshTokenConfig, TokenError>;
  verify<T extends TokenType>(type: T, token: string): ResultAsync<TokenConfig<T>, TokenError> {
    switch (type) {
      case TokenType.Access:
        return this.accessToken.verify(token) as ResultAsync<TokenConfig<T>, TokenError>;
      case TokenType.Refresh:
        return this.refreshToken.verify(token) as ResultAsync<TokenConfig<T>, TokenError>;
    }
  }

}
