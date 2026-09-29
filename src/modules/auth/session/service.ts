import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { Maybe } from "purify-ts";
import { SessionError } from "./errors";
import type { SessionRepositoryErrorCode, ISessionRepository } from "./repository-interface";
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

export interface ISessionCreateOptions {
  /**
   * The time in milliseconds the session should expire in.
   * e.g. 3600000 (1 hour).
   * 'ms' can be used to convert human-readable time strings to milliseconds.
   * e.g. `ms("1h") === 3600000`
   */
  expiresIn: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface ISessionService {
  /**
   * Creates a new session for the given user.
   *
   */
  create(
    userId: string,
    options: ISessionCreateOptions,
  ): ResultAsync<SessionEntity, SessionError>;

  /**
   * Returns an existing non-expired session for the user or creates a new one.
   * Implementations should avoid creating duplicate sessions on concurrent logins.
   */
  findActiveOrCreate(
    userId: string,
    options: ISessionCreateOptions,
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
   * If session is not found, 'NOT_FOUND' error is returned.
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
  decode(refreshToken: string): ResultAsync<SessionEntity, SessionError>;

  /**
   * Rotates a session by its ID.
   * First, the old session is revoked (deleted).
   * Then, immediately a new session is created.
   *
   * This operation is atomic: if the new session cannot be created, the old session is not revoked.
   *
   * @param sessionId The ID of the session to rotate.
   * @returns The rotated session, wrapped in a `ResultAsync`.
   */
  rotate(oldSession: SessionEntity, createOptions : ISessionCreateOptions): ResultAsync<SessionEntity, SessionError>;
}

//================= The session service implementation ==========/

/**
 * Boundary between "promises that may throw" and typed errors:
 * any rejection becomes STORAGE_FAILURE, keeping the original error as `cause`.
 */
const fromRepo = <T>(result: ResultAsync<T, unknown>) =>
  result.mapErr((cause) => SessionError.create("STORAGE_FAILURE", { cause }));

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
    return this.repository.insert({
        userId,
        expiresAt,
        userAgent: options.userAgent ?? null,
        ipAddress: options.ipAddress ?? null,
      }).mapErr((error) => error.code === 'ReferenceError' ? SessionError.create('USER_NOT_FOUND', { cause: error }) : SessionError.create('STORAGE_FAILURE', { cause: error }));
  }

  findActiveOrCreate(
    userId: string,
    options: ISessionCreateOptions,
  ): ResultAsync<SessionEntity, SessionError> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + options.expiresIn);
    return this.repository.findActiveOrInsert(userId, now, {
      userId,
      expiresAt,
      userAgent: options.userAgent ?? null,
      ipAddress: options.ipAddress ?? null,
    }).mapErr((error) => error.code === 'ReferenceError' ? SessionError.create('USER_NOT_FOUND', { cause: error }) : SessionError.create('STORAGE_FAILURE', { cause: error }));
  }

  find(sessionId: string): ResultAsync<Maybe<SessionEntity>, SessionError> {
    return this.repository.findById(sessionId).map((entity) => Maybe.fromNullable(entity))
      .mapErr((error) => SessionError.create('STORAGE_FAILURE', {cause: error}));
  }

  revoke(sessionId: string): ResultAsync<void, SessionError> {
    return fromRepo(this.repository.tryDeleteById(sessionId)).andThen((entity) =>
      entity
        ? okAsync(undefined)
        : errAsync(SessionError.create("NOT_FOUND")),
    );
  }

  decode(refreshToken: string): ResultAsync<SessionEntity, SessionError> {
    return this.tokenService.verify(TokenType.Refresh, refreshToken)
      .mapErr((e) => SessionError.create('SERVICE_FAILURE', { cause: e}))
      .andThen((payload) => this.repository.findById(payload.sessionId).mapErr((error) => SessionError.create('STORAGE_FAILURE', { cause: error })))
      .andThen((session) => session
        ? okAsync(session)
        : errAsync(SessionError.create('NOT_FOUND')));
  }

  rotate(oldSession: SessionEntity, createOptions: ISessionCreateOptions): ResultAsync<SessionEntity, SessionError> {
    return this.repository.deleteAndInsert(oldSession.sessionId, {
      userId: oldSession.userId,
      expiresAt: new Date(Date.now() + createOptions.expiresIn),
      userAgent: createOptions.userAgent ?? null,
      ipAddress: createOptions.ipAddress ?? null,
    }).mapErr((error) => {
      switch (error.code) {
        case 'NotFoundError':
          return SessionError.create('NOT_FOUND', { message: 'session not found' });
        case 'ReferenceError':
          return SessionError.create('USER_NOT_FOUND', { message: 'user not found' });
        default:
          return SessionError.create('STORAGE_FAILURE', { cause: error });
      }
    })
  }
}
