import ms from "ms";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { Maybe } from "purify-ts";
import { SessionError } from "./errors";
import type { ISessionRepository } from "./repository-interface";
import { RefreshToken } from "../../../lib/jwt";
import { TokenType, type ITokenService } from "../token/service";

/**
 * Describes a session of user.
 */
export type SessionEntity = {
  sessionId: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
};

export interface ISessionService {
  /**
   * Creates a new session for the given user.
   *
   */
  create(
    userId: string,
    options: {
      /**
       * The time in milliseconds the session should expire in.
       * e.g. 3600000 (1 hour).
       * 'ms' can be used to convert human-readable time strings to milliseconds.
       * e.g. `ms("1h") === 3600000`
       */
      expiresIn: number;
      userAgent?: string;
      ipAddress?: string;
    },
  ): ResultAsync<SessionEntity, SessionError>;

  /**
   * Finds a session by its ID.
   *
   * @param sessionId The ID of the session to find.
   * @returns The session, if found, wrapped in a `Maybe`; otherwise, `Nothing`.
   */
  find(sessionId: string): ResultAsync<Maybe<SessionEntity>, SessionError>;

  /**
   * Revokes a session by its ID.
   * The session will no longer be valid.
   *
   * @param sessionId The ID of the session to revoke.
   */
  revoke(sessionId: string): ResultAsync<void, SessionError>;

  /**
   * Decodes a session from a refresh token.
   * It verifies the token and finds the corresponding session.
   * Possible errors include, but are not limited to:
   * - `INVALID_TOKEN`: The token is not valid or could not be decoded.
   * - `SESSION_NOT_FOUND`: The session corresponding to the token could not be found.
   * - `STORAGE_FAILURE`: An error occurred while accessing the session store.
   *
   * @param refreshToken The refresh token to decode.
   * @returns The decoded session, wrapped in a `ResultAsync`.
   */
  decodeSession(refreshToken: string) : ResultAsync<SessionEntity, SessionError>;
}

//================= The session service implementation ==========/

/**
 * Boundary between "promises that may throw" and typed errors:
 * any rejection becomes STORAGE_FAILURE, keeping the original error as `cause`.
 */
const fromRepo = <T>(promise: Promise<T>) =>
  ResultAsync.fromPromise(promise, (cause) => SessionError.create("STORAGE_FAILURE", { cause }));

export class SessionService implements ISessionService {
  constructor(private repository: ISessionRepository, private tokenService: ITokenService) { }

  create(
    userId: string,
    options: {
      expiresIn: number;
      userAgent?: string;
      ipAddress?: string;
    },
  ): ResultAsync<SessionEntity, SessionError> {
    const expiresAt = new Date(Date.now() + options.expiresIn);
    const result = fromRepo(
      this.repository.insert({
        userId,
        expiresAt,
        userAgent: options.userAgent ?? null,
        ipAddress: options.ipAddress ?? null,
      }),
    );
    return result;
  }

  find(sessionId: string): ResultAsync<Maybe<SessionEntity>, SessionError> {
    return fromRepo(this.repository.findById(sessionId)).map((entity) => Maybe.fromNullable(entity));
  }

  revoke(sessionId: string): ResultAsync<void, SessionError> {
    return fromRepo(this.repository.tryDeleteById(sessionId)).andThen((entity) =>
      entity
        ? okAsync(undefined)
        : errAsync(SessionError.create("NOT_FOUND")),
    );
  }

  decodeSession(refreshToken: string): ResultAsync<SessionEntity, SessionError> {
    return this.tokenService.verify(TokenType.REFRESH, refreshToken)
      .mapErr((e) => SessionError.create('INVALID_TOKEN', { cause: e }))
      .andThen((payload) => fromRepo(this.repository.findById(payload.sessionId)))
      .andThen((session) => session
        ? okAsync(session)
        : errAsync(SessionError.create('NOT_FOUND')));
  }
}
