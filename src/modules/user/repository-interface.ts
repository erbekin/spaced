import type { ResultAsync } from "neverthrow";
import type { UserEntity } from "./service";
import type { Maybe } from "purify-ts";
export interface IUserInsertArgs {
  username: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

export enum UserRepositoryErrorCode {
  UniqueViolation = 'UniqueViolationError',
  Unknown = 'UnknownError',
}

export interface IUserRepositoryError extends Error {
  code: UserRepositoryErrorCode;
}


export interface IUserRepository {
  insert(user: IUserInsertArgs): ResultAsync<UserEntity, IUserRepositoryError>;
  selectByUsername(username: string): ResultAsync<Maybe<UserEntity>, IUserRepositoryError>;
  selectAll(): ResultAsync<UserEntity[], IUserRepositoryError>;
  selectById(userId: string): ResultAsync<Maybe<UserEntity>, IUserRepositoryError>;
}
