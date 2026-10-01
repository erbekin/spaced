
import type { IPostRepository } from "./repository-interface";
import type { ResultAsync } from "neverthrow";
import type { DeletePostDto, MinimalPostDto, PostEntity, PostWithSpaceInfoDto, UpdatePostDto } from "./service";
import type { IPostInsertArgs } from "./repository-interface";
import { PostRepositoryError } from "./repository-interface";
import { handleKnownRequestErrorRes, type CaughtInfo } from "../../lib/prisma-utils";
import { prisma } from "../../lib/prisma";
import type { PageArgs, Page } from "../../lib/pagination";

const UNAVAILABLE_CODES = new Set(["P1001", "P1002", "P1008", "P2024"]);


function toRepositoryError(errInfo: CaughtInfo): PostRepositoryError {
  switch (errInfo.status) {
    case "caught-known": {
      if (errInfo.error.code === "P2002")
        return new PostRepositoryError(
          "Unique constraint violated",
          "UniqueViolationError",
          errInfo.error,
        );
      if (errInfo.error.code === "P2003")
        return new PostRepositoryError(
          "Foreign key violated",
          "ForeignKeyViolationError",
          errInfo.error,
        );
      if (errInfo.error.code === "P2025")
        return new PostRepositoryError("Not found", "NotFoundError", errInfo.error);

      if (UNAVAILABLE_CODES.has(errInfo.error.code))
        return new PostRepositoryError("Database unavailable", "UnavailableError", errInfo.error);
      return new PostRepositoryError("Unknown repository error", "UnknownError", errInfo.error);
    }
    case "uncaught-known":
    case "uncaught-unknown":
      return new PostRepositoryError("Unknown repository error", "UnknownError", errInfo.error);
  }
}

type MinimalPostDtoSelect = {
  [K in keyof MinimalPostDto]: true
}
const minimalPostDtoSelect: MinimalPostDtoSelect = {
  id: true,
  title: true,
  spaceId: true,
  createdAt: true,
  updatedAt: true,
}

export class PrismaPostRepository implements IPostRepository {
  private static instance: PrismaPostRepository | undefined;

  private constructor() {

  }

  static getInstance(): PrismaPostRepository {
    if (!PrismaPostRepository.instance) {
      PrismaPostRepository.instance = new PrismaPostRepository();
    }
    return PrismaPostRepository.instance;
  }

  selectAll(spaceId: string, page: PageArgs): ResultAsync<Page<MinimalPostDto>, PostRepositoryError> {
    return handleKnownRequestErrorRes([], () => prisma.post.findMany({
      where: { spaceId },
      orderBy: [{createdAt: 'desc'}, {id: 'desc'}],
      take: page.limit + 1,
      select: minimalPostDtoSelect,
      ...(page.cursor && {cursor: {id: page.cursor}, skip : 1})
    })).mapErr(toRepositoryError)
      .map((posts) => {
        const hasMore = posts.length > page.limit;
        const items = hasMore ? posts.slice(0, page.limit) : posts;
        return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
      });
  }
  insert(args: IPostInsertArgs): ResultAsync<MinimalPostDto, PostRepositoryError> {
    return handleKnownRequestErrorRes('P2003', () => prisma.post.create({
      data: {
        content: args.content,
        title: args.title,
        spaceId: args.spaceId,
      },
      select: minimalPostDtoSelect,
    })).mapErr(toRepositoryError)
  }
  selectById(id: string): ResultAsync<PostWithSpaceInfoDto, PostRepositoryError> {
    return handleKnownRequestErrorRes('P2025', () => prisma.post.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        title: true,
        content: true,
        spaceId: true,
        space: {
          select: {
            id: true,
            slug: true,
            owner: {
              select: {
                id: true,
                name: true,
                username: true,
              }
            }
          }
        }
      },
    })).mapErr(toRepositoryError)
  }
  updateById(id: string, dto: UpdatePostDto): ResultAsync<MinimalPostDto, PostRepositoryError> {
    return handleKnownRequestErrorRes('P2025', () => prisma.post.update({
      where: { id, space: {ownerId: dto.userId} },
      data: {
        title: dto.title,
        content: dto.content,
      },
      select: minimalPostDtoSelect,
    })).mapErr(toRepositoryError)
  }

  deleteById(dto: DeletePostDto): ResultAsync<void, PostRepositoryError> {
    return handleKnownRequestErrorRes('P2025', () => prisma.post.delete({
      where: { id: dto.postId, space: {ownerId: dto.userId} },
    })).mapErr(toRepositoryError)
    .map(() => undefined)
  }
}
