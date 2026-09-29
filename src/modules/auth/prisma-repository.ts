import { prisma } from "../../lib/prisma";
import type { SessionRepositoryErrorCode, ISessionInsertArgs, ISessionRepository, ISessionRepositoryError } from "./session/repository-interface";
import type { SessionEntity } from "./session/service";
import { Maybe } from "purify-ts";
import { handleKnownRequestError, handleKnownRequestErrorRes } from "../../lib/prisma-utils";
import { errAsync, okAsync, ResultAsync } from "neverthrow";


class SessionRepositoryError extends Error implements ISessionRepositoryError  {
  constructor(readonly code: SessionRepositoryErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "SessionRepositoryError";
    this.cause = cause;
  }
}

class _PrismaSessionRepository implements ISessionRepository {
  insert(session: ISessionInsertArgs): ResultAsync<SessionEntity, ISessionRepositoryError> {
    return handleKnownRequestErrorRes(['P2003'], () => prisma.session.create({
      data: {
        sessionId: Maybe.fromNullable(session.sessionId).orDefaultLazy(() => crypto.randomUUID()),
        userId: session.userId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    })).orElse((errInfo) => {
      switch (errInfo.status) {
        case 'caught-known':
          return errAsync(new SessionRepositoryError('ReferenceError', 'user reference error', errInfo.error));
        default:
          return errAsync(new SessionRepositoryError('UnknownError', 'failed to insert session: uncaught error'));
      }
    });
  }

  findActiveOrInsert(
    userId: string,
    now: Date,
    session: ISessionInsertArgs,
  ): ResultAsync<SessionEntity, ISessionRepositoryError> {
    return handleKnownRequestErrorRes(['P2003'], () => prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;
      const activeSession = await tx.session.findFirst({
        where: {
          userId,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (activeSession) return activeSession;
      return tx.session.create({
        data: {
          sessionId: Maybe.fromNullable(session.sessionId).orDefaultLazy(() => crypto.randomUUID()),
          userId: session.userId,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
      });
    })).orElse((errInfo) => {
      switch (errInfo.status) {
        case 'caught-known':
          return errAsync(new SessionRepositoryError('ReferenceError', 'user reference error', errInfo.error));
        default:
          return errAsync(new SessionRepositoryError('UnknownError', 'failed to find active or insert session: uncaught error', errInfo.error));
      }
    });
  }

  findById(sessionId: string): ResultAsync<SessionEntity | null, ISessionRepositoryError> {
    return ResultAsync.fromPromise(prisma.session.findUnique({
      where: {sessionId}
    }), (error) => new SessionRepositoryError('UnknownError', 'failed to find session: uncaught error', error))
  }

  tryDeleteById(sessionId: string): ResultAsync<SessionEntity | null, ISessionRepositoryError> {
    return handleKnownRequestErrorRes("P2025", () =>
      prisma.session.delete({
        where: { sessionId },
      })).orElse((errInfo) => {
        if (errInfo.status === 'caught-known') return okAsync(null);
        return errAsync(new SessionRepositoryError('UnknownError', "failed to delete session: uncaught error", errInfo.error));
      })
  }

  deleteAndInsert(oldSessionId: string, newSession: ISessionInsertArgs): ResultAsync<SessionEntity, ISessionRepositoryError> {
    // 2025 -> Session not found
    // 2003 -> user not found
    return handleKnownRequestErrorRes(['P2025', 'P2003'], () => prisma.$transaction(async (tx) => {
      const deleted = await tx.session.delete({ where: { sessionId: oldSessionId } });
      const inserted = await tx.session.create({
        data: {
          sessionId: Maybe.fromNullable(newSession.sessionId).orDefaultLazy(() => crypto.randomUUID()),
          userId: newSession.userId,
          userAgent: newSession.userAgent,
          ipAddress: newSession.ipAddress,
          expiresAt: newSession.expiresAt,
          createdAt: newSession.createdAt,
        },
      });
      return inserted;
    })).mapErr((errInfo) => {
      if (errInfo.status === 'caught-known') {
        return errInfo.error.code === 'P2025' ?
          new SessionRepositoryError('NotFoundError', 'Session not found') :
          new SessionRepositoryError('ReferenceError', 'given userId does not reference to an existing user');
      }
      return new SessionRepositoryError('UnknownError', 'Unknown error', errInfo.error);
    })
  }
}

// Singleton instance
export const PrismaSessionRepository = new _PrismaSessionRepository();
