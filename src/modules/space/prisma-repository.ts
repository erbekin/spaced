import type { ResultAsync } from "neverthrow";
import {
  SpaceRepositoryError,
  type ISpaceInsertArgs,
  type ISpaceRepository,
} from "./repository-interface";
import type { SpaceEntity } from "./service";
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
  private constructor() { }
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
  selectAll(ownerFilter?: { mode: 'ownerId' | 'username', value: string }): ResultAsync<SpaceEntity[], SpaceRepositoryError> {
    return handleKnownRequestErrorRes('P2003', () => {
      const owner = Maybe.fromNullable(ownerFilter?.mode)
        .map((mode) => {
          return mode === 'ownerId' ? { id: ownerFilter?.value } : { username: ownerFilter?.value };
        }).extract();
      return prisma.space.findMany({
        where: {
          owner,
        },
        orderBy: {
          createdAt: 'desc',
        }
      });
    }).mapErr(toRepositoryError);
  }
}
