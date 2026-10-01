import { errAsync, type ResultAsync } from "neverthrow";
import { PostError } from "./errors";
import type { Page, PageArgs } from "../../lib/pagination";
import type { IPostRepository } from "./repository-interface";
import type { ISpaceService } from "../space/service";
import z from "zod";

export type PostEntity = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  content: string;
  spaceId: string;
};

export type CreatePostDto = {
  username: string;
  spaceSlug: string;
  title: string;
  content: string;
};

export type MinimalPostDto = {
  id: string;
  title: string;
  spaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PostWithSpaceInfoDto = {
  id: string;
  title: string;
  spaceId: string;
  createdAt: Date;
  updatedAt: Date;
  space: {
    id: string;
    slug: string;
    owner: {
      id: string;
      name: string | null;
      username: string;
    };
  };
};

export type UpdatePostDto = {
  userId: string;
  postId: string;
  title?: string;
  content?: string;
};
export type DeletePostDto = {
  userId: string;
  postId: string;
};


export interface IPostService {
  create(dto: CreatePostDto): ResultAsync<MinimalPostDto, PostError>;
  list(
    username: string,
    spaceSlug: string,
    page: PageArgs,
  ): ResultAsync<Page<MinimalPostDto>, PostError>;
  getById(id: string): ResultAsync<PostWithSpaceInfoDto, PostError>;
  update(dto: UpdatePostDto): ResultAsync<MinimalPostDto, PostError>;
  delete(dto: DeletePostDto): ResultAsync<void, PostError>;
}

// ========= Service Implementation =========/

export class PostService implements IPostService {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly spaceService: ISpaceService,
  ) {}

  create(dto: CreatePostDto): ResultAsync<MinimalPostDto, PostError> {
    return this.spaceService
      .get(dto.username, dto.spaceSlug)
      .mapErr((error) => {
        return PostError.create("SERVICE_FAILURE", { cause: error });
      })
      .andThen((space) => {
        return this.postRepository
          .insert({
            title: dto.title,
            content: dto.content,
            spaceId: space.id,
          })
          .mapErr((error) => {
            switch (error.code) {
              case "ForeignKeyViolationError":
                return PostError.create("SPACE_NOT_FOUND", {
                  payload: { spaceSlug: dto.spaceSlug },
                  cause: error,
                });
              default:
                return PostError.create("SERVICE_FAILURE", { cause: error });
            }
          });
      });
  }

  list(
    username: string,
    spaceSlug: string,
    page: PageArgs,
  ): ResultAsync<Page<MinimalPostDto>, PostError> {
    return this.spaceService
      .get(username, spaceSlug)
      .mapErr((error) => {
        return PostError.create("SERVICE_FAILURE", { cause: error });
      })
      .andThen((space) =>
        this.postRepository
          .selectAll(space.id, page)
          .mapErr((error) => PostError.create("REPOSITORY_FAILURE", { cause: error })),
      );
  }

  getById(id: string): ResultAsync<PostWithSpaceInfoDto, PostError> {
    const parsed = z.uuidv4().safeParse(id);
    if (!parsed.success) {
      return errAsync(PostError.create("POST_NOT_FOUND", { payload: { postId: id } }));
    }
    return this.postRepository
      .selectById(id)
      .mapErr((error) => {
        if (error.code === 'NotFoundError') {
          return PostError.create("POST_NOT_FOUND", { payload: { postId: id } });
        }
        return PostError.create("REPOSITORY_FAILURE", { cause: error });
      });
  }

  update(dto: UpdatePostDto): ResultAsync<MinimalPostDto, PostError> {
    return this.getById(dto.postId)
      .andThen((post) => {
        if (post.space.owner.id !== dto.userId) {
          return errAsync(PostError.create("FORBIDDEN", { message: "You are not the owner of this space" }));
        }
        return this.postRepository
          .updateById(dto.postId, dto)
          .mapErr((error) => {
            if (error.code === 'NotFoundError') {
              return PostError.create("POST_NOT_FOUND", { payload: { postId: dto.postId } });
            }
            return PostError.create("REPOSITORY_FAILURE", { cause: error });
          });
      });
  }

  delete(dto: DeletePostDto): ResultAsync<void, PostError> {
    return this.getById(dto.postId)
      .andThen((post) => {
        if (post.space.owner.id !== dto.userId) {
          return errAsync(PostError.create("FORBIDDEN", { message: "You are not the owner of this space" }));
        }
        return this.postRepository
          .deleteById(dto)
          .mapErr((error) => {
            if (error.code === 'NotFoundError') {
              return PostError.create("POST_NOT_FOUND", { payload: { postId: dto.postId } });
            }
            return PostError.create("REPOSITORY_FAILURE", { cause: error });
          });
      });
  }
}
