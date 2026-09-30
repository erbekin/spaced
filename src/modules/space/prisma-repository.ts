import type { ResultAsync } from "neverthrow";
import {
  SpaceRepositoryError,
  type ISpaceInsertArgs,
  type ISpaceRepository,
  type ISpaceUpdateArgs,
} from "./repository-interface";
import type { Page, PageArgs, SpaceEntity, SpaceEntityWithOwner } from "./service";
import { prisma } from "../../lib/prisma";
import { handleKnownRequestErrorRes, type CaughtInfo } from "../../lib/prisma-utils";
import { Maybe } from "purify-ts";

const PRISMA_CODES = ["P2002", "P2003"];
const UNAVAILABLE_CODES = new Set(["P1001", "P1002", "P1008", "P2024"]);

function toRepositoryError(errInfo: CaughtInfo): SpaceRepositoryError {
  switch (errInfo.status) {
    case "caught-known": {
      if (errInfo.error.code === "P2002")
        return new SpaceRepositoryError(
          "Unique constraint violated",
          "UniqueViolationError",
          errInfo.error,
        );
      if (errInfo.error.code === "P2003")
        return new SpaceRepositoryError(
          "Foreign key violated",
          "ForeignKeyViolationError",
          errInfo.error,
        );
      if (errInfo.error.code === "P2025")
        return new SpaceRepositoryError("Not found", "NotFoundError", errInfo.error);

      if (UNAVAILABLE_CODES.has(errInfo.error.code))
        return new SpaceRepositoryError("Database unavailable", "UnavailableError", errInfo.error);
      return new SpaceRepositoryError("Unknown repository error", "UnknownError", errInfo.error);
    }
    case "uncaught-known":
    case "uncaught-unknown":
      return new SpaceRepositoryError("Unknown repository error", "UnknownError", errInfo.error);
  }
}

export class PrismaSpaceRepository implements ISpaceRepository {
  private constructor() {}
  private static instance: PrismaSpaceRepository | undefined;
  static getInstance(): PrismaSpaceRepository {
    if (!PrismaSpaceRepository.instance) {
      PrismaSpaceRepository.instance = new PrismaSpaceRepository();
    }
    return PrismaSpaceRepository.instance;
  }
  insert(args: ISpaceInsertArgs): ResultAsync<SpaceEntity, SpaceRepositoryError> {
    return handleKnownRequestErrorRes(PRISMA_CODES, () => {
      return prisma.space.create({
        data: {
          name: args.name,
          slug: args.slug,
          owner: {
            connect: { id: args.ownerId },
          },
        },
      });
    }).mapErr(toRepositoryError);
  }
  selectAll(
    ownerFilter: {
      mode: "ownerId" | "username";
      value: string;
    },
    page: PageArgs,
  ): ResultAsync<Page<SpaceEntity>, SpaceRepositoryError> {
    return handleKnownRequestErrorRes(["P2003"], () => {
      const owner = Maybe.fromNullable(ownerFilter?.mode)
        .map((mode) => {
          return mode === "ownerId" ? { id: ownerFilter?.value } : { username: ownerFilter?.value };
        })
        .extract();
      return prisma.space.findMany({
        where: { owner },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
      });
    })
      .map((spaces) => {
        const hasMore = spaces.length > page.limit;
        const items = hasMore ? spaces.slice(0, page.limit) : spaces;
        return { items, nextCursor: hasMore ? spaces[page.limit - 1]!.id : null };
      })
      .mapErr(toRepositoryError);
  }
  selectOne(
    spaceSlug: string,
    ownerId: string,
  ): ResultAsync<SpaceEntityWithOwner, SpaceRepositoryError> {
    return handleKnownRequestErrorRes("P2025", () => {
      return prisma.space.findUniqueOrThrow({
        where: {
          slug_ownerId: {
            slug: spaceSlug,
            ownerId,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          homePostId: true,
          createdAt: true,
          updatedAt: true,
          ownerId: true,
          owner: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      });
    }).mapErr(toRepositoryError);
  }
  update(
    ownerId: string,
    spaceSlug: string,
    args: ISpaceUpdateArgs,
  ): ResultAsync<SpaceEntity, SpaceRepositoryError> {
    return handleKnownRequestErrorRes(["P2002", "P2025"], () => {
      return prisma.space.update({
        where: {
          slug_ownerId: {
            slug: spaceSlug,
            ownerId,
          },
        },
        data: {
          ...args,
        },
      });
    }).mapErr(toRepositoryError);
  }
  delete(ownerId: string, spaceSlug: string): ResultAsync<void, SpaceRepositoryError> {
    return handleKnownRequestErrorRes("P2025", () => {
      return prisma.space.delete({
        where: {
          slug_ownerId: {
            slug: spaceSlug,
            ownerId,
          },
        },
      });
    })
      .mapErr(toRepositoryError)
      .map(() => undefined);
  }
}
