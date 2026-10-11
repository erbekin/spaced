import type { ResultAsync } from "neverthrow";
import type { SpaceEntity, SpaceEntityExtented, SpaceHomePostEntity, SpaceHomePostSetDto } from "./service";
import type { PageArgs, Page } from "../../lib/pagination";

export interface ISpaceInsertArgs {
  name: string;
  slug: string;
  ownerId: string;
}
export interface ISpaceUpdateArgs {
  name?: string;
  slug?: string;
  homePostId?: string | null;
}

export type SpaceRepositoryErrorCode =
  | 'UniqueViolationError'
  | 'ForeignKeyViolationError'
  | 'NotFoundError'
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
  selectAll(ownerFilter: { mode: 'ownerId' | 'username', value: string }, page: PageArgs): ResultAsync<Page<SpaceEntity>, SpaceRepositoryError>;
  /** Returns NotFoundError if not found */
  selectOne(spaceSlug: string, ownerId: string): ResultAsync<SpaceEntityExtented, SpaceRepositoryError>;
  update(ownerId: string, spaceSlug: string, args: ISpaceUpdateArgs): ResultAsync<SpaceEntity, SpaceRepositoryError>;
  delete(ownerId: string, spaceSlug: string): ResultAsync<void, SpaceRepositoryError>;
  upsertHomePost(dto: SpaceHomePostSetDto): ResultAsync<SpaceHomePostEntity, SpaceRepositoryError>;
  selectHomePost(spaceId: string): ResultAsync<SpaceHomePostEntity | null, SpaceRepositoryError>;
  checkById(userId: string, spaceId: string): ResultAsync<boolean, SpaceRepositoryError>;
  countById(spaceId: string): ResultAsync<number, SpaceRepositoryError>;
}
