import type { ResultAsync } from "neverthrow";
import type { HomePostEntity, HomePostUpdateDto, UserEntity } from "./service";
import type { Maybe } from "purify-ts";
import type { PageArgs, Page } from "../../lib/pagination";
export interface IUserInsertArgs {
  username: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

export enum UserRepositoryErrorCode {
  UniqueViolation = 'UniqueViolationError',
  ForeignKeyViolation = 'ForeignKeyViolationError',
  Unknown = 'UnknownError',
}

export interface IUserRepositoryError extends Error {
  code: UserRepositoryErrorCode;
}


export interface IUserRepository {
  insert(user: IUserInsertArgs): ResultAsync<UserEntity, IUserRepositoryError>;
  selectByUsername(username: string): ResultAsync<Maybe<UserEntity>, IUserRepositoryError>;
  selectAll(page: PageArgs): ResultAsync<Page<UserEntity>, IUserRepositoryError>;
  selectById(userId: string): ResultAsync<Maybe<UserEntity>, IUserRepositoryError>;
  selectHomePost(userId: string): ResultAsync<Maybe<HomePostEntity>, IUserRepositoryError>;
  upsertHomePost(userId: string, dto: HomePostUpdateDto): ResultAsync<void, IUserRepositoryError>;
}
