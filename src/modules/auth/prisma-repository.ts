import { prisma } from "../../lib/prisma";
import { type ISessionInsertArgs, type ISessionRepository } from "./session/repository-interface";
import type { SessionEntity } from "./session/service";
import { Maybe } from "purify-ts";
import { handleKnownRequestError } from "../../lib/prisma-utils";


class _PrismaSessionRepository implements ISessionRepository {
  async insert(session: ISessionInsertArgs): Promise<SessionEntity> {
    const result = await prisma.session.create({
      data: {
        sessionId: Maybe.fromNullable(session.id).orDefaultLazy(() => crypto.randomUUID()),
        userId: session.userId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    });
    return result;
  }

  async findById(sessionId: string): Promise<SessionEntity | null> {
    const result = await prisma.session.findUnique({
      where: { sessionId },
    });
    return result;
  }

  async tryDeleteById(sessionId: string): Promise<SessionEntity | null> {
    return await handleKnownRequestError("P2025", () =>
      prisma.session.delete({
        where: { sessionId },
      }),
    );
  }
}

// Singleton instance
export const PrismaSessionRepository = new _PrismaSessionRepository();
