import type { ResultAsync } from "neverthrow";
import type { DeletePostDto, MinimalPostDto, PostEntity, PostWithSpaceInfoDto, UpdatePostDto } from "./service";
import type { PageArgs, Page } from "../../lib/pagination";



export type PostRepositoryErrorCode =
  | 'UniqueViolationError'
  | 'ForeignKeyViolationError'
  | 'NotFoundError'
  | 'UnavailableError'
  | 'UnknownError';

export class PostRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: PostRepositoryErrorCode,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'PostRepositoryError';
  }
}

export interface IPostInsertArgs {
  spaceId: string;
  title: string;
  content: string;
}



export interface IPostRepository {
  insert(args: IPostInsertArgs): ResultAsync<MinimalPostDto, PostRepositoryError>;
  selectAll(spaceId: string, page: PageArgs): ResultAsync<Page<MinimalPostDto>, PostRepositoryError>;
  selectById(id: string): ResultAsync<PostWithSpaceInfoDto, PostRepositoryError>;
  updateById(id: string, dto: UpdatePostDto): ResultAsync<MinimalPostDto, PostRepositoryError>;
  deleteById(dto: DeletePostDto): ResultAsync<void, PostRepositoryError>;
}
