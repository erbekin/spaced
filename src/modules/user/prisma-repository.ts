import { ResultAsync } from "neverthrow";
import { prisma } from "../../lib/prisma";
import { handleKnownRequestErrorRes } from "../../lib/prisma-utils";
import type { IUserInsertArgs, IUserRepository, IUserRepositoryError } from "./repository-interface";
import { UserRepositoryErrorCode } from "./repository-interface";

import type { UserEntity } from "./service";
import { Maybe } from "purify-ts";

class UserRepositoryError extends Error implements IUserRepositoryError {
  constructor(
    readonly type: UserRepositoryErrorCode,
    override message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
  }
}

class _PrismaUserRepository implements IUserRepository {
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
      (e) => {
        if (e.caught)
          return new UserRepositoryError(
            UserRepositoryErrorCode.UniqueViolation,
            "unique violation",
            e.caught,
          );
        return new UserRepositoryError(UserRepositoryErrorCode.Other, "other error", e.uncaught);
      },
    );
  }

  selectByUsername(username: string): ResultAsync<Maybe<UserEntity>, IUserRepositoryError> {
    return ResultAsync.fromPromise(
      prisma.user.findUnique({
        where: { username },
      }),
      (e) => new UserRepositoryError(UserRepositoryErrorCode.Other, "other error", e),
    ).map(Maybe.fromNullable);
  }
  selectAll(): ResultAsync<UserEntity[], IUserRepositoryError> {
    return ResultAsync.fromPromise(
      prisma.user.findMany(),
      (e) => new UserRepositoryError(UserRepositoryErrorCode.Other, "other error", e),
    );
  }
  selectById(userId: string): ResultAsync<Maybe<UserEntity>, IUserRepositoryError> {
    return ResultAsync.fromPromise(
      prisma.user.findUnique({
        where: { id: userId },
      }),
      (e) => new UserRepositoryError(UserRepositoryErrorCode.Other, "other error", e),
    ).map(Maybe.fromNullable);
  }
}

export const PrismaUserRepository = new _PrismaUserRepository();
