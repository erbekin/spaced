import { ResultAsync } from "neverthrow";
import { prisma } from "../../lib/prisma";
import { handleKnownRequestErrorRes } from "../../lib/prisma-utils";
import type { IUserInsertArgs, IUserRepository, IUserRepositoryError } from "./repository-interface";
import { UserRepositoryErrorCode } from "./repository-interface";

import type { HomePostEntity, HomePostUpdateDto, UserEntity } from "./service";
import { Maybe } from "purify-ts";
import type { Page, PageArgs } from "../../lib/pagination";

class UserRepositoryError extends Error implements IUserRepositoryError {
  constructor(
    readonly code: UserRepositoryErrorCode,
    override message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
  }
}

export class PrismaUserRepository implements IUserRepository {
  private constructor() { }
  private static instance: PrismaUserRepository | undefined;
  static getInstance(): PrismaUserRepository {
    if (!PrismaUserRepository.instance) {
      PrismaUserRepository.instance = new PrismaUserRepository();
    }
    return PrismaUserRepository.instance;
  }

  insert(user: IUserInsertArgs): ResultAsync<UserEntity, IUserRepositoryError> {
    return handleKnownRequestErrorRes(
      "P2002",
      () => {
        return prisma.user.create({
          data: {
            username: user.username,
            email: user.email,
            name: user.name,
            passwordHash: user.passwordHash,
          },
        });
      },
    ).mapErr((errInfo) => {
      if (errInfo.status === 'caught-known') return new UserRepositoryError(UserRepositoryErrorCode.UniqueViolation, 'email or username violates uniqe constraint');
      return new UserRepositoryError(UserRepositoryErrorCode.Unknown, 'unknown error', errInfo.error);
    });
  }

  selectByUsername(username: string): ResultAsync<Maybe<UserEntity>, IUserRepositoryError> {
    return ResultAsync.fromPromise(
      prisma.user.findUnique({
        where: { username },
      }),
      (e) => new UserRepositoryError(UserRepositoryErrorCode.Unknown, "other error", e),
    ).map(Maybe.fromNullable);
  }
  selectAll(page: PageArgs): ResultAsync<Page<UserEntity>, IUserRepositoryError> {
    return ResultAsync.fromPromise(
      prisma.user.findMany({
        take: page.limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(page.cursor && {cursor: {id: page.cursor}, skip: 1})
      }),
      (e) => new UserRepositoryError(UserRepositoryErrorCode.Unknown, "other error", e),
    ).map((users) => {
      const hasMore = users.length > page.limit;
      const items = hasMore ? users.slice(0, page.limit) : users;
      return {items, nextCursor: hasMore ? items[items.length - 1]!.id : null}
    });
  }
  selectById(userId: string): ResultAsync<Maybe<UserEntity>, IUserRepositoryError> {
    return ResultAsync.fromPromise(
      prisma.user.findUnique({
        where: { id: userId },
      }),
      (e) => new UserRepositoryError(UserRepositoryErrorCode.Unknown, "other error", e),
    ).map(Maybe.fromNullable);
  }
  selectHomePost(userId: string): ResultAsync<Maybe<HomePostEntity>, IUserRepositoryError> {
    return ResultAsync.fromPromise(
      prisma.homePost.findUnique({
        where: { userId },
      }),
      (e) => new UserRepositoryError(UserRepositoryErrorCode.Unknown, "other error", e),
    ).map(Maybe.fromNullable);
  }
  upsertHomePost(userId: string, dto: HomePostUpdateDto): ResultAsync<void, IUserRepositoryError> {
    return handleKnownRequestErrorRes('2003', () => prisma.homePost.upsert({
      create: { userId, ...dto },
      update: dto,
      where: { userId },
    })).mapErr((errInfo) => {
      switch (errInfo.status) {
        case 'caught-known':
          return new UserRepositoryError(UserRepositoryErrorCode.ForeignKeyViolation, "foreign key violated: user_id invalid", errInfo.error);
        default:
          return new UserRepositoryError(UserRepositoryErrorCode.Unknown, "other error", errInfo.error);
      }
    }).map(() => undefined)
  }
}
