import { beforeAll, describe, expect, it } from "bun:test";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { Maybe } from "purify-ts";

type SessionEntity = {
  sessionId: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
};

type LoggedInResult = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

class InMemorySessionRepository {
  private sessions = new Map<string, SessionEntity>();
  private locks = new Map<string, Promise<void>>();
  private createdCountByUser = new Map<string, number>();

  private async withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(userId) ?? Promise.resolve();
    let release: (() => void) | undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(userId, previous.then(() => current));
    await previous;
    try {
      return await fn();
    } finally {
      release?.();
      if (this.locks.get(userId) === current) this.locks.delete(userId);
    }
  }

  insert(session: {
    sessionId?: string;
    userId: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
    createdAt?: Date;
  }) {
    const createdAt = session.createdAt ?? new Date();
    const sessionId = session.sessionId ?? crypto.randomUUID();
    const entity: SessionEntity = { ...session, sessionId, createdAt };
    this.sessions.set(entity.sessionId, entity);
    this.createdCountByUser.set(entity.userId, (this.createdCountByUser.get(entity.userId) ?? 0) + 1);
    return okAsync(entity);
  }

  findActiveOrInsert(
    userId: string,
    now: Date,
    session: {
      sessionId?: string;
      userId: string;
      userAgent: string | null;
      ipAddress: string | null;
      expiresAt: Date;
      createdAt?: Date;
    },
  ) {
    return ResultAsync.fromPromise(
      this.withUserLock(userId, async () => {
        const existing = [...this.sessions.values()]
          .filter((candidate) => candidate.userId === userId && candidate.expiresAt > now)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

        if (existing) return existing;

        const created = {
          sessionId: session.sessionId ?? crypto.randomUUID(),
          userId: session.userId,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt ?? new Date(),
        };
        this.sessions.set(created.sessionId, created);
        this.createdCountByUser.set(created.userId, (this.createdCountByUser.get(created.userId) ?? 0) + 1);
        return created;
      }),
      (error) => error as Error,
    );
  }

  findById(sessionId: string) {
    return okAsync(this.sessions.get(sessionId) ?? null);
  }

  tryDeleteById(sessionId: string) {
    const existing = this.sessions.get(sessionId) ?? null;
    if (existing) this.sessions.delete(sessionId);
    return okAsync(existing);
  }

  deleteAndInsert(oldSessionId: string, newSession: {
    sessionId?: string;
    userId: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
    createdAt?: Date;
  }) {
    const oldSession = this.sessions.get(oldSessionId);
    if (!oldSession) return errAsync(new Error("NotFoundError"));
    this.sessions.delete(oldSessionId);
    return this.insert(newSession);
  }

  createdCountForUser(userId: string) {
    return this.createdCountByUser.get(userId) ?? 0;
  }
}

const userFixture = {
  id: "da64875a-c5bb-4f6d-9dfd-f81b8b5ca2f8",
  username: "alice",
  email: "alice@example.com",
  name: "Alice",
  passwordHash: "hashed:password",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

async function expectOk<T, E>(resultAsync: ResultAsync<T, E>): Promise<T> {
  const result = await resultAsync;
  if (result.isErr()) throw result.error;
  return result.value;
}

let UserServiceClass: any;
let SessionServiceClass: any;
let TokenType: any;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://local/test";
  process.env.JWT_SECRET_ACCESS = "access-secret";
  process.env.JWT_SECRET_REFRESH = "refresh-secret";
  process.env.JWT_ACCESS_TOKEN_EXPIRY = "900000";
  process.env.JWT_REFRESH_TOKEN_EXPIRY = "20";

  ({ UserService: UserServiceClass } = await import("./service"));
  ({ SessionService: SessionServiceClass } = await import("../auth/session/service"));
  ({ TokenType } = await import("../auth/token/service"));
});

function createHarness() {
  const sessionRepository = new InMemorySessionRepository();
  const tokenService = {
    create: (config: { type: string; sessionId?: string; userId?: string; username?: string }) => {
      if (config.type === TokenType.Refresh) return okAsync(`refresh:${config.sessionId}`);
      return okAsync(`access:${config.userId}:${config.username}`);
    },
    verify: (type: string, token: string) => {
      if (type === TokenType.Refresh && token.startsWith("refresh:")) {
        return okAsync({ type: TokenType.Refresh, sessionId: token.slice("refresh:".length) });
      }
      return errAsync(new Error("invalid token"));
    },
  };
  const passwordHasher = {
    hash: async (password: string) => `hashed:${password}`,
    verify: async (password: string, hash: string) => hash === `hashed:${password}`,
  };
  const userRepo = {
    insert: () => errAsync(new Error("not used")),
    selectByUsername: (username: string) => okAsync(username === userFixture.username ? Maybe.of(userFixture) : Maybe.empty()),
    selectAll: () => okAsync([]),
    selectById: (userId: string) => okAsync(userId === userFixture.id ? Maybe.of(userFixture) : Maybe.empty()),
  };
  const sessionService = new SessionServiceClass(sessionRepository as any, tokenService as any);
  const userService = new UserServiceClass(
    sessionService,
    userRepo as any,
    passwordHasher as any,
    tokenService as any,
  );

  return { userService, sessionRepository };
}

describe("UserService.login session reuse", () => {
  it("reuses active session on repeated login without cookie", async () => {
    const { userService, sessionRepository } = createHarness();

    const first = await expectOk<LoggedInResult, unknown>(userService.login({ username: "alice", password: "password" }));
    const second = await expectOk<LoggedInResult, unknown>(userService.login({ username: "alice", password: "password" }));

    expect(first.tokens.refreshToken).toBe(second.tokens.refreshToken);
    expect(sessionRepository.createdCountForUser(userFixture.id)).toBe(1);
  });

  it("does not reuse expired session", async () => {
    const { userService, sessionRepository } = createHarness();

    const first = await expectOk<LoggedInResult, unknown>(userService.login({ username: "alice", password: "password" }));
    await Bun.sleep(35);
    const second = await expectOk<LoggedInResult, unknown>(userService.login({ username: "alice", password: "password" }));

    expect(first.tokens.refreshToken).not.toBe(second.tokens.refreshToken);
    expect(sessionRepository.createdCountForUser(userFixture.id)).toBe(2);
  });

  it("logout allows subsequent login to create a new session", async () => {
    const { userService, sessionRepository } = createHarness();

    const first = await expectOk<LoggedInResult, unknown>(userService.login({ username: "alice", password: "password" }));
    await expectOk(userService.logout(first.tokens.refreshToken));
    const second = await expectOk<LoggedInResult, unknown>(userService.login({ username: "alice", password: "password" }));

    expect(first.tokens.refreshToken).not.toBe(second.tokens.refreshToken);
    expect(sessionRepository.createdCountForUser(userFixture.id)).toBe(2);
  });

  it("concurrent repeated login resolves to one active session", async () => {
    const { userService, sessionRepository } = createHarness();

    const loginResults = await Promise.all(
      Array.from({ length: 8 }).map(() =>
        expectOk<LoggedInResult, unknown>(userService.login({ username: "alice", password: "password" })),
      ),
    );
    const refreshTokens = new Set(loginResults.map((result) => result.tokens.refreshToken));

    expect(refreshTokens.size).toBe(1);
    expect(sessionRepository.createdCountForUser(userFixture.id)).toBe(1);
  });
});
