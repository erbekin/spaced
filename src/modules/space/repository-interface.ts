import type { ResultAsync } from "neverthrow";
import { type SpaceEntity } from "./service";

export interface ISpaceInsertArgs {
  name: string;
  slug: string;
  ownerId: string;
}

export type SpaceRepositoryErrorCode =
  | 'UniqueViolationError'
  | 'ForeignKeyViolationError'
  | 'UnavailableError'
  | 'UnknownError';

export class SpaceRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: SpaceRepositoryErrorCode,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'SpaceRepositoryError';
  }
}

export interface ISpaceRepository {
  insert(args: ISpaceInsertArgs): ResultAsync<SpaceEntity, SpaceRepositoryError>;
  selectAll(ownerFilter?: { mode: 'ownerId' | 'username', value: string }): ResultAsync<SpaceEntity[], SpaceRepositoryError>;
}
